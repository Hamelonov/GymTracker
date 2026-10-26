import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import type { SetRow } from '@/db/schema';
import { buildPenGroups, formatPenSetValue, type PenFormatOptions } from '@/domain/pen/serializeWorkout';
import { getSetFieldsForExerciseType, type ExerciseType } from '@/domain/types';
import { formatNumberWithoutTrailingZeros, roundForDisplay } from '@/domain/units';

/**
 * Общие правила журнала: по ним строится и таблица на экране, и выгрузка в Excel,
 * чтобы обе показывали одно и то же.
 */

export interface WeightLine {
  /** Вес группы в килограммах; null, если подходы без веса. */
  weightKg: number | null;
  /** «70кг» или null, если подходы без веса. */
  weight: string | null;
  /** «9/8/8» — подходы этого веса. */
  sets: string;
}

/** Строки одного дня — как в «Сегодня сделано»: каждый новый вес на своей строке, «70кг х 9/8», «65кг х 10». */
export function buildWeightLines(
  sets: SetRow[],
  exerciseType: ExerciseType,
  options: PenFormatOptions,
): WeightLine[] {
  const lines = buildPenGroups(sets, exerciseType, options).map((group) => ({
    weightKg: group.weightKg,
    weight: group.weightText,
    // RIR стоит в своей колонке, поэтому в подходах его скобок нет: иначе одно и то же написано дважды.
    sets:
      group.sets
        .map((set) => formatPenSetValue({ ...set, rir: null }, exerciseType, options))
        .filter((value) => value.length > 0)
        .join('/') || '—',
  }));
  return lines.length > 0 ? lines : [{ weightKg: null, weight: null, sets: '—' }];
}

/** RIR или RPE всех подходов дня через слэш, как подходы: «0/1/1». Пустой подход — прочерк, чтобы позиции совпадали. */
export function formatPerSet(sets: SetRow[], valueOf: (set: SetRow) => number | null): string {
  if (sets.every((set) => valueOf(set) == null)) return '—';
  return sets
    .map((set) => {
      const value = valueOf(set);
      return value != null ? formatNumberWithoutTrailingZeros(roundForDisplay(value, 2)) : '—';
    })
    .join('/');
}

export interface LogColumns {
  hasWeight: boolean;
  hasRir: boolean;
  hasRpe: boolean;
  /** Ключ перевода подписи колонки веса. */
  weightTitleKey: 'log.columnWeight' | 'log.columnVariation';
}

/** Какие колонки нужны упражнению: колонки без единого значения не показываются. */
export function describeLogColumns(entries: ExerciseHistoryEntry[], exerciseType: ExerciseType): LogColumns {
  const allSets = entries.flatMap((entry) => entry.sets);
  return {
    hasWeight: allSets.some((set) => set.weightKg != null),
    hasRir: allSets.some((set) => set.rir != null),
    hasRpe: allSets.some((set) => set.rpe != null),
    // У упражнений со своим весом в этой колонке дополнительный вес — это усложнение, а не рабочий вес.
    weightTitleKey: getSetFieldsForExerciseType(exerciseType).weight
      ? 'log.columnWeight'
      : 'log.columnVariation',
  };
}
