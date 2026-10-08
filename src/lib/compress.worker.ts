/// Text-preserving compression: recompresses only the photos inside a PDF. Runs off the main thread.
///
/// Quality is chosen by the user (best / medium / low), never by a size target, so no image is ever
/// squeezed harder than the chosen level. Each image is downsampled only if it carries more detail than
/// the level needs at the size it is actually drawn on the page, and is only replaced if the new version
/// is really smaller.
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef, decodePDFRawStream } from 'pdf-lib';
import type { PDFContext } from 'pdf-lib';

export type Level = 'best' | 'medium' | 'low';

export interface KeepTextResult {
  bytes: Uint8Array;
  before: number;
  /** at least one image was recompressed and the file got smaller */
  changed: boolean;
  /** images large enough to be worth looking at */
  images: number;
  /** images that were actually replaced by a smaller version */
  shrunk: number;
}

/**
 * dpi   = most detail kept, measured at the size the image is printed on the page.
 * slack = only downsample when the image is this much sharper than `dpi` (avoids pointless resampling).
 * q     = JPEG quality.
 * side  = fallback cap on the longest edge when the on-page size could not be measured.
 */
const PRESETS: Record<Level, { dpi: number; slack: number; q: number; side: number }> = {
  best:   { dpi: 300, slack: 1.2, q: 0.92, side: 4500 },
  medium: { dpi: 170, slack: 1.2, q: 0.8,  side: 2400 },
  low:    { dpi: 110, slack: 1.15, q: 0.62, side: 1600 },
};
const MIN_IMAGE_BYTES = 10_000;
/** The new image must be at least this much smaller than the old one, or the original is kept. */
const MIN_GAIN = 0.92;

interface Cand { ref: PDFRef; stream: PDFRawStream; w: number; h: number; comps: 1 | 3; dct: boolean; size: number; smask?: PDFRef }
type Enc = { bytes: Uint8Array; w: number; h: number };

const key = (d: PDFDict, k: string) => d.lookup(PDFName.of(k));
const numOf = (d: PDFDict, k: string) => { const v = key(d, k); return v instanceof PDFNumber ? v.asNumber() : undefined; };

function findCandidates(ctx: PDFContext): Cand[] {
  const out: Cand[] = [];
  // Soft masks and stencil masks must stay DeviceGray / 1-bit. Re-encoding one as an RGB JPEG
  // breaks the transparency (images turn black or vanish), so anything used as a mask is left alone.
  const masks = new Set<PDFRef>();
  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    for (const k of ['SMask', 'Mask']) {
      const m = obj.dict.get(PDFName.of(k));
      if (m instanceof PDFRef) masks.add(m);
    }
  }
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    if (masks.has(ref)) continue;
    const d = obj.dict;
    if (String(key(d, 'Subtype')) !== '/Image') continue;
    if (d.has(PDFName.of('SMaskInData'))) continue;
    if (String(key(d, 'ImageMask')) === 'true' || d.has(PDFName.of('Mask')) || d.has(PDFName.of('Decode'))) continue;
    if (numOf(d, 'BitsPerComponent') !== 8) continue;
    const w = numOf(d, 'Width'), h = numOf(d, 'Height');
    if (!w || !h || obj.contents.length < MIN_IMAGE_BYTES) continue;

    let filter = key(d, 'Filter');
    if (filter instanceof PDFArray) filter = filter.size() === 1 ? filter.lookup(0) : undefined;
    const f = String(filter);
    if (f !== '/DCTDecode' && f !== '/FlateDecode') continue;
    // PNG/TIFF predictors are not undone by the decoder below, so those pixels would come out scrambled.
    if (f === '/FlateDecode') {
      let parms = key(d, 'DecodeParms');
      if (parms instanceof PDFArray) parms = parms.lookup(0);
      if (parms instanceof PDFDict && (numOf(parms, 'Predictor') ?? 1) > 1) continue;
    }

    const cs = key(d, 'ColorSpace');
    let comps: 1 | 3 | 0 = 0;
    if (cs instanceof PDFName) comps = String(cs) === '/DeviceRGB' ? 3 : String(cs) === '/DeviceGray' ? 1 : 0;
    else if (cs instanceof PDFArray && String(cs.lookup(0)) === '/ICCBased') {
      const prof = cs.lookup(1);
      const n = prof instanceof PDFRawStream ? numOf(prof.dict, 'N') : undefined;
      comps = n === 3 ? 3 : n === 1 ? 1 : 0;
    }
    if (!comps) continue;

    const sm = d.get(PDFName.of('SMask'));
    if (sm && !(sm instanceof PDFRef)) continue;
    out.push({ ref, stream: obj, w, h, comps, dct: f === '/DCTDecode', size: obj.contents.length, smask: sm instanceof PDFRef ? sm : undefined });
  }
  return out;
}

