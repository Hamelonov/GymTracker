import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { create } from 'zustand';

interface DatabaseVersionState {
  version: number;
  bump: () => void;
}

/** Монотонный счётчик, растёт после каждой записи; экраны перезапрашивают данные при его изменении. */
export const useDatabaseVersion = create<DatabaseVersionState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));

export function notifyDatabaseChanged() {
  useDatabaseVersion.getState().bump();
}

/**
 * Выполняет синхронный запрос и держит результат свежим: перезапускает при смене версии базы,
 * при смене зависимостей и каждый раз, когда экран снова получает фокус.
 * `deps` должны быть примитивами (id, метки времени, склеенные строки).
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
