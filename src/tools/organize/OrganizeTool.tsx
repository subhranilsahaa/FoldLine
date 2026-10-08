import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePdfStore } from '../../lib/store';
import { buildPdf, downloadBytes, type PageItem, type SourceDoc } from '../../lib/pdf';
import { parseRanges } from '../../lib/ranges';
import { docKey, pageNames, stripPdf } from '../../lib/filename';
import { useFileName } from '../../lib/useFileName';
import { META } from '../../tools-meta';
import Icon from '../../components/Icon';
import Dock from '../../components/Dock';
import DownloadRow from '../../components/DownloadRow';
import FileChips from '../../components/FileChips';
import PageCanvas from '../../components/PageCanvas';
import ToolShell from '../../components/ToolShell';

type Mode = 'merge' | 'organize' | 'extract';

const ACTION: Record<Mode, { label: string; hint: string }> = {
  merge: { label: 'Merge & download', hint: 'Tap to select. Drag the handle to reorder.' },
  organize: { label: 'Download PDF', hint: 'Tap to select. Drag the handle to reorder.' },
  extract: { label: 'Extract pages', hint: 'Tap the pages you want to keep.' },
};

const THUMB = 320;
const COACH_KEY = 'foldline-coach-drag';
const noMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function coachSeen(): boolean {
  try { return localStorage.getItem(COACH_KEY) === '1'; } catch { return false; }
}
function rememberCoach() {
  try { localStorage.setItem(COACH_KEY, '1'); } catch { /* storage blocked: it just shows again next visit */ }
}

interface CardProps {
  page: PageItem;
  /** 1-based place in the output */
  position: number;
  total: number;
  /** index in the grid, drives the entrance stagger */
  order: number;
  /** color slot and short name of the source file; null when only one file is loaded */
  file: { slot: number; name: string } | null;
  dim: boolean;
  insert: 'left' | 'right' | null;
  settle: boolean;
}

/**
 * One page. The thumbnail toggles selection; the grip below it is the only drag target, so
 * touch scrolling and tapping on the card body never fight the drag gesture.
 */
