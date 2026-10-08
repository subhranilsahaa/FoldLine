import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DOWNLOAD_EVENT } from '../lib/pdf';
import { usePdfStore } from '../lib/store';
import { NEXT_STEP, normalizePath } from '../content';
import { META } from '../tools-meta';
import Icon from './Icon';

/**
 * Success state after any download. Every tool saves through downloadBytes, which fires an event,
 * so this one card covers them all and suggests a sensible next tool for the page you are on.
 */
export default function DoneCard() {
  const { pathname } = useLocation();
  const [file, setFile] = useState<string | null>(null);
  const applyExport = usePdfStore((s) => s.applyExport);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = (e: Event) => setFile((e as CustomEvent<{ filename: string }>).detail.filename);
    window.addEventListener(DOWNLOAD_EVENT, on);
    return () => window.removeEventListener(DOWNLOAD_EVENT, on);
  }, []);
  useEffect(() => { setFile(null); }, [pathname]);

  // Publish the card's height as --done-h so toasts stack above it and the page can scroll clear of it.
  useEffect(() => {
    const el = card.current;
    const root = document.documentElement;
    if (!file || !el) return;
    const set = () => root.style.setProperty('--done-h', `${el.offsetHeight + 12}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.removeProperty('--done-h'); };
  }, [file]);

  if (!file) return null;
  const tool = Object.values(META).find((m) => m.path === normalizePath(pathname));
  const next = tool ? NEXT_STEP[tool.id as keyof typeof META] : null;

  return (
    <div ref={card} role="status" className="pop-in fixed inset-x-3 bottom-[calc(var(--dock-h,0px)+.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-[20px] border border-line bg-card p-4 shadow-sheet md:left-[252px]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-desk"><Icon name="check" className="size-5 stroke-[3]" /></span>
        <div className="min-w-0 flex-1">
          <p className="h-display text-lg">Done. Saved to your device.</p>
          <p className="truncate text-sm text-mute" title={file}>{file}</p>
          <p className="text-sm text-mute">Nothing was uploaded.</p>
        </div>
        <button className="ib -mr-2 -mt-2" aria-label="Dismiss" onClick={() => setFile(null)}><Icon name="x" className="size-4" /></button>
      </div>
      {next && (
        <Link to={META[next.id].path} onClick={() => { applyExport(); setFile(null); }} className="btn mt-3 w-full justify-between">
          {next.ask}<Icon name="arrow" />
        </Link>
      )}
    </div>
  );
}
