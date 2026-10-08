import { useEffect } from 'react';
import { UNDO_MS, usePdfStore } from '../lib/store';

/** Bottom toasts: short messages and errors, plus the 5-second Undo toast after delete, rotate and add. */
export default function Notice() {
  const notice = usePdfStore((s) => s.notice);
  const notify = usePdfStore((s) => s.notify);
  const undoEntry = usePdfStore((s) => s.undoEntry);
  const undo = usePdfStore((s) => s.undo);
  const dismissUndo = usePdfStore((s) => s.dismissUndo);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => notify(null), 4000);
    return () => clearTimeout(t);
  }, [notice, notify]);

  const undoId = undoEntry?.id;
  useEffect(() => {
    if (undoId === undefined) return;
    const t = setTimeout(dismissUndo, UNDO_MS);
    return () => clearTimeout(t);
  }, [undoId, dismissUndo]);

  if (!notice && !undoEntry) return null;
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--dock-h,0px)+var(--done-h,0px)+1rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md flex-col gap-2 md:left-[252px]">
      {notice && (
        <div role="status" className="toast-in pointer-events-auto rounded-2xl bg-ink px-4 py-3 text-sm text-desk shadow-sheet">
          {notice}
        </div>
      )}
      {undoEntry && (
        <div key={undoEntry.id} role="status" className="toast-in pointer-events-auto relative overflow-hidden rounded-2xl bg-ink pl-4 text-desk shadow-sheet">
          <div className="flex items-center justify-between gap-3">
            <span className="py-3 text-sm font-medium">{undoEntry.label}</span>
            <button className="min-h-11 min-w-11 px-4 text-sm font-semibold underline underline-offset-4" onClick={undo}>Undo</button>
          </div>
          <span aria-hidden="true" className="toast-timer absolute inset-x-0 bottom-0 h-[3px] bg-desk/60" />
        </div>
      )}
    </div>
  );
}
