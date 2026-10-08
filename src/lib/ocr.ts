import {
  PDFDocument, PDFName, StandardFonts, TextRenderingMode, beginText, endText, popGraphicsState, pushGraphicsState,
  setCharacterSqueeze, setFontAndSize, setTextMatrix, setTextRenderingMode, showText, type PDFFont, type PDFPage,
} from 'pdf-lib';
import { getPdfjs } from './pdf';

/** A recognized word placed in PDF user space (points). The baseline starts at (x, y). */
export interface PlacedWord { text: string; x: number; y: number; width: number; size: number; angle: number }

/** Minimal view of a pdf.js viewport; lets the placement maths be tested without a browser. */
export interface ViewportLike { convertToPdfPoint(x: number, y: number): number[] }

export interface PixelWord { text: string; x0: number; y0: number; x1: number; y1: number }

/**
 * Languages whose text fits the Latin character set of the built-in PDF font. Letters outside it
 * are approximated (é stays, ł becomes l) so search still works. Other scripts need an embedded
 * Unicode font and are not offered yet.
 */
export const OCR_LANGS: { code: string; label: string; iso: string }[] = [
  { code: 'eng', label: 'English', iso: 'en' },
  { code: 'spa', label: 'Spanish', iso: 'es' },
  { code: 'fra', label: 'French', iso: 'fr' },
  { code: 'deu', label: 'German', iso: 'de' },
  { code: 'ita', label: 'Italian', iso: 'it' },
  { code: 'por', label: 'Portuguese', iso: 'pt' },
  { code: 'nld', label: 'Dutch', iso: 'nl' },
  { code: 'swe', label: 'Swedish', iso: 'sv' },
  { code: 'dan', label: 'Danish', iso: 'da' },
  { code: 'nor', label: 'Norwegian', iso: 'no' },
  { code: 'pol', label: 'Polish', iso: 'pl' },
  { code: 'ces', label: 'Czech', iso: 'cs' },
  { code: 'tur', label: 'Turkish', iso: 'tr' },
  { code: 'ron', label: 'Romanian', iso: 'ro' },
  { code: 'ind', label: 'Indonesian', iso: 'id' },
];

/** The browser's language if we support it, plus English. */
export function defaultLangs(): string[] {
  const iso = (typeof navigator !== 'undefined' ? navigator.language : 'en').slice(0, 2).toLowerCase();
  const hit = OCR_LANGS.find((l) => l.iso === iso);
  return hit && hit.code !== 'eng' ? [hit.code, 'eng'] : ['eng'];
}

/** Letters that have no accent-stripped form via Unicode decomposition. */
const LOOKALIKE: Record<string, string> = { 'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D', 'ħ': 'h', 'Ħ': 'H', 'ı': 'i' };

/** Keeps only characters the font can show, approximating the rest (accents, ligatures). */
export function toFontText(font: PDFFont, text: string): string {
  const ok = new Set(font.getCharacterSet());
  let out = '';
  for (const ch of text) {
    if (ok.has(ch.codePointAt(0)!)) { out += ch; continue; }
    const base = LOOKALIKE[ch] ?? ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    if (base && [...base].every((c) => ok.has(c.codePointAt(0)!))) out += base;
  }
  return out;
}

/** Converts a word box in rendered-page pixels to a baseline position in PDF space. */
export function placeWord(vp: ViewportLike, scale: number, w: PixelWord, font: PDFFont): PlacedWord | null {
  const text = toFontText(font, w.text.trim());
  if (!text) return null;
  const [x0, y0] = vp.convertToPdfPoint(w.x0, w.y1); // bottom-left of the word as displayed
  const [x1, y1] = vp.convertToPdfPoint(w.x1, w.y1); // bottom-right
  const width = Math.hypot(x1 - x0, y1 - y0);
  const size = Math.max(1, ((w.y1 - w.y0) / scale) * 0.9);
  if (!(width > 0) || !Number.isFinite(width)) return null;
  return { text, x: x0, y: y0, width, size, angle: Math.atan2(y1 - y0, x1 - x0) };
}

const FONT_KEY = 'FlOcr';

