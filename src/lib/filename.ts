import type { PageItem, SourceDoc } from './pdf';

/**
 * Everything about output file names lives here: the suffix per operation, sanitizing,
 * and the helpers tools use to work out which source file a result is named after.
 * (Keep this file free of runtime imports: scripts/check-filenames.mjs loads it directly in Node.)
 */

export type Operation = 'merge' | 'organize' | 'extract' | 'crop' | 'compress' | 'ocr' | 'unlock' | 'protect';

/** The one place to change suffixes. */
export const SUFFIX: Record<Operation, string> = {
  merge: 'merged',
  organize: 'organized',
  extract: 'extract',
  crop: 'cropped',
  compress: 'compressed',
  ocr: 'searchable',
  unlock: 'unlocked',
  protect: 'protected',
};

/**
 * A merge of several differently named files is called plain "merged.pdf" (the first file's name
 * would suggest the result is only that file). Set to true to name every merge after the first file
 * in the current page order instead.
 */
export const MERGE_NAMED_AFTER_FIRST_FILE = false;

/** Longest allowed file name, ".pdf" included. Most file systems cap a name at 255 bytes; this leaves room for multi-byte characters. */
export const MAX_FILE_NAME = 120;
const EXT = '.pdf';
const MAX_STEM = MAX_FILE_NAME - EXT.length;

// Characters that are illegal in Windows file names (the strictest common case), plus control characters.
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[/\\:*?"<>|\u0000-\u001f\u007f]/g;
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
const TRAILING_PDF = /\.pdf$/i;
const TRAILING_DOCX = /\.docx$/i;

/** The name without a trailing .pdf (any letter case). Does nothing else to it. */
export const stripPdf = (name: string) => name.replace(TRAILING_PDF, '');

/** The name without a trailing .docx (any letter case). */
export const stripDocx = (name: string) => name.replace(TRAILING_DOCX, '');

/** The name without a trailing .pdf or .docx. */
export const stripExt = (name: string) => name.replace(/\.(pdf|docx)$/i, '');

const trimEnds = (s: string) => s.replace(/^[\s.]+|[\s.]+$/g, '');

/** Cuts to `max` characters without splitting an emoji or other surrogate pair. */
function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  let out = '';
  for (const ch of s) {
    if (out.length + ch.length > max) break;
    out += ch;
  }
  return out;
}

/**
 * Turns whatever was typed (or came from the original file) into a safe name stem, without ".pdf" or ".docx":
 * illegal characters removed, spaces and dots trimmed from both ends, any extensions removed,
 * at most 116 characters, and "document" when nothing is left.
 */
export function sanitizeStem(raw: string, maxStem = MAX_STEM): string {
  let s = raw.normalize('NFC').replace(ILLEGAL, '');
  // Trim the end and strip ".pdf" / ".docx" until stable, so "a.pdf.PDF" ends up as "a" and ".pdf" alone as "".
  for (let prev = ''; prev !== s; ) {
    prev = s;
    s = s.replace(/[\s.]+$/, '').replace(TRAILING_PDF, '').replace(TRAILING_DOCX, '');
  }
  s = trimEnds(clip(trimEnds(s), maxStem));
  if (!s) return 'document';
  return RESERVED.test(s) ? `${s}_` : s;
}

/** A complete, safe file name: the sanitized stem plus exactly one lowercase ".pdf". */
export const toFileName = (raw: string) => sanitizeStem(raw) + EXT;

/**
 * Safe output filename for document conversions (PDF ↔ DOCX).
 * Preserves original stem without duplicate extensions like .pdf.docx or .docx.pdf.
 */
export function convertFileName(originalName: string, targetExt: 'docx' | 'pdf'): string {
  const stem = sanitizeStem(originalName, MAX_FILE_NAME - targetExt.length - 1);
  return `${stem}.${targetExt}`;
}

/**
 * `<base>-<suffix>.pdf`, where base is `docName` without its .pdf ending.
 * Pass `undefined` for no base at all: the result is just `<suffix>.pdf` (used for merges of different files).
 * The base is shortened if needed so the suffix and ".pdf" always fit.
 */
export function suggestName(docName: string | undefined, operation: Operation): string {
  const suffix = SUFFIX[operation];
  if (docName === undefined) return suffix + EXT;
  const room = MAX_STEM - suffix.length - 1;
  return `${sanitizeStem(docName, room)}-${suffix}${EXT}`;
}

/**
 * The name to offer for a result. `names` are the source file names in current page order, first used first.
 * With automatic naming off, the first file's original name is kept as it is.
 */
export function nameFor(operation: Operation, names: string[], auto: boolean): string {
  const first = names[0];
  if (!auto) return toFileName(first ?? '');
  const bases = new Set(names.map((n) => sanitizeStem(n).toLowerCase()));
  const differ = operation === 'merge' && !MERGE_NAMED_AFTER_FIRST_FILE && bases.size > 1;
  return suggestName(differ ? undefined : (first ?? ''), operation);
}

/** Source file names in the order their first page appears in the current page list. */
export function pageNames(pages: Pick<PageItem, 'docId'>[], docs: Record<string, Pick<SourceDoc, 'name'>>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of pages) {
    if (seen.has(p.docId) || !docs[p.docId]) continue;
    seen.add(p.docId);
    out.push(docs[p.docId].name);
  }
  return out;
}

/** Identifies which files are loaded, ignoring page order and edits, so a typed name survives reordering but not new files. */
export const docKey = (pages: Pick<PageItem, 'docId'>[]) => [...new Set(pages.map((p) => p.docId))].sort().join(',');
