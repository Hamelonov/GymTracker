import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * Key-value storage for zustand `persist` that never writes on the tap path.
 *
 * Reads are synchronous (state is hydrated before the first render). Writes
 * are coalesced and flushed shortly after the UI has updated, and immediately
 * when the app goes to the background, so nothing is lost if Android kills it.
 */
// Values waiting to be written; null means "remove this key".
const pendingWrites = new Map<string, string | null>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY_MS = 400;

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  for (const [key, value] of pendingWrites) {
    if (value == null) Storage.removeItemSync(key);
    else Storage.setItemSync(key, value);
  }
  pendingWrites.clear();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
}

AppState.addEventListener('change', (appState) => {
  if (appState !== 'active') flush();
});

function readItem(name: string): string | null {
  // A pending write is newer than what is on disk.
  if (pendingWrites.has(name)) return pendingWrites.get(name) ?? null;
  return Storage.getItemSync(name);
}

export const deferredStorage: StateStorage = {
  getItem: readItem,
  setItem: (name, value) => {
    pendingWrites.set(name, value);
    scheduleFlush();
  },
  removeItem: (name) => {
    pendingWrites.set(name, null);
    scheduleFlush();
  },
};

/** Write everything pending right now (e.g. before replacing all data). */
export function flushStorage() {
  flush();
}