/* ---------- how big is each image on the page? ---------- */

type M = [number, number, number, number, number, number];
/** m applied first, then c (PDF row-vector convention). */
const mul = (m: M, c: M): M => [
  m[0] * c[0] + m[1] * c[2], m[0] * c[1] + m[1] * c[3],
  m[2] * c[0] + m[3] * c[2], m[2] * c[1] + m[3] * c[3],
  m[4] * c[0] + m[5] * c[2] + c[4], m[4] * c[1] + m[5] * c[3] + c[5],
];

const isWs = (c: number) => c === 32 || c === 10 || c === 13 || c === 9 || c === 12 || c === 0;
const isDelim = (c: number) => c === 40 || c === 41 || c === 60 || c === 62 || c === 91 || c === 93 || c === 123 || c === 125 || c === 47 || c === 37;

/** Walks a content stream, tracking the transform matrix, and reports every image/form drawn with its matrix. */
function scanStream(data: Uint8Array, base: M, onDo: (name: string, m: M) => void) {
  let ctm: M = base;
  const stack: M[] = [];
  let args: (number | string | null)[] = [];
  const n = data.length;
  let i = 0;
  while (i < n) {
    const c = data[i];
    if (isWs(c)) { i++; continue; }
    if (c === 37) { while (i < n && data[i] !== 10 && data[i] !== 13) i++; continue; }
    if (c === 47) { // name
      let j = i + 1;
      while (j < n && !isWs(data[j]) && !isDelim(data[j])) j++;
      args.push(String.fromCharCode(...data.subarray(i + 1, Math.min(j, i + 200))));
      i = j; continue;
    }
    if (c === 40) { // string
      let depth = 1; i++;
      while (i < n && depth > 0) {
        const ch = data[i];
        if (ch === 92) i++;
        else if (ch === 40) depth++;
        else if (ch === 41) depth--;
        i++;
      }
      args.push(null); continue;
    }
    if (c === 60) {
      if (data[i + 1] === 60) { // dictionary: skip to its matching >>
        let depth = 1; i += 2;
        while (i < n && depth > 0) {
          if (data[i] === 60 && data[i + 1] === 60) { depth++; i += 2; }
          else if (data[i] === 62 && data[i + 1] === 62) { depth--; i += 2; }
          else i++;
        }
      } else { while (i < n && data[i] !== 62) i++; i++; }
      args.push(null); continue;
    }
    if (c === 91 || c === 93 || c === 123 || c === 125 || c === 62 || c === 41) { i++; continue; }
    let j = i;
    while (j < n && !isWs(data[j]) && !isDelim(data[j])) j++;
    const tok = String.fromCharCode(...data.subarray(i, Math.min(j, i + 40)));
    i = j;
    const num = Number(tok);
    if (tok !== '' && Number.isFinite(num) && /^[+-]?[\d.]/.test(tok)) { args.push(num); if (args.length > 12) args.shift(); continue; }
    switch (tok) {
      case 'q': stack.push(ctm); break;
      case 'Q': if (stack.length) ctm = stack.pop()!; break;
      case 'cm': {
        const a = args.slice(-6);
        if (a.length === 6 && a.every((v) => typeof v === 'number')) ctm = mul(a as M, ctm);
        break;
      }
      case 'Do': {
        const nm = args[args.length - 1];
        if (typeof nm === 'string') onDo(nm, ctm);
        break;
      }
      case 'BI': { // inline image: skip its binary data up to the closing EI
        while (i < n) {
          if (data[i] === 69 && data[i + 1] === 73 && isWs(data[i - 1] ?? 32) && (i + 2 >= n || isWs(data[i + 2]))) { i += 2; break; }
          i++;
        }
        break;
      }
    }
    args = [];
  }
}

