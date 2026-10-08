import { useSyncExternalStore } from 'react';

/** "Name files automatically": on by default. When off, downloads keep the original file name. */
const KEY = 'foldline-auto-name';

const listeners = new Set<() => void>();
let current: boolean | undefined;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true; // storage blocked: use the default
  }
}

export function setAutoName(on: boolean) {
  current = on;
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, '0');
  } catch { /* storage blocked: the choice lasts for this visit only */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    current = read();
    cb();
  };
  window.addEventListener('storage', onStorage); // keep other tabs in sync
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
}

const snapshot = () => (current ??= read());
const serverSnapshot = () => true;

export function useAutoName(): [boolean, (on: boolean) => void] {
  return [useSyncExternalStore(subscribe, snapshot, serverSnapshot), setAutoName];
}
