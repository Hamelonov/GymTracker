import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
import migrations from '../../drizzle/migrations';
import { db } from './client';

const TAG_KEY = 'migrations_tag';

interface Journal {
  entries: { tag: string }[];
}

const latestTag = (migrations.journal as Journal).entries.at(-1)?.tag ?? '';

interface DbReadyState {
  success: boolean;
  error: Error | null;
}

/**
 * Runs pending Drizzle migrations once. When the database is already at the
 * latest migration (remembered in the key-value store) the async migrator is
 * skipped entirely, which saves over a second on every cold start.
 */
export function useDbReady(): DbReadyState {
  const [state, setState] = useState<DbReadyState>(() => ({
    success: Storage.getItemSync(TAG_KEY) === latestTag,
    error: null,
  }));

  useEffect(() => {
    if (state.success) return;
    let cancelled = false;
    migrate(db, migrations)
      .then(() => {
        Storage.setItemSync(TAG_KEY, latestTag);
        if (!cancelled) setState({ success: true, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ success: false, error: e instanceof Error ? e : new Error(String(e)) });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