const PageCard = memo(function PageCard({ page, position, total, order, file, dim, insert, settle }: CardProps) {
  const doc = usePdfStore((s) => s.docs[page.docId]);
  const selected = usePdfStore((s) => s.selected.has(page.id));
  const leaving = usePdfStore((s) => s.leaving.has(page.id));
  const toggle = usePdfStore((s) => s.toggle);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });

  // Animated turn: whenever the rotation changes, the thumbnail swings into place.
  const thumb = useRef<HTMLButtonElement>(null);
  const prevRot = useRef(page.rot);
  useEffect(() => {
    if (prevRot.current === page.rot) return;
    prevRot.current = page.rot;
    if (noMotion()) return;
    thumb.current?.animate(
      [{ transform: 'rotate(-90deg) scale(.86)', opacity: 0.5 }, { transform: 'none', opacity: 1 }],
      { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
  }, [page.rot]);

  // Small spring after a drop.
  useEffect(() => {
    if (!settle || noMotion()) return;
    thumb.current?.animate(
      [{ transform: 'scale(1.07)' }, { transform: 'scale(1)' }],
      { duration: 240, easing: 'cubic-bezier(.34,1.56,.64,1)' },
    );
  }, [settle]);

  const label = `Page ${page.srcIndex}${file ? ` of ${file.name}` : ''} (position ${position} of ${total})`;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging ? 'z-10 opacity-40' : ''} ${dim ? 'opacity-40' : ''}`}
    >
      {insert && <span aria-hidden="true" className={`insert-bar ${insert === 'left' ? '-left-[9px]' : '-right-[9px]'}`} />}
      <div className={`page-in ${leaving ? 'page-leave' : ''}`} style={{ '--i': order } as CSSProperties}>
        <button
          ref={thumb} type="button" onClick={() => toggle(page.id)}
          aria-pressed={selected} aria-label={label}
          className={`relative block w-full overflow-hidden rounded-xl bg-white shadow-sheet ${selected ? 'ring-[3px] ring-ink' : ''}`}
        >
          <PageCanvas doc={doc} item={page} width={THUMB} lazy className="pointer-events-none min-h-24" />
          {file && (
            <span className="absolute bottom-1.5 left-1.5 inline-flex max-w-[70%] items-center gap-1 rounded-full bg-card/95 py-0.5 pl-1.5 pr-2 text-[11px] font-medium text-ink shadow-sm">
              <i aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: `var(--f${file.slot % 6})` }} />
              <span className="truncate">{file.name}</span>
            </span>
          )}
          {selected && <span aria-hidden="true" className="fold-corner"><Icon name="check" className="" /></span>}
        </button>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="h-display text-2xl leading-none" aria-hidden="true">{page.srcIndex}</span>
          <span className="rounded-md border border-line px-1.5 py-px text-[12px] font-medium text-mute" aria-hidden="true">#{position}</span>
          {page.crop && <span className="rounded-md bg-line px-1.5 py-px text-[11px] font-medium">Cropped</span>}
          <span className="flex-1" />
          <button
            ref={setActivatorNodeRef} {...attributes} {...listeners}
            aria-label={`Reorder page ${page.srcIndex}, position ${position}. Press space, then the arrow keys.`}
            className="handle ib select-none [-webkit-touch-callout:none]"
          >
            <Icon name="grip" />
          </button>
        </div>
      </div>
    </div>
  );
});

function Organizer({ mode }: { mode: Mode }) {
  const act = ACTION[mode];
  const pages = usePdfStore((s) => s.pages);
  const selected = usePdfStore((s) => s.selected);
  const docs = usePdfStore((s) => s.docs);
  const { reorderGroup, selectAll, clearSelection, rotate, removeAnimated, moveSelection, setExportIds, notify } = usePdfStore.getState();
  const [busy, setBusy] = useState(false);
  const n = selected.size;
  const extract = mode === 'extract';
  // The name follows the first file in the current page order (for Extract: of the selected pages, once there are some).
  const namePages = extract && n > 0 ? pages.filter((p) => selected.has(p.id)) : pages;
  const name = useFileName(mode, pageNames(namePages, docs), docKey(pages));
  const [range, setRange] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const [coach, setCoach] = useState(() => !coachSeen());
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const used = new Set(pages.map((p) => p.docId));
  const present = Object.values(docs).filter((d) => used.has(d.id));
  const slotOf = new Map<string, number>(present.map((d, i) => [d.id, i] as [string, number]));
  const multi = present.length > 1;
  const shortName = (d: SourceDoc) => stripPdf(d.name);

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(); }
      else if (e.metaKey || e.ctrlKey || e.altKey) return;
      else if (e.key === 'Escape') clearSelection();
      else if (!extract && e.key.toLowerCase() === 'r' && usePdfStore.getState().selected.size) rotate();
      else if ((e.key === 'Delete' || e.key === 'Backspace') && usePdfStore.getState().selected.size) { e.preventDefault(); removeAnimated(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [extract, selectAll, clearSelection, rotate, removeAnimated]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const applyRange = (quiet = false) => {
    const nums = parseRanges(range, pages.length);
    if (!nums) return quiet ? undefined : notify(`Enter pages between 1 and ${pages.length}, like 1-3, 7.`);
    usePdfStore.setState({ selected: new Set(nums.map((k) => pages[k - 1].id)) });
  };

  // One pointer sensor (distance 4px) on the grip only: touch-action is none there, so the sensor
  // gets touch moves as pointer events while the rest of the card still scrolls the page.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const groupIds = activeId && selected.has(activeId) && selected.size > 1 ? selected : activeId ? new Set([activeId]) : new Set<string>();
  const onDragStart = ({ active }: DragStartEvent) => { setActiveId(String(active.id)); setOverId(String(active.id)); };
  const onDragOver = ({ over }: DragOverEvent) => setOverId(over ? String(over.id) : null);
  const endDrag = () => { setActiveId(null); setOverId(null); };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const moved = new Set(groupIds);
    endDrag();
    if (coach) { setCoach(false); rememberCoach(); }
    if (!over || active.id === over.id) return;
    reorderGroup(String(active.id), String(over.id));
    setSettled(moved);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setSettled(new Set()), 400);
  };

  const activeIndex = activeId ? pages.findIndex((p) => p.id === activeId) : -1;
  const overIndex = overId ? pages.findIndex((p) => p.id === overId) : -1;
  const activePage = activeIndex >= 0 ? pages[activeIndex] : null;

  const run = async () => {
    const list = extract ? pages.filter((p) => selected.has(p.id)) : pages;
    if (!list.length) return notify('Select at least one page first.');
    setBusy(true);
    try {
      const bytes = await buildPdf(docs, list);
      setExportIds(extract ? list.map((p) => p.id) : null);
      downloadBytes(bytes, name.filename);
    } catch (e) {
      notify(`Export failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const plural = (k: number) => `${k} ${k === 1 ? 'page' : 'pages'}`;
  const primary = busy ? 'Building…'
    : extract ? (n ? `Extract ${plural(n)}` : 'Choose pages to extract')
    : `${act.label} · ${plural(pages.length)}`;

  const bar = n > 0 && (
    <div role="toolbar" aria-label="Selected pages" className="dock-bar mx-auto flex w-full max-w-md items-center rounded-2xl border border-line bg-card p-1 shadow-sheet">
      <button className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold hover:bg-line" onClick={clearSelection} aria-label={`${n} selected. Clear selection`}>
        <span className="h-display text-lg">{n}</span>selected<Icon name="x" className="size-3.5 text-mute" />
      </button>
      <span className="flex-1" />
      <button className="ib" aria-label="Select all pages" title="Select all" onClick={selectAll} disabled={n === pages.length}><Icon name="selectAll" /></button>
      <button className="ib" aria-label="Move selected earlier" title="Move earlier" onClick={() => moveSelection(-1)}><Icon name="left" /></button>
      <button className="ib" aria-label="Move selected later" title="Move later" onClick={() => moveSelection(1)}><Icon name="right" /></button>
      {!extract && <button className="ib" aria-label="Rotate selected" title="Rotate" onClick={() => rotate()}><Icon name="rotate" /></button>}
      <button className="ib text-danger hover:text-danger" aria-label="Delete selected pages" title="Delete" onClick={() => removeAnimated()}><Icon name="trash" /></button>
    </div>
  );

  return (
    <>
      <FileChips />
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm text-mute"><b className="h-display text-lg text-ink">{pages.length}</b> {pages.length === 1 ? 'page' : 'pages'}. {act.hint}</span>
        <span className="flex-1" />
        {extract && (
          <input
            aria-label="Pages to select, for example 1-3, 7" placeholder="Pages: 1-3, 7" value={range}
            onChange={(e) => setRange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyRange(); } }}
            onBlur={() => { if (range.trim()) applyRange(true); }}
            className="fld w-40 text-sm"
          />
        )}
        {n < pages.length && <button className="btn" onClick={selectAll}>Select all</button>}
      </div>
      <p className="mt-1 text-xs text-mute max-md:hidden">Keys: Ctrl/⌘+A select all, R rotate, Delete remove, Esc clear.</p>

      {coach && pages.length > 1 && (
        <div className="pop-in mt-3 flex items-center gap-3 rounded-2xl border border-line bg-card py-1 pl-3.5 pr-1.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-line"><Icon name="grip" /></span>
          <p className="flex-1 text-sm font-medium">Drag the handle to reorder.</p>
          <button className="btn" onClick={() => { setCoach(false); rememberCoach(); }}>Got it</button>
        </div>
      )}

      <DndContext
        sensors={sensors} collisionDetection={closestCenter}
        autoScroll={{ threshold: { x: 0.15, y: 0.22 }, acceleration: 14 }}
        onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={endDrag}
      >
        <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="mt-4 grid grid-cols-2 gap-x-3.5 gap-y-5 sm:grid-cols-3 md:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] md:gap-x-[18px]">
            {pages.map((p, i) => {
              const d = docs[p.docId];
              const insert = overId === p.id && activeId && activeId !== p.id && !groupIds.has(p.id)
                ? (overIndex > activeIndex ? 'right' : 'left') : null;
              return (
                <PageCard
                  key={p.id} page={p} position={i + 1} total={pages.length} order={i}
                  file={multi ? { slot: slotOf.get(p.docId) ?? 0, name: shortName(d) } : null}
                  dim={groupIds.size > 1 && groupIds.has(p.id) && p.id !== activeId}
                  insert={insert} settle={settled.has(p.id)}
                />
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(.34,1.56,.64,1)' }}>
          {activePage && docs[activePage.docId] ? (
            <div className="relative -rotate-2 scale-105">
              <div className="overflow-hidden rounded-xl bg-white shadow-[0_18px_40px_-8px_rgba(0,0,0,.45)] ring-[3px] ring-ink">
                <PageCanvas doc={docs[activePage.docId]} item={activePage} width={THUMB} />
              </div>
              {groupIds.size > 1 && (
                <span className="h-display absolute -right-2 -top-2 grid min-h-8 min-w-8 place-items-center rounded-full bg-ink px-2 text-base text-desk shadow-sheet">{groupIds.size}</span>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dock bar={bar || undefined}>
        <DownloadRow
          name={name} label={primary} icon={<Icon name="download" />}
          onDownload={() => void run()} disabled={busy || (extract && n === 0)}
          className="max-w-md sm:max-w-2xl"
        />
      </Dock>
    </>
  );
}

const make = (mode: Mode) => function Tool() {
  return <ToolShell meta={META[mode]}><Organizer mode={mode} /></ToolShell>;
};

export const MergeTool = make('merge');
export const OrganizeTool = make('organize');
export const ExtractTool = make('extract');
