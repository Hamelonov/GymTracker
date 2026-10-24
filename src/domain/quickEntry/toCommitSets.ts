import type { SetType, SetValues } from '@/domain/types';
import type { ParsedSet } from './types';

/** Подходы строки в виде, который хранит карточка: знак веса отброшен, нулевой вес значит «без веса». */
export function toCommitSets(sets: ParsedSet[]): ({ type: SetType } & SetValues)[] {
  return sets.map((set) => ({
    type: set.type,
    weightKg: set.weightKg === 0 ? null : set.weightKg,
    reps: set.reps,
    durationSec: set.durationSec,
    distanceM: set.distanceM,
    rpe: null,
    rir: set.rir,
  }));
}
