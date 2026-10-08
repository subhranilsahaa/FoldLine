import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import { loadPdfBytes, type Crop, type PageItem, type SourceDoc } from './pdf';
import { PasswordRequired } from './unlock';

/** A file that is waiting for its password. */
export interface PendingFile { key: string; name: string; bytes: Uint8Array; wrong: boolean }

/** A one-step undo: the page list (and selection) as it was before the last change. */
export interface UndoEntry { id: number; label: string; pages: PageItem[]; selected: Set<string> }

export const UNDO_MS = 5000;
export const LEAVE_MS = 200;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let undoSeq = 0;

/** Moves the selected pages one step earlier (-1) or later (1), keeping their relative order. */
export function shiftSelection(pages: PageItem[], selected: Set<string>, delta: -1 | 1): PageItem[] {
  const out = pages.slice();
  const swap = (i: number, j: number) => { [out[i], out[j]] = [out[j], out[i]]; };
  if (delta < 0) {
    for (let i = 1; i < out.length; i++) if (selected.has(out[i].id) && !selected.has(out[i - 1].id)) swap(i, i - 1);
  } else {
    for (let i = out.length - 2; i >= 0; i--) if (selected.has(out[i].id) && !selected.has(out[i + 1].id)) swap(i, i + 1);
  }
  return out;
}

/**
 * Drops the dragged pages (the whole selection when the dragged page is part of a multi-selection)
 * at the position of `overId`, keeping their relative order.
 */
export function moveGroup(pages: PageItem[], activeId: string, overId: string, selected: Set<string>): PageItem[] {
  const group = selected.has(activeId) && selected.size > 1 ? pages.filter((p) => selected.has(p.id)) : pages.filter((p) => p.id === activeId);
  const ids = new Set(group.map((p) => p.id));
  if (ids.has(overId) && group.length > 1) return pages; // dropped onto itself
  const from = pages.findIndex((p) => p.id === activeId);
  const to = pages.findIndex((p) => p.id === overId);
  if (from < 0 || to < 0) return pages;
  if (group.length === 1) return arrayMove(pages, from, to);
  const rest = pages.filter((p) => !ids.has(p.id));
  // Land before the target when dragging up, after it when dragging down (same feel as a single page).
  const target = rest.findIndex((p) => p.id === overId);
  const at = to > from ? target + 1 : target;
  return [...rest.slice(0, at), ...group, ...rest.slice(at)];
}

interface State {
  docs: Record<string, SourceDoc>;
  pages: PageItem[];
  selected: Set<string>;
  notice: string | null;
  loading: boolean;
  /** files waiting for a password; the first one is shown in the prompt */
  pending: PendingFile[];
  unlocking: boolean;
  undoEntry: UndoEntry | null;
  /** ids of pages sliding out before they are deleted */
  leaving: Set<string>;
  /** pages of the last export when only a selection was saved (Extract), so a follow-up tool can pick them up */
  exportIds: string[] | null;
  notify: (message: string | null) => void;
  undo: () => void;
  dismissUndo: () => void;
  setExportIds: (ids: string[] | null) => void;
  /** Keeps only the pages of the last export. */
  applyExport: () => void;
  moveSelection: (delta: -1 | 1) => void;
  reorderGroup: (activeId: string, overId: string) => void;
  /** Slides the pages away, then deletes them. */
  removeAnimated: (ids?: string[]) => void;
  addFiles: (files: FileList | File[]) => Promise<void>;
  submitPassword: (key: string, password: string) => Promise<void>;
  skipPassword: (key: string) => void;
  reorder: (activeId: string, overId: string) => void;
  move: (id: string, delta: number) => void;
  toggle: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  /** Rotates the given pages, or the selection when ids is omitted. */
  rotate: (ids?: string[]) => void;
  remove: (ids?: string[]) => void;
  removeDoc: (docId: string) => void;
  setCrop: (id: string, crop: Crop | null) => void;
  setCropAll: (crop: Crop) => void;
  reset: () => void;
}

