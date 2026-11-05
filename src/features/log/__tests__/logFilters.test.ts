import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import type { SetRow } from '@/db/schema';
import {
  countActiveLogFilters,
  DEFAULT_LOG_FILTERS,
  filterLogEntries,
  matchesExerciseFilters,
  type LogFilters,
} from '../logFilters';

const NOW = new Date(2026, 10, 5, 12).getTime();

function makeSet(weightKg: number | null, type: SetRow['type'] = 'normal'): SetRow {
  return { weightKg, type, reps: 5 } as SetRow;
}

function makeEntry(startedAt: Date, sets: SetRow[], note = ''): ExerciseHistoryEntry {
  return {
    workoutId: String(startedAt.getTime()),
    workoutName: '',
    startedAt: startedAt.getTime(),
    note,
    sets,
  };
}

const withFilters = (patch: Partial<LogFilters>): LogFilters => ({ ...DEFAULT_LOG_FILTERS, ...patch });

describe('filterLogEntries', () => {
  it('без фильтров возвращает всё как есть, даже запись без подходов', () => {
    const entries = [makeEntry(new Date(2020, 0, 1), [makeSet(10)]), makeEntry(new Date(2026, 9, 1), [])];

    expect(filterLogEntries(entries, DEFAULT_LOG_FILTERS, NOW)).toEqual(entries);
  });

  it('период отсекает старые дни, а граничный день оставляет', () => {
    const onBoundary = makeEntry(new Date(2026, 9, 5, 0, 30), [makeSet(null)]);
    const tooOld = makeEntry(new Date(2026, 9, 4, 23, 30), [makeSet(null)]);

    expect(filterLogEntries([onBoundary, tooOld], withFilters({ period: 'month' }), NOW)).toEqual([
      onBoundary,
    ]);
  });

  it('«С весом» оставляет только подходы с весом, день без них убирает', () => {
    const mixedDay = makeEntry(new Date(2026, 9, 10), [makeSet(5), makeSet(null), makeSet(0)]);
    const bodyweightDay = makeEntry(new Date(2026, 9, 9), [makeSet(null)]);

    const filtered = filterLogEntries([mixedDay, bodyweightDay], withFilters({ weight: 'weighted' }), NOW);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.sets.map((set) => set.weightKg)).toEqual([5]);
  });

  it('«Без веса» считает нулевой вес отсутствием веса', () => {
    const day = makeEntry(new Date(2026, 9, 10), [makeSet(5), makeSet(null), makeSet(0)]);

    const filtered = filterLogEntries([day], withFilters({ weight: 'bodyweight' }), NOW);

    expect(filtered[0]?.sets.map((set) => set.weightKg)).toEqual([null, 0]);
  });

  it('прячет разминочные подходы, день только из разминки убирает', () => {
    const workDay = makeEntry(new Date(2026, 9, 10), [makeSet(40, 'warmup'), makeSet(80)]);
    const warmupDay = makeEntry(new Date(2026, 9, 9), [makeSet(40, 'warmup')]);

    const filtered = filterLogEntries([workDay, warmupDay], withFilters({ hideWarmups: true }), NOW);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.sets.map((set) => set.weightKg)).toEqual([80]);
  });

  it('оставляет только дни с примечанием', () => {
    const withNote = makeEntry(new Date(2026, 9, 10), [makeSet(5)], 'Тяжело');
    const withoutNote = makeEntry(new Date(2026, 9, 9), [makeSet(5)]);

    expect(filterLogEntries([withNote, withoutNote], withFilters({ onlyWithNotes: true }), NOW)).toEqual([
      withNote,
    ]);
  });
});

describe('matchesExerciseFilters', () => {
  const pullUps = { muscleGroup: 'lats', equipment: 'bodyweight' } as const;

  it('пустые списки пропускают любое упражнение', () => {
    expect(matchesExerciseFilters(pullUps, DEFAULT_LOG_FILTERS)).toBe(true);
  });

  it('упражнение должно подойти и по мышцам, и по оборудованию', () => {
    expect(matchesExerciseFilters(pullUps, withFilters({ muscleGroups: ['lats', 'chest'] }))).toBe(true);
    expect(matchesExerciseFilters(pullUps, withFilters({ muscleGroups: ['chest'] }))).toBe(false);
    expect(
      matchesExerciseFilters(pullUps, withFilters({ muscleGroups: ['lats'], equipment: ['barbell'] })),
    ).toBe(false);
  });
});

describe('countActiveLogFilters', () => {
  it('считает включённые фильтры, а не выбранные чипы', () => {
    expect(countActiveLogFilters(DEFAULT_LOG_FILTERS)).toBe(0);
    expect(countActiveLogFilters(withFilters({ period: 'year', muscleGroups: ['lats', 'chest'] }))).toBe(2);
    expect(countActiveLogFilters(withFilters({ onlyWithNotes: true, hideWarmups: true }))).toBe(2);
  });
});
