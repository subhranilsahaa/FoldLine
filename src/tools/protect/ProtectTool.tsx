import { useState } from 'react';
import { usePdfStore } from '../../lib/store';
import { buildPdf, downloadBytes, type PageItem, type SourceDoc } from '../../lib/pdf';
import { encryptPdf } from '../../lib/protect';
import { docKey, pageNames } from '../../lib/filename';
import { useFileName } from '../../lib/useFileName';
import { META } from '../../tools-meta';
import Dock from '../../components/Dock';
import DownloadRow from '../../components/DownloadRow';
import FileChips from '../../components/FileChips';
import Icon from '../../components/Icon';
import ToolShell from '../../components/ToolShell';

/** One file, every page in order, nothing rotated or cropped: its original bytes can be encrypted as they are. */
function isPristine(doc: SourceDoc | undefined, pages: PageItem[], docCount: number): doc is SourceDoc {
  return !!doc && docCount === 1 && pages.every((p, i) => p.docId === doc.id && p.index === i && p.rot === 0 && !p.crop) && pages.length === doc.proxy.numPages;
}

function PasswordField({ id, label, value, onChange, show, onToggle, hint, invalid, optional, autoFocus }: {
  id: string; label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle?: () => void;
  hint?: string; invalid?: boolean; optional?: boolean; autoFocus?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-semibold">
        {label}{optional && <span className="text-xs font-normal text-mute">optional</span>}
      </label>
      <div className="relative mt-1">
        <input
          id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus={autoFocus}
          aria-invalid={invalid || undefined} aria-describedby={hint ? `${id}-hint` : undefined}
          className={`fld w-full ${onToggle ? 'pr-12' : ''} ${invalid ? 'border-danger' : ''}`}
        />
        {onToggle && (
          <button type="button" onClick={onToggle} aria-label={show ? 'Hide passwords' : 'Show passwords'} aria-pressed={show}
            className="ib absolute right-0 top-0 size-11">
            <Icon name={show ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </div>
      {hint && <p id={`${id}-hint`} className={`mt-1 text-sm ${invalid ? 'text-danger' : 'text-mute'}`} role={invalid ? 'alert' : undefined}>{hint}</p>}
    </div>
  );
}

/** Autofocus only where there is a physical keyboard; on a phone it would open the keyboard over the page. */
const finePointer = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;

function Protector() {
  const pages = usePdfStore((s) => s.pages);
  const docs = usePdfStore((s) => s.docs);
  const notify = usePdfStore((s) => s.notify);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [owner, setOwner] = useState('');
  const [show, setShow] = useState(false);
  const [block, setBlock] = useState({ print: false, copy: false, edit: false });
  const [busy, setBusy] = useState(false);
  const name = useFileName('protect', pageNames(pages, docs), docKey(pages));

  const used = new Set(pages.map((p) => p.docId));
  const mismatch = confirm.length > 0 && pw !== confirm;
  const ready = pw.length > 0 && pw === confirm && !busy;

  const run = async () => {
    if (!ready) return;
    setBusy(true);
    // Let the busy state paint before the heavy work starts.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      const only = used.size === 1 ? docs[[...used][0]] : undefined;
      const source = isPristine(only, pages, used.size) ? only.bytes : await buildPdf(docs, pages);
      const out = await encryptPdf(source, {
        userPassword: pw,
        ownerPassword: owner || undefined,
        permissions: { print: !block.print, copy: !block.copy, edit: !block.edit },
      });
      downloadBytes(out, name.filename);
    } catch (e) {
      notify(`Couldn’t add the password: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const toggles: { key: keyof typeof block; label: string }[] = [
    { key: 'print', label: 'Block printing' },
    { key: 'copy', label: 'Block copying text' },
    { key: 'edit', label: 'Block editing' },
  ];

  return (
    <>
      <FileChips />
      <form className="mt-5 grid w-full max-w-xl gap-4" onSubmit={(e) => { e.preventDefault(); void run(); }}>
        <PasswordField id="protect-pw" label="Password" value={pw} onChange={setPw} show={show} onToggle={() => setShow((v) => !v)} hint="Longer is stronger." autoFocus={finePointer()} />
        <PasswordField id="protect-confirm" label="Confirm password" value={confirm} onChange={setConfirm} show={show} invalid={mismatch} hint={mismatch ? 'Passwords don’t match.' : undefined} />

        <fieldset className="grid min-w-0 gap-1 rounded-2xl border border-line bg-card p-2">
          <legend className="px-2 text-sm font-semibold">Also block</legend>
          {toggles.map((t) => (
            <label key={t.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-line">
              <input type="checkbox" className="size-5 accent-[var(--ink)]" checked={block[t.key]} onChange={(e) => setBlock({ ...block, [t.key]: e.target.checked })} />
              <span>{t.label}</span>
            </label>
          ))}
        </fieldset>

        <PasswordField id="protect-owner" label="Owner password" value={owner} onChange={setOwner} show={show} optional hint="Needed to change the blocks later." />

        <p className="flex items-start gap-3 rounded-2xl border border-line bg-card p-3.5 text-sm" role="note">
          <Icon name="lock" className="mt-0.5 size-5 shrink-0" />
          <span><b>If you forget this password, the file can’t be recovered.</b> Foldline never sees or stores it. Keep an unprotected original.</span>
        </p>
        <button type="submit" hidden />
      </form>

      <Dock>
        <DownloadRow
          name={name} label={busy ? 'Encrypting…' : 'Add password and download'}
          icon={busy ? <Icon name="rotate" className="spin size-5" /> : <Icon name="shield" />}
          onDownload={() => void run()} disabled={!ready} className="max-w-md sm:max-w-2xl"
        />
      </Dock>
    </>
  );
}

export default function ProtectTool() {
  return <ToolShell meta={META.protect}><Protector /></ToolShell>;
}