const streamBytes = (s: unknown): Uint8Array | null => {
  try { return s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : null; } catch { return null; }
};

/** Largest size (in PDF points) at which each image is drawn anywhere in the document. */
function measurePlacements(doc: PDFDocument): Map<PDFRef, { w: number; h: number }> {
  const ctx = doc.context;
  const sizes = new Map<PDFRef, { w: number; h: number }>();
  let budget = 4000; // streams parsed, so a pathological file can't hang the worker

  const walk = (data: Uint8Array, res: PDFDict | undefined, base: M, depth: number) => {
    if (budget-- <= 0) return;
    const xobjects = res?.lookup(PDFName.of('XObject'));
    if (!(xobjects instanceof PDFDict)) return;
    scanStream(data, base, (name, m) => {
      const ref = xobjects.get(PDFName.of(name));
      if (!(ref instanceof PDFRef)) return;
      const obj = ctx.lookup(ref);
      if (!(obj instanceof PDFRawStream)) return;
      const sub = String(key(obj.dict, 'Subtype'));
      if (sub === '/Image') {
        const w = Math.hypot(m[0], m[1]), h = Math.hypot(m[2], m[3]);
        const prev = sizes.get(ref);
        sizes.set(ref, { w: Math.max(prev?.w ?? 0, w), h: Math.max(prev?.h ?? 0, h) });
      } else if (sub === '/Form' && depth < 6) {
        const mat = key(obj.dict, 'Matrix');
        let fm: M = [1, 0, 0, 1, 0, 0];
        if (mat instanceof PDFArray && mat.size() === 6) {
          const v = Array.from({ length: 6 }, (_, k) => { const x = mat.lookup(k); return x instanceof PDFNumber ? x.asNumber() : 0; });
          fm = v as M;
        }
        const inner = streamBytes(obj);
        const r = key(obj.dict, 'Resources');
        if (inner) walk(inner, r instanceof PDFDict ? r : res, mul(fm, m), depth + 1);
      }
    });
  };

  for (const page of doc.getPages()) {
    const res = page.node.Resources();
    const contents = page.node.Contents();
    const parts: Uint8Array[] = [];
    if (contents instanceof PDFArray) {
      for (let k = 0; k < contents.size(); k++) { const b = streamBytes(contents.lookup(k)); if (b) parts.push(b); }
    } else {
      const b = streamBytes(contents);
      if (b) parts.push(b);
    }
    if (!parts.length) continue;
    const total = parts.reduce((s, p) => s + p.length + 1, 0);
    const all = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { all.set(p, off); off += p.length; all[off++] = 10; }
    walk(all, res, [1, 0, 0, 1, 0, 0], 0);
  }
  return sizes;
}

/* ---------- decode / encode ---------- */

async function decode(c: Cand): Promise<ImageBitmap | null> {
  try {
    if (c.dct) return await createImageBitmap(new Blob([c.stream.contents as BlobPart], { type: 'image/jpeg' }), { imageOrientation: 'none' });
    const raw = decodePDFRawStream(c.stream).decode();
    const n = c.w * c.h;
    if (raw.length < n * c.comps) return null;
    // Flat graphics (logos, charts, screenshots) have few distinct colors and turn blurry as JPEG; leave them lossless.
    const seen = new Set<number>();
    const step = Math.max(1, Math.floor(n / 20000));
    for (let p = 0; p < n && seen.size <= 512; p += step) {
      seen.add(c.comps === 3 ? (raw[p * 3] << 16) | (raw[p * 3 + 1] << 8) | raw[p * 3 + 2] : raw[p]);
    }
    if (seen.size <= 512) return null;
    const rgba = new Uint8ClampedArray(n * 4);
    for (let i = 0, j = 0; i < n; i++) {
      if (c.comps === 3) { rgba[j++] = raw[i * 3]; rgba[j++] = raw[i * 3 + 1]; rgba[j++] = raw[i * 3 + 2]; }
      else { const g = raw[i]; rgba[j++] = g; rgba[j++] = g; rgba[j++] = g; }
      rgba[j++] = 255;
    }
    return await createImageBitmap(new ImageData(rgba, c.w, c.h));
  } catch {
    return null;
  }
}

