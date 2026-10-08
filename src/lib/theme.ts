import { useSyncExternalStore } from 'react';

/** 'system' follows the OS setting (the default); 'light' and 'dark' are explicit choices. */
export type Theme = 'system' | 'light' | 'dark';
const KEY = 'foldline-theme';

const listeners = new Set<() => void>();
let current: Theme | undefined;

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system'; // storage blocked: still follow the system
  }
}

function apply(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
}

export function setTheme(t: Theme) {
  current = t;
  try {
    if (t === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch { /* storage blocked: the choice lasts for this visit only */ }
  apply(t);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    current = read();
    apply(current);
    cb();
  };
  window.addEventListener('storage', onStorage); // keep other tabs in sync
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
}

const snapshot = (): Theme => (current ??= read());
// The server (prerender) and first hydration render assume 'system'; React corrects it right after.
const serverSnapshot = (): Theme => 'system';

export function useTheme(): [Theme, (t: Theme) => void] {
  return [useSyncExternalStore(subscribe, snapshot, serverSnapshot), setTheme];
}
