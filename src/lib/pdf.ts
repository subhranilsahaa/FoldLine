import { PDFDocument, degrees } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type { KeepTextResult, Level } from './compress.worker';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { PasswordRequired, decryptPdf, looksEncrypted } from './unlock';

// pdf.js is loaded on first use so that prerendering (Node) never imports it.
let pdfjsReady: Promise<typeof import('pdfjs-dist')> | undefined;
export function getPdfjs() {
  pdfjsReady ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return pdfjsReady;
}

/** Crop rectangle as fractions (0-1) of the page as displayed, origin top-left. */
export interface Crop { x: number; y: number; w: number; h: number }

/** How the file was protected when opened: not at all, restricted (no password needed to open), or locked with a password. */
export type Protection = 'none' | 'restricted' | 'password';

export interface SourceDoc {
  id: string;
  name: string;
  /** unencrypted bytes (protection is removed when the file is opened) */
  bytes: Uint8Array;
  proxy: PDFDocumentProxy;
  protection: Protection;
}

export interface PageItem {
  id: string;
  docId: string;
  /** zero-based page index inside its source document */
  index: number;
  /** original 1-based page number in the source PDF; never changes after reordering or deleting */
  srcIndex: number;
  /** rotation stored in the file */
  base: number;
  /** extra rotation added by the user */
  rot: number;
  crop: Crop | null;
}

export const totalRotation = (p: Pick<PageItem, 'base' | 'rot'>) => (p.base + p.rot) % 360;

const isPasswordError = (e: unknown) => (e as { name?: string } | null)?.name === 'PasswordException';

/**
 * Opens a PDF from bytes. Encrypted files are decrypted up front so that every tool (which edits with
 * pdf-lib) sees plain content. Throws PasswordRequired when a password is needed or was wrong.
 */
export async function loadPdfBytes(name: string, bytes: Uint8Array, password = ''): Promise<{ doc: SourceDoc; pages: PageItem[] }> {
  const pdfjs = await getPdfjs();
  let data = bytes;
  let protection: Protection = 'none';
  let proxy: PDFDocumentProxy;
  try {
    // pdf.js transfers the buffer to its worker, so hand it a copy.
    proxy = await pdfjs.getDocument({ data: bytes.slice(), password: password || undefined }).promise;
  } catch (e) {
    if (isPasswordError(e)) throw new PasswordRequired(!!password && (e as { code?: number }).code === 2);
    throw e;
  }
  if (looksEncrypted(bytes)) {
    try {
      data = await decryptPdf(bytes, password);
    } catch (e) {
      void proxy.destroy();
      throw e;
    }
    protection = password ? 'password' : 'restricted';
    void proxy.destroy();
    proxy = await pdfjs.getDocument({ data: data.slice() }).promise;
  }
  const id = crypto.randomUUID();
  const pages: PageItem[] = [];
  for (let i = 0; i < proxy.numPages; i++) {
    const page = await proxy.getPage(i + 1);
    pages.push({ id: crypto.randomUUID(), docId: id, index: i, srcIndex: i + 1, base: page.rotate, rot: 0, crop: null });
  }
  return { doc: { id, name, bytes: data, proxy, protection }, pages };
}

export async function loadPdf(file: File) {
  return loadPdfBytes(file.name, new Uint8Array(await file.arrayBuffer()));
}

/** Renders a page to an offscreen canvas. Cancel via the returned task. */
export async function startRender(
  doc: SourceDoc,
  index: number,
  rotation: number,
  cssWidth: number,
): Promise<{ canvas: HTMLCanvasElement; task: RenderTask }> {
  const page = await doc.proxy.getPage(index + 1);
  const v0 = page.getViewport({ scale: 1, rotation });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: (cssWidth * dpr) / v0.width, rotation });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const task = page.render({ canvasContext: canvas.getContext('2d')!, viewport });
  return { canvas, task };
}

