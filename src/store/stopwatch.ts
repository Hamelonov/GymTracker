import { create } from 'zustand';

interface StopwatchState {
  /** Момент последнего запуска (мс) или null, пока секундомер стоит. */
  runningSince: number | null;
  /** Время, накопленное до последнего запуска (мс): так пауза и продолжение не теряют уже набежавшее. */
  accumulatedMs: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

/**
 * Секундомер из шторки «Часы». Живёт в хранилище, а не в шторке, чтобы продолжать идти,
 * когда шторку закрыли. Между запусками приложения не сохраняется.
 */
export const useStopwatch = create<StopwatchState>((set, get) => ({
  runningSince: null,
  accumulatedMs: 0,
  start: () => {
    if (get().runningSince != null) return;
    set({ runningSince: Date.now() });
  },
  pause: () => {
    const { runningSince, accumulatedMs } = get();
    if (runningSince == null) return;
    set({ runningSince: null, accumulatedMs: accumulatedMs + (Date.now() - runningSince) });
  },
  reset: () => set({ runningSince: null, accumulatedMs: 0 }),
}));

/** Сколько миллисекунд насчитал секундомер к моменту `now`. */
export function getStopwatchElapsedMs(
  state: Pick<StopwatchState, 'runningSince' | 'accumulatedMs'>,
  now: number,
): number {
  if (state.runningSince == null) return state.accumulatedMs;
  return state.accumulatedMs + Math.max(0, now - state.runningSince);
}
