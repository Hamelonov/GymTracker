import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * Key-value хранилище для `persist` из `zustand`, которое никогда не пишет в момент тапа.
 *
 * Чтение синхронное (состояние гидрируется до первого рендера). Записи
 * объединяются и сбрасываются вскоре после обновления интерфейса, а при уходе
 * приложения в фон сразу, чтобы ничего не потерялось, если Android его убьёт.
 */
// Значения, ожидающие записи; null означает «удалить этот ключ».
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
  // Ожидающая запись новее, чем то, что на диске.
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

/** Записывает всё ожидающее прямо сейчас (например, перед заменой всех данных). */
export function flushStorage() {
  flush();
}
