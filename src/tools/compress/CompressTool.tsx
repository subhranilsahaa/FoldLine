import { useRef, useState } from 'react';
import { usePdfStore } from '../../lib/store';
import { buildPdf, compressKeepText, downloadBytes } from '../../lib/pdf';
import type { CompressLevel } from '../../lib/pdf';
import { docKey, pageNames } from '../../lib/filename';
import { useFileName } from '../../lib/useFileName';
import { META } from '../../tools-meta';
import DownloadRow from '../../components/DownloadRow';
import Icon from '../../components/Icon';
import FileChips from '../../components/FileChips';
import ToolShell from '../../components/ToolShell';

const LEVELS: { id: CompressLevel; title: string; hint: string }[] = [
  { id: 'best', title: 'Best', hint: 'Looks the same' },
  { id: 'medium', title: 'Medium', hint: 'Sharp, much smaller' },
  { id: 'low', title: 'Low', hint: 'Smallest file' },
];

/** Decimal units (1 MB = 1,000,000 bytes) so sizes match what upload forms and mail apps show. */
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
const saved = (before: number, after: number) => Math.max(0, Math.round((1 - after / before) * 100));

interface Done {
  bytes: Uint8Array;
  before: number;
  /** the PDF got smaller */
  changed: boolean;
  images: number;
  shrunk: number;
}

function Compressor() {
  const pages = usePdfStore((s) => s.pages);
  const docs = usePdfStore((s) => s.docs);
  const notify = usePdfStore((s) => s.notify);
  const used = new Set(pages.map((p) => p.docId));
  const total = Object.values(docs).filter((d) => used.has(d.id)).reduce((sum, d) => sum + d.bytes.length, 0);
  const sig = pages.map((p) => p.id).join(',');

  const [busy, setBusy] = useState<CompressLevel | null>(null);
  const [progress, setProgress] = useState<{ f: number; label: string } | null>(null);
  // Every level already tried for the current pages, so people can compare and switch without waiting again.
  const [results, setResults] = useState<{ sig: string; byLevel: Partial<Record<CompressLevel, Done>> }>({ sig: '', byLevel: {} });
  const [active, setActive] = useState<CompressLevel | null>(null);
  const built = useRef<{ sig: string; bytes: Uint8Array } | null>(null);

  const name = useFileName('compress', pageNames(pages, docs), docKey(pages));
  // The auto-download happens after an await, so it reads the name from a ref instead of a stale closure.
  const nameRef = useRef(name.filename);
  nameRef.current = name.filename;

  const byLevel = results.sig === sig ? results.byLevel : {};
  const result = active ? byLevel[active] : undefined;

  const run = async (level: CompressLevel) => {
    if (busy) return;
    const cached = byLevel[level];
    if (cached) {
      setActive(level);
      if (cached.changed) downloadBytes(cached.bytes, nameRef.current);
      return;
    }
    setBusy(level);
    setActive(null);
    try {
      setProgress({ f: 0, label: 'Getting ready' });
      if (built.current?.sig !== sig) built.current = { sig, bytes: await buildPdf(docs, pages) };
      const r = await compressKeepText(built.current.bytes, level, (f, label) => setProgress({ f, label }));
      const done: Done = { bytes: r.bytes, before: r.before, changed: r.changed, images: r.images, shrunk: r.shrunk };
      setResults((prev) => ({ sig, byLevel: { ...(prev.sig === sig ? prev.byLevel : {}), [level]: done } }));
      setActive(level);
      if (done.changed) downloadBytes(done.bytes, nameRef.current);
    } catch (e) {
      notify(`Compression failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  return (
    <>
      <FileChips />
      <div className="mt-6 w-full max-w-xl rounded-2xl border border-line bg-card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-xl font-bold">Choose quality</p>
          <p className="text-sm text-mute">Now {fmt(total)}</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LEVELS.map((l) => {
            const r = byLevel[l.id];
            const on = active === l.id;
            return (
              <button
                key={l.id} type="button" disabled={!!busy} onClick={() => void run(l.id)} aria-pressed={on}
                className={`flex min-h-24 flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-3 text-center hover:border-ink disabled:cursor-default disabled:opacity-60 ${on ? 'border-ink bg-hl text-hl-ink' : 'border-line bg-card'}`}
              >
                <span className="font-display text-lg font-bold">{l.title}</span>
                <span className={`text-[12px] leading-tight ${on ? '' : 'text-mute'}`}>{l.hint}</span>
                {busy === l.id && <span className="text-[12px] font-semibold">Working…</span>}
                {r && busy !== l.id && <span className="mt-1 text-[13px] font-semibold">{r.changed ? fmt(r.bytes.length) : 'No change'}</span>}
              </button>
            );
          })}
        </div>
        {progress && (
          <div className="mt-4" role="status" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-ink transition-[width]" style={{ width: `${Math.round(progress.f * 100)}%` }} /></div>
            <p className="mt-2 text-sm text-mute">{progress.label}</p>
          </div>
        )}
      </div>

      {result && !busy && (
        <div role="status" aria-live="polite" className="mt-4 w-full max-w-xl rounded-2xl border border-line bg-card p-5">
          {result.changed ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-display text-2xl font-bold">{fmt(result.before)} → {fmt(result.bytes.length)}</p>
                <span className="rounded-full bg-hl px-2.5 py-0.5 text-sm font-semibold text-hl-ink">−{saved(result.before, result.bytes.length)}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(3, Math.round((result.bytes.length / result.before) * 100))}%` }} />
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-mute">
                <li className="inline-flex items-center gap-1.5"><Icon name="check" className="size-4" />Text still selectable</li>
                <li className="inline-flex items-center gap-1.5"><Icon name="image" className="size-4" />{result.shrunk} of {result.images} {result.images === 1 ? 'image' : 'images'} shrunk</li>
              </ul>
              <div className="mt-4 grid gap-3">
                <DownloadRow name={name} label="Download again" icon={<Icon name="download" />} onDownload={() => downloadBytes(result.bytes, name.filename)} />
              </div>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-bold">Nothing to shrink</p>
              <p className="mt-1.5 text-mute">
                {result.images ? 'Its images are already small.' : 'It’s mostly text, which is already compact.'} Your file is unchanged at {fmt(result.before)}.
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default function CompressTool() {
  return <ToolShell meta={META.compress}><Compressor /></ToolShell>;
}
