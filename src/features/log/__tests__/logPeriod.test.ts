import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import { filterEntriesByPeriod } from '../logPeriod';

const NOW = new Date(2026, 10, 5, 12).getTime();

function makeEntry(startedAt: Date): ExerciseHistoryEntry {
  return {
    workoutId: String(startedAt.getTime()),
    workoutName: '',
    startedAt: startedAt.getTime(),
    note: '',
    sets: [],
  };
}

describe('filterEntriesByPeriod', () => {
  it('«Всё время» оставляет все записи', () => {
    const entries = [makeEntry(new Date(2020, 0, 1)), makeEntry(new Date(2026, 9, 1))];

    expect(filterEntriesByPeriod(entries, 'all', NOW)).toEqual(entries);
  });

  it('оставляет граничный день и отсекает день до него', () => {
    const onBoundary = makeEntry(new Date(2026, 9, 5, 0, 30));
    const tooOld = makeEntry(new Date(2026, 9, 4, 23, 30));

    expect(filterEntriesByPeriod([onBoundary, tooOld], 'month', NOW)).toEqual([onBoundary]);
  });

  it('длинные периоды считает в месяцах', () => {
    const fiveMonthsAgo = makeEntry(new Date(2026, 5, 10));
    const eightMonthsAgo = makeEntry(new Date(2026, 2, 10));
    const entries = [fiveMonthsAgo, eightMonthsAgo];

    expect(filterEntriesByPeriod(entries, 'quarter', NOW)).toEqual([]);
    expect(filterEntriesByPeriod(entries, 'halfYear', NOW)).toEqual([fiveMonthsAgo]);
    expect(filterEntriesByPeriod(entries, 'year', NOW)).toEqual(entries);
  });
});
