import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { usePdfStore } from '../../lib/store';
import { buildPdf, downloadBytes, type Crop } from '../../lib/pdf';
import { docKey, pageNames } from '../../lib/filename';
import { useFileName } from '../../lib/useFileName';
import { META } from '../../tools-meta';
import Dock from '../../components/Dock';
import DownloadRow from '../../components/DownloadRow';
import Icon from '../../components/Icon';
import FileChips from '../../components/FileChips';
import PageCanvas from '../../components/PageCanvas';
import ToolShell from '../../components/ToolShell';

type Pt = [number, number];
type Drag =
  | { m: 'new'; p0: Pt }
  | { m: 'move'; p0: Pt; c: Crop }
  | { m: 'resize'; h: string; c: Crop };

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const HANDLES: [string, number, number, string][] = [
  ['nw', 0, 0, 'nwse'], ['n', 50, 0, 'ns'], ['ne', 100, 0, 'nesw'], ['e', 100, 50, 'ew'],
  ['se', 100, 100, 'nwse'], ['s', 50, 100, 'ns'], ['sw', 0, 100, 'nesw'], ['w', 0, 50, 'ew'],
];
const pct = (c: Crop) => ({ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${c.h * 100}%` });

function Cropper() {
  const pages = usePdfStore((s) => s.pages);
  const docs = usePdfStore((s) => s.docs);
  const { setCrop, setCropAll, rotate, notify } = usePdfStore.getState();
  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState(false);
  const [same, setSame] = useState(true);
  const drag = useRef<Drag | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const name = useFileName('crop', pageNames(pages, docs), docKey(pages));

  const index = Math.min(cur, pages.length - 1);
  const page = pages[index];
  const crop = page.crop;

  const point = (e: PointerEvent): Pt => {
    const r = stage.current!.getBoundingClientRect();
    return [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)];
  };

  const onDown = (e: PointerEvent) => {
    const p = point(e);
    const h = (e.target as HTMLElement).dataset.h;
    const inside = crop && p[0] >= crop.x && p[0] <= crop.x + crop.w && p[1] >= crop.y && p[1] <= crop.y + crop.h;
    drag.current = crop && h ? { m: 'resize', h, c: { ...crop } }
      : crop && inside ? { m: 'move', p0: p, c: { ...crop } }
      : { m: 'new', p0: p };
    stage.current!.setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = point(e);
    if (d.m === 'new') {
      setCrop(page.id, { x: Math.min(d.p0[0], p[0]), y: Math.min(d.p0[1], p[1]), w: Math.abs(p[0] - d.p0[0]), h: Math.abs(p[1] - d.p0[1]) });
    } else if (d.m === 'move') {
      setCrop(page.id, {
        ...d.c,
        x: Math.max(0, Math.min(1 - d.c.w, d.c.x + p[0] - d.p0[0])),
        y: Math.max(0, Math.min(1 - d.c.h, d.c.y + p[1] - d.p0[1])),
      });
    } else {
      let l = d.c.x, t = d.c.y, r = d.c.x + d.c.w, b = d.c.y + d.c.h;
      if (d.h.includes('w')) l = p[0];
      if (d.h.includes('e')) r = p[0];
      if (d.h.includes('n')) t = p[1];
      if (d.h.includes('s')) b = p[1];
      setCrop(page.id, { x: Math.min(l, r), y: Math.min(t, b), w: Math.abs(r - l), h: Math.abs(b - t) });
    }
  };

  const onUp = () => {
    const c = usePdfStore.getState().pages[index]?.crop;
    if (drag.current && c && (c.w < 0.03 || c.h < 0.03)) setCrop(page.id, null);
    else if (drag.current && c && same) setCropAll(c); // one box for every page, no extra click
    drag.current = null;
  };

  // Left/Right arrows flip between pages.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === 'ArrowLeft') setCur((i) => Math.max(0, Math.min(i, pages.length - 1) - 1));
      else if (e.key === 'ArrowRight') setCur((i) => Math.min(pages.length - 1, Math.min(i, pages.length - 1) + 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pages.length]);

  const exportPdf = async () => {
    setBusy(true);
    try {
      const bytes = await buildPdf(docs, pages);
      downloadBytes(bytes, name.filename);
    } catch (e) {
      notify(`Export failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <FileChips />
      <div className="sticky top-[61px] z-10 md:top-0 flex flex-wrap items-center gap-2 bg-gradient-to-b from-desk from-80% to-transparent py-3">
        <button className="btn" disabled={index === 0} onClick={() => setCur(index - 1)}><Icon name="left" />Prev</button>
        <span className="px-1.5 text-[13px] text-mute">Page {index + 1} of {pages.length}</span>
        <button className="btn" disabled={index >= pages.length - 1} onClick={() => setCur(index + 1)}>Next<Icon name="right" /></button>
        <button className="btn" onClick={() => rotate([page.id])}><Icon name="rotate" />Rotate</button>
        <span className="flex-1" />
        <label className="flex cursor-pointer items-center gap-2 px-1 text-sm">
          <input type="checkbox" checked={same} onChange={(e) => { setSame(e.target.checked); if (e.target.checked && crop) setCropAll(crop); }} className="size-4 accent-[var(--ink)]" />
          Same crop on every page
        </label>
        <button className="btn" disabled={!crop} onClick={() => (same ? pages.forEach((p) => setCrop(p.id, null)) : setCrop(page.id, null))}>Clear crop</button>
      </div>

      <div
        ref={stage}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative mt-2 w-full max-w-[660px] cursor-crosshair touch-none select-none bg-white shadow-sheet"
      >
        <PageCanvas doc={docs[page.docId]} item={page} width={660} className="pointer-events-none" />
        {crop && (
          <>
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div style={pct(crop)} className="absolute shadow-[0_0_0_9999px_rgba(10,14,20,0.6)]" />
            </div>
            <div style={pct(crop)} className="pointer-events-none absolute border-2 border-hl">
              {HANDLES.map(([h, x, y, cursor]) => (
                <i
                  key={h}
                  data-h={h}
                  style={{ left: `${x}%`, top: `${y}%`, cursor: `${cursor}-resize` }}
                  className="pointer-events-auto absolute size-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-[#14171C] bg-hl"
                />
              ))}
            </div>
          </>
        )}
      </div>
      <p className="mt-3.5 max-w-[62ch] text-[13px] text-mute">
        Drag on the page to draw the area to keep. Drag the box to move it and the dots to resize. Use the left and right arrow keys to change page; untick “Same crop on every page” to crop pages differently. The original content stays in the file; only the visible area changes.
      </p>

      <Dock>
        <DownloadRow
          name={name} label={busy ? 'Building…' : 'Download PDF'} icon={<Icon name="download" />}
          onDownload={() => void exportPdf()} disabled={busy} className="max-w-md sm:max-w-2xl"
        />
      </Dock>
    </>
  );
}

export default function CropTool() {
  return <ToolShell meta={META.crop}><Cropper /></ToolShell>;
}
