import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePdfStore } from '../lib/store';
import Icon from './Icon';

/**
 * Asks for the password of a protected PDF as soon as it is opened, in any tool.
 * Enter submits, Esc skips the file. Several protected files are asked one after another.
 */
export default function PasswordPrompt() {
  const item = usePdfStore((s) => s.pending[0]);
  const more = usePdfStore((s) => s.pending.length - 1);
  const unlocking = usePdfStore((s) => s.unlocking);
  const { submitPassword, skipPassword } = usePdfStore.getState();
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const key = item?.key;
  const wrong = item?.wrong;

  useEffect(() => { setValue(''); }, [key]);
  useEffect(() => { if (key && !unlocking) input.current?.focus(); }, [key, unlocking, wrong]);
  useEffect(() => {
    if (!key) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') skipPassword(key); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [key, skipPassword]);

  // While the dialog is open the page behind it can't be tabbed into or scrolled, so the rename field,
  // the dock and the tool controls can't compete with it for focus.
  useEffect(() => {
    if (!key) return;
    const behind = Array.from(document.querySelectorAll<HTMLElement>('#root header, #root nav, #root main'));
    behind.forEach((el) => el.setAttribute('inert', ''));
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      behind.forEach((el) => el.removeAttribute('inert'));
      document.documentElement.style.overflow = prev;
    };
  }, [key !== undefined]);

  if (!item) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value && !unlocking) void submitPassword(item.key, value);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4" role="presentation">
      <form
        onSubmit={submit}
        role="dialog" aria-modal="true" aria-labelledby="pw-title"
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 shadow-sheet max-h-full overflow-y-auto"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-hl text-hl-ink"><Icon name="lock" /></span>
          <div className="min-w-0">
            <h2 id="pw-title" className="font-display text-xl font-bold leading-tight">This PDF has a password</h2>
            <p className="truncate text-sm text-mute" title={item.name}>{item.name}{more > 0 && ` · ${more} more waiting`}</p>
          </div>
        </div>
        <label htmlFor="pw" className="mt-4 block text-sm font-medium">Password</label>
        <input
          id="pw" ref={input} type="password" autoComplete="off" value={value} disabled={unlocking}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={item.wrong} aria-describedby={item.wrong ? 'pw-err' : undefined}
          className="fld mt-1 w-full"
        />
        {item.wrong && <p id="pw-err" role="alert" className="mt-2 text-sm text-danger">That password didn’t work. Check it and try again.</p>}
        <div className="mt-4 flex gap-2">
          <button type="submit" className="btn btn-hl btn-lg flex-1" disabled={!value || unlocking}>
            <Icon name="unlock" />{unlocking ? 'Unlocking…' : 'Unlock'}
          </button>
          <button type="button" className="btn btn-lg" onClick={() => skipPassword(item.key)} disabled={unlocking}>Skip</button>
        </div>
        <p className="mt-3 text-xs text-mute">The password is used on this device only to open the file. Nothing is uploaded.</p>
      </form>
    </div>
  );
}
