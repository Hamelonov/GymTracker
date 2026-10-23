import { estimateOneRm } from './oneRm';
import type { ExerciseType, PrHit, PrType, SetType, SetValues } from './types';

export interface RecordSet extends SetValues {
  type: SetType;
  completed: boolean;
}

/** Current best values for an exercise, used to detect new PRs. */
export type RecordTable = Partial<Record<PrType, number>>;

export function prTypesFor(type: ExerciseType): PrType[] {
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

/** Value of a single set for a given PR type, or null if not applicable. */
export function setMetric(set: RecordSet, prType: PrType): number | null {
  if (!set.completed || set.type === 'warmup') return null;
  switch (prType) {
    case 'weight':
      return set.weightKg != null && set.weightKg > 0 && (set.reps ?? 0) > 0 ? set.weightKg : null;
    case 'one_rm':
      return set.weightKg != null && set.weightKg > 0 && set.reps != null && set.reps > 0
        ? estimateOneRm(set.weightKg, set.reps)
        : null;
    case 'volume':
      return set.weightKg != null && set.reps != null && set.weightKg * set.reps > 0
        ? set.weightKg * set.reps
        : null;
    case 'reps':
      return set.reps != null && set.reps > 0 ? set.reps : null;
    case 'duration':
      return set.durationSec != null && set.durationSec > 0 ? set.durationSec : null;
    case 'distance':
      return set.distanceM != null && set.distanceM > 0 ? set.distanceM : null;
  }
}

/**
 * Walk the sets of one exercise in order and report which sets beat the
 * existing records. The returned map is keyed by set index. The record table
 * is updated as we go so only the first set to beat a record counts.
 */
export function detectPrs(
  sets: RecordSet[],
  exerciseType: ExerciseType,
  records: RecordTable,
): Map<number, PrHit[]> {
  const table: RecordTable = { ...records };
  const hits = new Map<number, PrHit[]>();
  const types = prTypesFor(exerciseType);
  sets.forEach((set, i) => {
    for (const prType of types) {
      const value = setMetric(set, prType);
      if (value == null) continue;
      const prev = table[prType];
      if (prev == null || value > prev + 1e-9) {
        const list = hits.get(i) ?? [];
        list.push({ type: prType, value, previous: prev ?? null });
        hits.set(i, list);
        table[prType] = value;
      }
    }
  });
  return hits;
}

export function bestOf(sets: RecordSet[], prType: PrType): number | null {
  let best: number | null = null;
  for (const s of sets) {
    const v = setMetric(s, prType);
    if (v != null && (best == null || v > best)) best = v;
  }
  return best;
}
