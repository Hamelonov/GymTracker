import { startOfDay, subMonths } from 'date-fns';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import type { ExerciseRow, SetRow } from '@/db/schema';
import type { Equipment, MuscleGroup } from '@/domain/types';

export const LOG_PERIODS = ['all', 'month', 'quarter', 'halfYear', 'year'] as const;
export type LogPeriod = (typeof LOG_PERIODS)[number];

export const LOG_WEIGHT_FILTERS = ['any', 'weighted', 'bodyweight'] as const;
export type LogWeightFilter = (typeof LOG_WEIGHT_FILTERS)[number];

export interface LogFilters {
  period: LogPeriod;
  /** Пустой список означает «любые». */
  muscleGroups: MuscleGroup[];
  /** Пустой список означает «любое». */
  equipment: Equipment[];
  weight: LogWeightFilter;
  onlyWithNotes: boolean;
  hideWarmups: boolean;
}

export const DEFAULT_LOG_FILTERS: LogFilters = {
  period: 'all',
  muscleGroups: [],
  equipment: [],
  weight: 'any',
  onlyWithNotes: false,
  hideWarmups: false,
};

const MONTHS_IN_PERIOD: Record<Exclude<LogPeriod, 'all'>, number> = {
  month: 1,
  quarter: 3,
  halfYear: 6,
  year: 12,
};

function getPeriodStart(period: LogPeriod, now: number): number {
  if (period === 'all') return 0;
  // От начала дня: иначе тренировка месячной давности то входила бы в период, то нет, смотря по часу.
  return startOfDay(subMonths(now, MONTHS_IN_PERIOD[period])).getTime();
}

function matchesWeightFilter(set: SetRow, weight: LogWeightFilter): boolean {
  if (weight === 'any') return true;
  const hasWeight = (set.weightKg ?? 0) > 0;
  return weight === 'weighted' ? hasWeight : !hasWeight;
}

function matchesSetFilters(set: SetRow, filters: LogFilters): boolean {
  if (filters.hideWarmups && set.type === 'warmup') return false;
  return matchesWeightFilter(set, filters.weight);
}

/** Фильтры по самому упражнению: они сужают и список упражнений, и таблицы в режиме «Все». */
export function matchesExerciseFilters(
  exercise: Pick<ExerciseRow, 'muscleGroup' | 'equipment'>,
  filters: LogFilters,
): boolean {
  const matchesMuscle =
    filters.muscleGroups.length === 0 || filters.muscleGroups.includes(exercise.muscleGroup);
  const matchesEquipment = filters.equipment.length === 0 || filters.equipment.includes(exercise.equipment);
  return matchesMuscle && matchesEquipment;
}

/**
 * Фильтры по дням и подходам. Вес и разминка отбирают подходы внутри дня: таблица показывает
 * подходы, и день с разным весом не должен выпадать или оставаться целиком.
 */
export function filterLogEntries(
  entries: ExerciseHistoryEntry[],
  filters: LogFilters,
  now: number,
): ExerciseHistoryEntry[] {
  const periodStart = getPeriodStart(filters.period, now);
  const filteredEntries: ExerciseHistoryEntry[] = [];
  for (const entry of entries) {
    if (entry.startedAt < periodStart) continue;
    if (filters.onlyWithNotes && !entry.note) continue;
    const sets = entry.sets.filter((set) => matchesSetFilters(set, filters));
    // Убираем день, только если подходы отсеял фильтр: запись без подходов показывается как и раньше.
    if (sets.length === 0 && entry.sets.length > 0) continue;
    filteredEntries.push({ ...entry, sets });
  }
  return filteredEntries;
}

export function countActiveLogFilters(filters: LogFilters): number {
  const activeFilters = [
    filters.period !== 'all',
    filters.muscleGroups.length > 0,
    filters.equipment.length > 0,
    filters.weight !== 'any',
    filters.onlyWithNotes,
    filters.hideWarmups,
  ];
  return activeFilters.filter(Boolean).length;
}
