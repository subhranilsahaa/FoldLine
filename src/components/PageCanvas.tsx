import { useEffect, useRef, useState } from 'react';
import type { RenderTask } from 'pdfjs-dist';
import { startRender, totalRotation, type PageItem, type SourceDoc } from '../lib/pdf';

interface Props {
  doc: SourceDoc;
  item: PageItem;
  /** render resolution in CSS px; the canvas itself scales to its container */
  width: number;
  /** only render once scrolled near the viewport */
  lazy?: boolean;
  className?: string;
}

export default function PageCanvas({ doc, item, width, lazy = false, className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(!lazy);
  const rotation = totalRotation(item);

  useEffect(() => {
    const el = ref.current;
    if (!lazy || !el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [lazy]);

  useEffect(() => {
    if (!visible) return;
    let dead = false;
    let task: RenderTask | undefined;
    (async () => {
      try {
        const r = await startRender(doc, item.index, rotation, width);
        task = r.task;
        await task.promise;
        const el = ref.current;
        if (dead || !el) return;
        el.width = r.canvas.width;
        el.height = r.canvas.height;
        el.getContext('2d')!.drawImage(r.canvas, 0, 0);
      } catch {
        /* cancelled or page failed to render */
      }
    })();
    return () => { dead = true; task?.cancel(); };
  }, [visible, doc, item.index, rotation, width]);

  return <canvas ref={ref} className={`block h-auto w-full bg-white ${className}`} />;
}
