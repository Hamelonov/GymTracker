import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { create } from 'zustand';

interface DatabaseVersionState {
  version: number;
  bump: () => void;
}

/** Monotonic counter bumped after every write; screens re-query when it changes. */
export const useDatabaseVersion = create<DatabaseVersionState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));

export function notifyDatabaseChanged() {
  useDatabaseVersion.getState().bump();
}

/**
 * Run a synchronous query and keep it fresh: re-runs when the database version
 * changes, when deps change, and whenever the screen regains focus.
 * `deps` should be primitives (ids, timestamps, joined strings).
 */
export function useQuery<T>(query: () => T, deps: unknown[] = []): T {
  const version = useDatabaseVersion((state) => state.version);
  const [focusCount, setFocusCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusCount((count) => count + 1);
    }, []),
  );
  const depsKey = deps.map((dependency) => String(dependency)).join('\u0000');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => query(), [version, focusCount, depsKey]);
}