/** Adds invisible (render mode 3) text over a page so it can be searched, selected and copied. */
export function addTextLayer(page: PDFPage, font: PDFFont, words: PlacedWord[]) {
  if (!words.length) return;
  page.node.normalize(); // wrap existing content in q/Q so our overlay starts from a clean state
  page.node.setFontDictionary(PDFName.of(FONT_KEY), font.ref);
  const fontName = PDFName.of(FONT_KEY);
  for (const w of words) {
    // Stretch the word horizontally to match its printed width, so selection boxes line up.
    const natural = font.widthOfTextAtSize(w.text, w.size);
    const squeeze = natural > 0 ? Math.min(1000, Math.max(5, (w.width / natural) * 100)) : 100;
    const cos = Math.cos(w.angle), sin = Math.sin(w.angle);
    page.pushOperators(
      pushGraphicsState(),
      beginText(),
      setTextRenderingMode(TextRenderingMode.Invisible),
      setFontAndSize(fontName, w.size),
      setCharacterSqueeze(squeeze),
      setTextMatrix(cos, sin, -sin, cos, w.x, w.y),
      showText(font.encodeText(w.text + ' ')),
      endText(),
      popGraphicsState(),
    );
  }
}

export interface OcrOptions {
  langs: string[];
  /** leave pages that already contain text alone */
  skipText: boolean;
  signal?: AbortSignal;
  onProgress?: (fraction: number, label: string) => void;
}

export interface OcrResult { bytes: Uint8Array; pages: number; skipped: number; words: number }

/** Where the recognition engine and language data come from. Defaults to tesseract.js's public CDNs. */
function workerPaths() {
  const base = (import.meta.env.VITE_OCR_BASE_URL as string | undefined)?.replace(/\/$/, '');
  return base ? { workerPath: `${base}/worker.min.js`, corePath: `${base}/core`, langPath: `${base}/lang` } : {};
}

const OCR_DPI = 250;
const MAX_PIXELS = 12_000_000;
const MIN_CONFIDENCE = 25;

interface TessWord { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }

/** tesseract.js 5 returns data.words; 6 returns blocks > paragraphs > lines > words. */
function collectWords(data: unknown): TessWord[] {
  const d = data as { words?: TessWord[]; blocks?: { paragraphs?: { lines?: { words?: TessWord[] }[] }[] }[] };
  if (Array.isArray(d.words)) return d.words;
  const out: TessWord[] = [];
  for (const b of d.blocks ?? []) for (const p of b.paragraphs ?? []) for (const l of p.lines ?? []) for (const w of l.words ?? []) out.push(w);
  return out;
}

const abortError = () => new DOMException('Cancelled', 'AbortError');

/** Recognizes the text on each page and returns the PDF with an invisible, searchable text layer. */
export async function ocrPdf(source: Uint8Array, opts: OcrOptions): Promise<OcrResult> {
  const { langs, skipText, signal, onProgress } = opts;
  const [pdfjs, { createWorker }] = await Promise.all([getPdfjs(), import('tesseract.js')]);
  const pdf = await pdfjs.getDocument({ data: source.slice() }).promise;
  const n = pdf.numPages;
  onProgress?.(0, 'Loading the text recognition engine…');

  const worker = await createWorker(langs.join('+'), 1, { ...workerPaths(), logger: () => undefined });
  const aborted = new Promise<never>((_, reject) => {
    signal?.addEventListener('abort', () => { void worker.terminate(); reject(abortError()); }, { once: true });
  });
  aborted.catch(() => undefined);

  try {
    const out = await PDFDocument.load(source, { ignoreEncryption: true });
    const font = await out.embedFont(StandardFonts.Helvetica);
    const outPages = out.getPages();
    let skipped = 0, total = 0;

    for (let i = 0; i < n; i++) {
      if (signal?.aborted) throw abortError();
      const label = `Reading page ${i + 1} of ${n}…`;
      onProgress?.(i / n, label);
      const page = await pdf.getPage(i + 1);

      if (skipText) {
        const tc = await page.getTextContent();
        const chars = tc.items.reduce((sum, it) => sum + ('str' in it ? it.str.trim().length : 0), 0);
        if (chars >= 25) { skipped++; page.cleanup(); continue; }
      }

      const base = page.getViewport({ scale: 1 });
      let scale = OCR_DPI / 72;
      const px = base.width * scale * base.height * scale;
      if (px > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / px);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(vp.width));
      canvas.height = Math.max(1, Math.floor(vp.height));
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      const { data } = await Promise.race([worker.recognize(canvas, {}, { blocks: true }), aborted]);
      canvas.width = canvas.height = 0;
      page.cleanup();

      const placed: PlacedWord[] = [];
      for (const w of collectWords(data)) {
        if (w.confidence < MIN_CONFIDENCE) continue;
        const p = placeWord(vp, scale, { text: w.text, ...w.bbox }, font);
        if (p) placed.push(p);
      }
      addTextLayer(outPages[i], font, placed);
      total += placed.length;
      onProgress?.((i + 1) / n, label);
    }
    return { bytes: await out.save(), pages: n - skipped, skipped, words: total };
  } finally {
    void worker.terminate();
    void pdf.destroy();
  }
}
