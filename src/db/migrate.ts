import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
import migrations from '../../drizzle/migrations';
import { database } from './client';

const MIGRATIONS_TAG_KEY = 'migrations_tag';

interface Journal {
  entries: { tag: string }[];
}

const latestTag = (migrations.journal as Journal).entries.at(-1)?.tag ?? '';

interface DatabaseReadyState {
  success: boolean;
  error: Error | null;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Один раз применяет ожидающие миграции Drizzle. Если база уже на
 * последней миграции (она запоминается в key-value хранилище), асинхронный мигратор
 * пропускается целиком, что экономит больше секунды при каждом холодном старте.
 */
export function useDatabaseReady(): DatabaseReadyState {
  const [state, setState] = useState<DatabaseReadyState>(() => ({
    success: Storage.getItemSync(MIGRATIONS_TAG_KEY) === latestTag,
    error: null,
  }));

  useEffect(() => {
    if (state.success) return;
    let isCancelled = false;
    migrate(database, migrations)
      .then(() => {
        Storage.setItemSync(MIGRATIONS_TAG_KEY, latestTag);
        if (!isCancelled) setState({ success: true, error: null });
      })
      .catch((error: unknown) => {
        if (!isCancelled) setState({ success: false, error: toError(error) });
      });
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