async function encode(bm: ImageBitmap, scale: number, quality: number): Promise<Enc> {
  let w = Math.max(1, Math.round(bm.width * scale));
  let h = Math.max(1, Math.round(bm.height * scale));
  let src: ImageBitmap | OffscreenCanvas = bm;
  // Big reductions in one drawImage call alias badly. Halving step by step keeps edges and text crisp.
  while (scale < 0.5) {
    const sw = Math.max(w, Math.round(src.width / 2)), sh = Math.max(h, Math.round(src.height / 2));
    const step = new OffscreenCanvas(sw, sh);
    const sg = step.getContext('2d')!;
    sg.imageSmoothingQuality = 'high';
    sg.drawImage(src, 0, 0, sw, sh);
    src = step;
    scale *= 2;
    if (sw === w && sh === h) break;
  }
  const canvas = new OffscreenCanvas(w, h);
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, w, h);
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h };
}

/** How much to shrink an image's pixel dimensions at this level (1 = keep as is). */
function scaleFor(c: Cand, level: Level, placed?: { w: number; h: number }): number {
  const p = PRESETS[level];
  if (placed && placed.w > 1 && placed.h > 1) {
    const dpi = Math.min(c.w / (placed.w / 72), c.h / (placed.h / 72));
    return dpi > p.dpi * p.slack ? p.dpi / dpi : 1;
  }
  const longest = Math.max(c.w, c.h);
  return longest > p.side * p.slack ? p.side / longest : 1;
}

async function compressKeepText(source: Uint8Array, level: Level, progress: (f: number, label: string) => void): Promise<KeepTextResult> {
  const before = source.length;
  if (typeof OffscreenCanvas === 'undefined') throw new Error('This browser can’t recompress images in the background.');
  const doc = await PDFDocument.load(source, { ignoreEncryption: true });
  const ctx = doc.context;
  const cands = findCandidates(ctx);
  if (!cands.length) return { bytes: source, before, changed: false, images: 0, shrunk: 0 };

  progress(0, 'Reading the pages');
  let placements = new Map<PDFRef, { w: number; h: number }>();
  try { placements = measurePlacements(doc); } catch { /* fall back to pixel caps */ }

  const q = PRESETS[level].q;
  let shrunk = 0;
  for (let k = 0; k < cands.length; k++) {
    progress(k / cands.length, `Image ${k + 1} of ${cands.length}`);
    const c = cands[k];
    const bm = await decode(c);
    if (!bm) continue;
    const e = await encode(bm, scaleFor(c, level, placements.get(c.ref)), q);
    bm.close();
    if (e.bytes.length > c.size * MIN_GAIN) continue; // not worth it: keep the original, untouched
    const dict = ctx.obj({
      Type: 'XObject', Subtype: 'Image', Width: e.w, Height: e.h,
      ColorSpace: 'DeviceRGB', BitsPerComponent: 8, Filter: 'DCTDecode',
      ...(c.smask ? { SMask: c.smask } : {}),
    });
    ctx.assign(c.ref, PDFRawStream.of(dict, e.bytes));
    shrunk++;
  }
  if (!shrunk) return { bytes: source, before, changed: false, images: cands.length, shrunk: 0 };

  progress(1, 'Saving');
  const bytes = await doc.save();
  if (bytes.length >= before) return { bytes: source, before, changed: false, images: cands.length, shrunk: 0 };
  return { bytes, before, changed: true, images: cands.length, shrunk };
}

const scope = self as unknown as {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<{ source: Uint8Array; level: Level }>) => void) | null;
};
scope.onmessage = async (e) => {
  try {
    const res = await compressKeepText(e.data.source, e.data.level, (f, label) => scope.postMessage({ type: 'progress', f, label }));
    scope.postMessage({ type: 'done', res }, [res.bytes.buffer]);
  } catch (err) {
    scope.postMessage({ type: 'error', message: err instanceof Error ? err.message : 'unknown error' });
  }
};
