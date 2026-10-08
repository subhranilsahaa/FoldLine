import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Sticky bottom area in the thumb zone: an optional action bar above one big primary button.
 * It publishes its height as --dock-h so toasts and page padding can stay clear of it.
 */
export default function Dock({ bar, children }: { bar?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const set = () => root.style.setProperty('--dock-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.removeProperty('--dock-h'); };
  }, []);
  return (
    <div ref={ref} className="dock">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {bar}
        <div className="flex justify-center">{children}</div>
      </div>
    </div>
  );
}
