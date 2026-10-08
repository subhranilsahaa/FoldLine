import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { usePdfStore } from '../../lib/store';
import { buildPdf, downloadBytes, startRender, totalRotation, type Crop, type PageItem, type SourceDoc } from '../../lib/pdf';
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
const MIN = 0.03; // smallest box edge, as a fraction of the page
const EDGES: [string, string, string][] = [
  ['n', 'left-0 right-0 top-0 h-6 -translate-y-1/2', 'ns-resize'], ['s', 'left-0 right-0 bottom-0 h-6 translate-y-1/2', 'ns-resize'],
  ['w', 'top-0 bottom-0 left-0 w-6 -translate-x-1/2', 'ew-resize'], ['e', 'top-0 bottom-0 right-0 w-6 translate-x-1/2', 'ew-resize'],
];
const pct = (c: Crop) => ({ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${c.h * 100}%` });

interface Bounds { l: number; t: number; r: number; b: number }

/** Bounding box (as page fractions) of everything that isn't blank paper, found by scanning a small render of the page. */
async function contentBounds(doc: SourceDoc, item: PageItem): Promise<Bounds | null> {
  const { canvas, task } = await startRender(doc, item.index, totalRotation(item), 400);
  await task.promise;
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d')!.getImageData(0, 0, w, h).data;
  let l = w, t = h, r = -1, b = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 20 && (d[i] < 238 || d[i + 1] < 238 || d[i + 2] < 238)) {
        if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y;
      }
    }
  }
  return r < 0 ? null : { l: l / w, t: t / h, r: (r + 1) / w, b: (b + 1) / h };
}

function Cropper() {
  const pages = usePdfStore((s) => s.pages);
  const docs = usePdfStore((s) => s.docs);
  const { setCrop, setCropAll, rotate, notify } = usePdfStore.getState();
  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState(false);
  const [same, setSame] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const coarse = useRef(typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches).current;
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
    const h = (e.target as HTMLElement).closest<HTMLElement>('[data-h]')?.dataset.h;
    const inside = crop && p[0] >= crop.x && p[0] <= crop.x + crop.w && p[1] >= crop.y && p[1] <= crop.y + crop.h;
    // A finger on empty page area scrolls the page instead of drawing (use "Add crop box" / "Auto-trim" on touch).
    if (e.pointerType === 'touch' && !h && !inside) return;
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
      // ignore tiny jitters so a plain click doesn't replace the existing box
      if (Math.abs(p[0] - d.p0[0]) < 0.012 && Math.abs(p[1] - d.p0[1]) < 0.012) return;
      setCrop(page.id, { x: Math.min(d.p0[0], p[0]), y: Math.min(d.p0[1], p[1]), w: Math.abs(p[0] - d.p0[0]), h: Math.abs(p[1] - d.p0[1]) });
    } else if (d.m === 'move') {
      setCrop(page.id, {
        ...d.c,
        x: Math.max(0, Math.min(1 - d.c.w, d.c.x + p[0] - d.p0[0])),
        y: Math.max(0, Math.min(1 - d.c.h, d.c.y + p[1] - d.p0[1])),
      });
    } else {
      // edges stop at a minimum size instead of flipping over or vanishing
      let l = d.c.x, t = d.c.y, r = d.c.x + d.c.w, b = d.c.y + d.c.h;
      if (d.h.includes('w')) l = Math.min(p[0], r - MIN);
      if (d.h.includes('e')) r = Math.max(p[0], l + MIN);
      if (d.h.includes('n')) t = Math.min(p[1], b - MIN);
      if (d.h.includes('s')) b = Math.max(p[1], t + MIN);
      setCrop(page.id, { x: l, y: t, w: r - l, h: b - t });
    }
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const c = usePdfStore.getState().pages[index]?.crop;
    if (!c) return;
    if (d.m === 'new' && (c.w < MIN || c.h < MIN)) setCrop(page.id, null);
    else if (same) setCropAll(c); // one box for every page, no extra click
  };

  const apply = (c: Crop) => (same ? setCropAll(c) : setCrop(page.id, c));
  const addBox = () => apply({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });

  // Finds the printed area and crops to it (union over all pages when "same crop" is on).
  const autoTrim = async () => {
    setDetecting(true);
    try {
      const targets = same && pages.length <= 40 ? pages : [page];
      let u: Bounds | null = null;
      for (const p of targets) {
        const b = await contentBounds(docs[p.docId], p);
        if (b) u = u ? { l: Math.min(u.l, b.l), t: Math.min(u.t, b.t), r: Math.max(u.r, b.r), b: Math.max(u.b, b.b) } : b;
      }
      if (!u) { notify('Nothing to trim: the page looks blank.'); return; }
      const padX = 0.02, padY = 0.02;
      const x = clamp(u.l - padX), y = clamp(u.t - padY);
      const c = { x, y, w: clamp(u.r + padX) - x, h: clamp(u.b + padY) - y };
      if (c.w > 0.96 && c.h > 0.96) { notify('Margins are already tight, nothing to trim.'); return; }
      apply(c);
    } catch (e) {
      notify(`Auto-trim failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setDetecting(false);
    }
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
        <button className="btn" disabled={detecting} onClick={() => void autoTrim()}><Icon name="crop" />{detecting ? 'Detecting…' : 'Auto-trim margins'}</button>
        {!crop && <button className="btn" onClick={addBox}><Icon name="plus" />Add crop box</button>}
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
        className="relative mt-2 w-full max-w-[660px] cursor-crosshair touch-pan-y select-none bg-white shadow-sheet"
      >
        <PageCanvas doc={docs[page.docId]} item={page} width={660} className="pointer-events-none" />
        {!crop && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-4">
            <span className="rounded-full bg-[#14171C]/85 px-4 py-2 text-center text-sm font-medium text-white">
              {coarse ? 'Tap “Add crop box” or “Auto-trim margins”' : 'Drag on the page to choose the area to keep'}
            </span>
          </div>
        )}
        {crop && (
          <>
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div style={pct(crop)} className="absolute shadow-[0_0_0_9999px_rgba(10,14,20,0.6)]" />
            </div>
            <div style={pct(crop)} className="pointer-events-auto absolute cursor-move touch-none border-2 border-hl">
              {EDGES.map(([h, pos, cursor]) => (
                <i key={h} data-h={h} style={{ cursor }} className={`absolute touch-none ${pos}`} />
              ))}
              {HANDLES.map(([h, x, y, cursor]) => (
                <i
                  key={h}
                  data-h={h}
                  style={{ left: `${x}%`, top: `${y}%`, cursor: `${cursor}-resize` }}
                  className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center"
                >
                  <b className="size-5 rounded-full border-2 border-[#14171C] bg-hl shadow" />
                </i>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="mt-3.5 max-w-[62ch] text-[13px] text-mute">
        {coarse ? 'Drag the box to move it and the dots or edges to resize.' : 'Drag on the page to draw a box. Drag inside it to move, or pull the dots and edges to resize.'} Arrow keys change page; untick “Same crop on every page” to crop pages differently. The original content stays in the file; only the visible area changes.
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
