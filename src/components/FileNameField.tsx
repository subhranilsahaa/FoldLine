import { useId } from 'react';
import type { FileNameState } from '../lib/useFileName';

/**
 * Editable output name with ".pdf" shown as a fixed ending, a visible label and a small
 * "Reset to suggested" button. Enter runs `onEnter` (the download).
 */
export default function FileNameField({ name, onEnter, disabled }: { name: FileNameState; onEnter?: () => void; disabled?: boolean }) {
  const id = useId();
  const hintId = `${id}-hint`;
  // Shown only when what gets saved differs from what is typed (illegal characters, a typed ".pdf", a very long name).
  const adjusted = name.filename !== `${name.stem}.pdf`;

  return (
    <div className="w-full min-w-0 sm:flex-1 sm:basis-60">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="min-w-0 text-[13px] font-semibold">
          File name<span className="sr-only"> (the .pdf ending is added for you)</span>
        </label>
        <button
          type="button" onClick={name.reset} disabled={!name.edited}
          className="-my-2 min-h-11 shrink-0 rounded-lg px-2 text-[13px] font-medium text-mute underline underline-offset-2 hover:text-ink disabled:no-underline disabled:opacity-45"
        >
          {name.auto ? 'Reset to suggested' : 'Reset to original'}
        </button>
      </div>
      <div className="fld mt-1 flex items-center p-0 focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[#2F6BFF]">
        <input
          id={id} type="text" value={name.stem} disabled={disabled}
          onChange={(e) => name.setStem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.repeat || e.nativeEvent.isComposing) return;
            e.preventDefault();
            onEnter?.();
          }}
          placeholder="document" enterKeyHint="go"
          name="output-file-name" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other"
          aria-describedby={adjusted ? hintId : undefined}
          className="min-h-11 min-w-0 flex-1 bg-transparent py-2 pl-3.5 pr-1 text-base text-ink outline-none placeholder:text-mute"
        />
        <span aria-hidden="true" className="shrink-0 pr-3.5 text-base text-mute">.pdf</span>
      </div>
      {adjusted && <p id={hintId} className="mt-1 break-all text-xs text-mute">Saves as {name.filename}</p>}
    </div>
  );
}