export const usePdfStore = create<State>((set, get) => ({
  docs: {},
  pages: [],
  selected: new Set(),
  notice: null,
  loading: false,
  pending: [],
  unlocking: false,
  undoEntry: null,
  leaving: new Set(),
  exportIds: null,

  notify: (notice) => set({ notice }),
  setExportIds: (exportIds) => set({ exportIds }),
  applyExport: () => set((s) => {
    if (!s.exportIds) return s;
    const keep = new Set(s.exportIds);
    return { pages: s.pages.filter((p) => keep.has(p.id)), selected: new Set(), exportIds: null };
  }),

  undo: () => {
    const u = get().undoEntry;
    if (u) set({ pages: u.pages, selected: u.selected, undoEntry: null, leaving: new Set() });
  },
  dismissUndo: () => set({ undoEntry: null }),

  addFiles: async (files) => {
    const list = Array.from(files).filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (!list.length) return set({ notice: 'Choose PDF files.' });
    const before = get().pages;
    set({ loading: true });
    for (const file of list) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      try {
        const { doc, pages } = await loadPdfBytes(file.name, bytes);
        set((s) => ({ docs: { ...s.docs, [doc.id]: doc }, pages: [...s.pages, ...pages] }));
      } catch (e) {
        if (e instanceof PasswordRequired) {
          // Ask for the password instead of failing; the file joins the queue.
          set((s) => ({ pending: [...s.pending, { key: crypto.randomUUID(), name: file.name, bytes, wrong: false }] }));
        } else {
          set({ notice: `Couldn't open ${file.name}. It may be damaged.` });
        }
      }
    }
    set({ loading: false });
    const added = get().pages.length - before.length;
    if (before.length > 0 && added > 0) {
      set({ undoEntry: { id: ++undoSeq, label: `Added ${added} ${added === 1 ? 'page' : 'pages'}`, pages: before, selected: get().selected } });
    }
  },

  submitPassword: async (key, password) => {
    const item = get().pending.find((p) => p.key === key);
    if (!item || get().unlocking) return;
    set({ unlocking: true });
    try {
      const { doc, pages } = await loadPdfBytes(item.name, item.bytes, password);
      set((s) => ({
        docs: { ...s.docs, [doc.id]: doc },
        pages: [...s.pages, ...pages],
        pending: s.pending.filter((p) => p.key !== key),
      }));
    } catch (e) {
      if (e instanceof PasswordRequired) {
        set((s) => ({ pending: s.pending.map((p) => (p.key === key ? { ...p, wrong: true } : p)) }));
      } else {
        set((s) => ({ pending: s.pending.filter((p) => p.key !== key), notice: `Couldn't open ${item.name}. It may be damaged.` }));
      }
    } finally {
      set({ unlocking: false });
    }
  },

  skipPassword: (key) => set((s) => ({ pending: s.pending.filter((p) => p.key !== key) })),

  reorder: (activeId, overId) =>
    set((s) => {
      const from = s.pages.findIndex((p) => p.id === activeId);
      const to = s.pages.findIndex((p) => p.id === overId);
      return from < 0 || to < 0 ? s : { pages: arrayMove(s.pages, from, to) };
    }),

  reorderGroup: (activeId, overId) =>
    set((s) => ({ pages: moveGroup(s.pages, activeId, overId, s.selected) })),

  moveSelection: (delta) =>
    set((s) => ({ pages: shiftSelection(s.pages, s.selected, delta) })),

  move: (id, delta) =>
    set((s) => {
      const from = s.pages.findIndex((p) => p.id === id);
      const to = from + delta;
      return from < 0 || to < 0 || to >= s.pages.length ? s : { pages: arrayMove(s.pages, from, to) };
    }),

  toggle: (id) =>
    set((s) => {
      const next = new Set(s.selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selected: next };
    }),

  selectAll: () => set((s) => ({ selected: new Set(s.pages.map((p) => p.id)) })),
  clearSelection: () => set({ selected: new Set() }),

  rotate: (ids) => {
    const target = new Set(ids ?? get().selected);
    if (!target.size) return set({ notice: 'Select pages to rotate.' });
    set((s) => ({
      pages: s.pages.map((p) => (target.has(p.id) ? { ...p, rot: (p.rot + 90) % 360, crop: null } : p)),
      undoEntry: { id: ++undoSeq, label: `Rotated ${target.size} ${target.size === 1 ? 'page' : 'pages'}`, pages: s.pages, selected: s.selected },
    }));
  },

  remove: (ids) => {
    const target = new Set(ids ?? get().selected);
    if (!target.size) return set({ notice: 'Select pages to delete.' });
    set((s) => {
      const selected = new Set(s.selected);
      target.forEach((id) => selected.delete(id));
      return {
        pages: s.pages.filter((p) => !target.has(p.id)),
        selected,
        leaving: new Set(),
        undoEntry: { id: ++undoSeq, label: `Deleted ${target.size} ${target.size === 1 ? 'page' : 'pages'}`, pages: s.pages, selected: s.selected },
      };
    });
  },

  removeAnimated: (ids) => {
    const target = new Set(ids ?? get().selected);
    if (!target.size) return set({ notice: 'Select pages to delete.' });
    if (reducedMotion()) return get().remove([...target]);
    set({ leaving: target });
    setTimeout(() => {
      // Only finish if nothing (like Undo or Start over) changed the list meanwhile.
      if (get().leaving === target) get().remove([...target]);
    }, LEAVE_MS);
  },

  removeDoc: (docId) =>
    set((s) => {
      const pages = s.pages.filter((p) => p.docId !== docId);
      const keep = new Set(pages.map((p) => p.id));
      return { pages, selected: new Set([...s.selected].filter((id) => keep.has(id))) };
    }),

  setCrop: (id, crop) => set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, crop } : p)) })),
  setCropAll: (crop) => set((s) => ({ pages: s.pages.map((p) => ({ ...p, crop: { ...crop } })) })),

  reset: () => {
    Object.values(get().docs).forEach((d) => d.proxy.destroy());
    set({ docs: {}, pages: [], selected: new Set(), pending: [], undoEntry: null, leaving: new Set(), exportIds: null });
  },
}));
