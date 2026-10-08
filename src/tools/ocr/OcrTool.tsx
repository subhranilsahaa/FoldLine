import { useRef, useState } from 'react';
import { usePdfStore } from '../../lib/store';
import { buildPdf, downloadBytes } from '../../lib/pdf';
import { OCR_LANGS, defaultLangs, ocrPdf, type OcrResult } from '../../lib/ocr';
import { docKey, pageNames } from '../../lib/filename';
import { useFileName } from '../../lib/useFileName';
import { META } from '../../tools-meta';
import DownloadRow from '../../components/DownloadRow';
import Icon from '../../components/Icon';
import FileChips from '../../components/FileChips';
import ToolShell from '../../components/ToolShell';

interface Done extends OcrResult { sig: string }

function Ocr() {
  const pages = usePdfStore((s) => s.pages);
  const docs = usePdfStore((s) => s.docs);
  const notify = usePdfStore((s) => s.notify);
  const sig = pages.map((p) => p.id).join(',');

  const [langs, setLangs] = useState<string[]>(defaultLangs);
  const [skipText, setSkipText] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ f: number; label: string } | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const abort = useRef<AbortController | null>(null);

  const name = useFileName('ocr', pageNames(pages, docs), docKey(pages));
  // The auto-download happens after awaits, so it reads the name from a ref instead of a stale closure.
  const nameRef = useRef(name.filename);
  nameRef.current = name.filename;

  const toggle = (code: string) =>
    setLangs((cur) => (cur.includes(code) ? (cur.length > 1 ? cur.filter((c) => c !== code) : cur) : [...cur, code]));

  const run = async () => {
    const ctl = new AbortController();
    abort.current = ctl;
    setBusy(true);
    setDone(null);
    try {
      setProgress({ f: 0, label: 'Preparing…' });
      const built = await buildPdf(docs, pages);
      const r = await ocrPdf(built, { langs, skipText, signal: ctl.signal, onProgress: (f, label) => setProgress({ f, label }) });
      setDone({ ...r, sig });
      if (r.words > 0) downloadBytes(r.bytes, nameRef.current); // saved straight away; the card keeps a Download button (with the rename field) for another copy
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') notify(`Text recognition failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setBusy(false);
      setProgress(null);
      abort.current = null;
    }
  };

  const result = done && done.sig === sig ? done : null;
  let headline = '', detail = '';
  if (result) {
    if (result.words === 0) {
      headline = result.pages === 0 ? 'Nothing needed reading' : 'No text found';
      detail = result.pages === 0
        ? 'Every page already has searchable text, so the file was left unchanged.'
        : 'The pages may be blank, too faint, or in a language that isn’t selected. Try another language.';
    } else {
      headline = `${result.words.toLocaleString()} words made searchable`;
      detail = `Read ${result.pages} ${result.pages === 1 ? 'page' : 'pages'}${result.skipped ? ` and skipped ${result.skipped} that already had text` : ''}. The pages look exactly as before; the text is a hidden layer you can search, select and copy.`;
    }
  }

  return (
    <>
      <FileChips />
      <div className="mt-6 max-w-xl rounded-2xl border border-line bg-card p-5">
        <fieldset disabled={busy}>
          <legend className="font-display text-xl font-bold">Language in the document</legend>
          <p className="mt-1 text-sm text-mute">Pick every language that appears. Languages with other alphabets aren’t supported yet.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {OCR_LANGS.map((l) => (
              <button
                key={l.code} type="button" aria-pressed={langs.includes(l.code)} onClick={() => toggle(l.code)}
                className={`btn ${langs.includes(l.code) ? 'border-ink! bg-ink text-desk!' : ''}`}
              >
                {langs.includes(l.code) && <Icon name="check" className="size-3.5" />}{l.label}
              </button>
            ))}
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={skipText} onChange={(e) => setSkipText(e.target.checked)} className="size-4 accent-[var(--ink)]" />
            Skip pages that already have text
          </label>
        </fieldset>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn btn-hl btn-lg" onClick={() => void run()} disabled={busy}>
            <Icon name="scan" />{busy ? 'Reading pages…' : 'Make searchable & download'}
          </button>
          {busy && <button className="btn btn-lg" onClick={() => abort.current?.abort()}>Cancel</button>}
        </div>
        {progress && (
          <div className="mt-4" role="status" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-ink transition-[width]" style={{ width: `${Math.round(progress.f * 100)}%` }} /></div>
            <p className="mt-2 text-sm text-mute">{progress.label}</p>
          </div>
        )}
      </div>

      {result && (
        <div role="status" aria-live="polite" className="mt-4 max-w-xl rounded-2xl border border-line bg-card p-5">
          <p className="font-display text-2xl font-bold">{headline}</p>
          <p className="mt-1.5 text-mute">{detail}</p>
          {result.words > 0 && (
            <DownloadRow
              name={name} label="Download again" icon={<Icon name="download" />} primary={false} className="mt-4"
              onDownload={() => downloadBytes(result.bytes, name.filename)}
            />
          )}
        </div>
      )}
      <p className="mt-6 max-w-[62ch] text-[13px] text-mute">
        Recognition runs on your device. The first time, your browser downloads the text-recognition engine and the language data (a few MB, then cached); your PDF is never sent anywhere. Large scans can take a few seconds per page.
      </p>
    </>
  );
}

export default function OcrTool() {
  return <ToolShell meta={META.ocr}><Ocr /></ToolShell>;
}
