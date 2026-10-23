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
const pending = new Map<string, string | null>();
let timer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY_MS = 400;

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  for (const [key, value] of pending) {
    if (value == null) Storage.removeItemSync(key);
    else Storage.setItemSync(key, value);
  }
  pending.clear();
}

function schedule() {
  if (timer) return;
  timer = setTimeout(flush, FLUSH_DELAY_MS);
}

AppState.addEventListener('change', (state) => {
  if (state !== 'active') flush();
});

export const deferredStorage: StateStorage = {
  getItem: (name) => (pending.has(name) ? (pending.get(name) ?? null) : Storage.getItemSync(name)),
  setItem: (name, value) => {
    pending.set(name, value);
    schedule();
  },
  removeItem: (name) => {
    pending.set(name, null);
    schedule();
  },
};

/** Write everything pending right now (e.g. before replacing all data). */
export function flushStorage() {
  flush();
}