/** Maps a crop drawn on the displayed page back to the unrotated page box. */
function toCropBox(crop: Crop, rotation: number, box: { x: number; y: number; width: number; height: number }) {
  const map = (u: number, v: number): [number, number] =>
    rotation === 90 ? [v, 1 - u]
    : rotation === 180 ? [1 - u, 1 - v]
    : rotation === 270 ? [1 - v, u]
    : [u, v];
  const a = map(crop.x, crop.y);
  const b = map(crop.x + crop.w, crop.y + crop.h);
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  return {
    x: box.x + x0 * box.width,
    y: box.y + (1 - y1) * box.height,
    width: (x1 - x0) * box.width,
    height: (y1 - y0) * box.height,
  };
}

export async function buildPdf(docs: Record<string, SourceDoc>, items: PageItem[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  // pdf-lib copies shared resources (images, fonts) once per copyPages call. Copying page by page
  // therefore duplicated every shared image and font and made the result many times bigger than the
  // source. Copy all of a document's pages in ONE call so shared resources are copied once.
  const copied = new Map<string, PDFPage>();
  const pageKey = (docId: string, index: number) => `${docId}:${index}`;
  const byDoc = new Map<string, number[]>();
  for (const item of items) {
    const list = byDoc.get(item.docId) ?? [];
    if (!list.includes(item.index)) list.push(item.index);
    byDoc.set(item.docId, list);
  }
  const sources = new Map<string, PDFDocument>();
  for (const [docId, indices] of byDoc) {
    const src = await PDFDocument.load(docs[docId].bytes, { ignoreEncryption: true });
    sources.set(docId, src);
    const pages = await out.copyPages(src, indices);
    indices.forEach((idx, i) => copied.set(pageKey(docId, idx), pages[i]));
  }
  const used = new Set<string>();
  for (const item of items) {
    const k = pageKey(item.docId, item.index);
    let page = copied.get(k)!;
    // The same page placed twice needs its own copy, because a page object can only be added once.
    if (used.has(k)) [page] = await out.copyPages(sources.get(item.docId)!, [item.index]);
    used.add(k);
    const rotation = totalRotation(item);
    page.setRotation(degrees(rotation));
    if (item.crop) {
      const b = toCropBox(item.crop, rotation, page.getCropBox());
      page.setCropBox(b.x, b.y, b.width, b.height);
    }
    out.addPage(page);
  }
  return out.save();
}

/** Same bytes and same name within this window count as one click (double tap, held Enter, auto-download followed by the button). */
const DUPLICATE_MS = 1500;
let lastDownload: { bytes: Uint8Array; filename: string; at: number } | null = null;

/**
 * Saves `bytes` under exactly `filename`. Callers get the name from useFileName/toFileName, which have
 * already made it safe; this function does not rename anything.
 */
export function downloadBytes(bytes: Uint8Array, filename: string) {
  const now = Date.now();
  if (lastDownload && lastDownload.bytes === bytes && lastDownload.filename === filename && now - lastDownload.at < DUPLICATE_MS) return;
  lastDownload = { bytes, filename, at: now };
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  // Lets the app show its "Done" card without every tool wiring it up (see DoneCard).
  window.dispatchEvent(new CustomEvent(DOWNLOAD_EVENT, { detail: { filename } }));
}

export const DOWNLOAD_EVENT = 'foldline:download';

export type { KeepTextResult, Level as CompressLevel };

/** Recompresses the photos inside a PDF at a fixed quality level. Text and vector graphics are never touched. Runs in a Web Worker. */
export function compressKeepText(
  source: Uint8Array,
  level: Level,
  onProgress?: (fraction: number, label: string) => void,
): Promise<KeepTextResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./compress.worker.ts', import.meta.url), { type: 'module' });
    const finish = () => worker.terminate();
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'progress') onProgress?.(e.data.f, e.data.label);
      else if (e.data.type === 'done') { finish(); resolve(e.data.res); }
      else { finish(); reject(new Error(e.data.message)); }
    };
    worker.onerror = () => { finish(); reject(new Error('The compression worker failed to start.')); };
    const copy = source.slice();
    worker.postMessage({ source: copy, level }, [copy.buffer]);
  });
}
