import { estimateOneRm } from './oneRm';
import type { ExerciseType, RecordHit, RecordType, SetType, SetValues } from './types';

export interface RecordSet extends SetValues {
  type: SetType;
  completed: boolean;
}

/** Текущие лучшие значения упражнения, нужны для обнаружения новых рекордов. */
export type RecordTable = Partial<Record<RecordType, number>>;

export function recordTypesForExercise(type: ExerciseType): RecordType[] {
  switch (type) {
    case 'weight_reps':
    case 'weighted_bodyweight':
      return ['weight', 'one_rm', 'volume', 'reps'];
    case 'assisted_bodyweight':
    case 'bodyweight_reps':
    case 'reps_only':
      return ['reps'];
    case 'duration':
      return ['duration'];
    case 'distance_duration':
      return ['distance', 'duration'];
  }
}

function isPositive(value: number | null): value is number {
  return value != null && value > 0;
}

/** Значение одного подхода для заданного типа рекорда или null, если не применимо. */
export function setMetric(set: RecordSet, prType: RecordType): number | null {
  if (!set.completed || set.type === 'warmup') return null;
  switch (prType) {
    case 'weight':
      return isPositive(set.weightKg) && (set.reps ?? 0) > 0 ? set.weightKg : null;
    case 'one_rm':
      return isPositive(set.weightKg) && isPositive(set.reps) ? estimateOneRm(set.weightKg, set.reps) : null;
    case 'volume':
      return set.weightKg != null && set.reps != null && set.weightKg * set.reps > 0
        ? set.weightKg * set.reps
        : null;
    case 'reps':
      return isPositive(set.reps) ? set.reps : null;
    case 'duration':
      return isPositive(set.durationSec) ? set.durationSec : null;
    case 'distance':
      return isPositive(set.distanceM) ? set.distanceM : null;
  }
}

/**
 * Проходит по подходам одного упражнения по порядку и сообщает, какие побили
 * существующие рекорды. Возвращаемая карта индексируется номером подхода. Таблица рекордов
 * обновляется по ходу, так что засчитывается только первый подход, побивший рекорд.
 */
export function detectPersonalRecords(
  sets: RecordSet[],
  exerciseType: ExerciseType,
  records: RecordTable,
): Map<number, RecordHit[]> {
  const table: RecordTable = { ...records };
  const hitsBySetIndex = new Map<number, RecordHit[]>();
  const prTypes = recordTypesForExercise(exerciseType);
  sets.forEach((set, setIndex) => {
    for (const prType of prTypes) {
      const value = setMetric(set, prType);
      if (value == null) continue;
      const previousRecord = table[prType];
      // Эпсилон гасит шум float, чтобы равное значение не считалось новым рекордом.
      const beatsPreviousRecord = previousRecord == null || value > previousRecord + 1e-9;
      if (!beatsPreviousRecord) continue;
      const setHits = hitsBySetIndex.get(setIndex) ?? [];
      setHits.push({ type: prType, value, previous: previousRecord ?? null });
      hitsBySetIndex.set(setIndex, setHits);
      table[prType] = value;
    }
  });
  return hitsBySetIndex;
}

export function bestValueOf(sets: RecordSet[], prType: RecordType): number | null {
  let best: number | null = null;
  for (const set of sets) {
    const value = setMetric(set, prType);
    if (value != null && (best == null || value > best)) best = value;
  }
  return best;
}
