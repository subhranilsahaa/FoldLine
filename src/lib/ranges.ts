/**
 * Parses page ranges like "1-3, 7, 10-" into sorted, unique, 1-based page numbers.
 * Open ranges ("10-") run to the last page. Returns null when the text isn't a valid range list.
 */
export function parseRanges(text: string, max: number): number[] | null {
  const parts = text.split(/[,;\s]+/).filter(Boolean);
  if (!parts.length) return null;
  const out = new Set<number>();
  for (const part of parts) {
    const m = /^(\d+)?(?:\s*[-–—]\s*(\d+)?)?$/.exec(part);
    if (!m || (m[1] === undefined && m[2] === undefined)) return null;
    const dash = /[-–—]/.test(part);
    const a = m[1] !== undefined ? parseInt(m[1], 10) : 1;
    const b = dash ? (m[2] !== undefined ? parseInt(m[2], 10) : max) : a;
    if (a < 1 || b < a) return null;
    for (let n = a; n <= Math.min(b, max); n++) out.add(n);
  }
  return out.size ? [...out].sort((x, y) => x - y) : null;
}
