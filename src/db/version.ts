import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { create } from 'zustand';

interface DbVersionState {
  version: number;
  bump: () => void;
}

/** Monotonic counter bumped after every write; screens re-query when it changes. */
export const useDbVersion = create<DbVersionState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

export function bumpDb() {
  useDbVersion.getState().bump();
}

/**
 * Run a synchronous query and keep it fresh: re-runs when the DB version
 * changes, when deps change, and whenever the screen regains focus.
 * `deps` should be primitives (ids, timestamps, joined strings).
 */
export function useQuery<T>(fn: () => T, deps: unknown[] = []): T {
  const version = useDbVersion((s) => s.version);
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusTick((n) => n + 1);
    }, []),
  );
  const depsKey = deps.map((d) => String(d)).join('\u0000');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => fn(), [version, focusTick, depsKey]);
}
