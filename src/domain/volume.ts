import type { SetType, SetValues } from './types';

export interface VolumeSet extends SetValues {
  type: SetType;
  completed: boolean;
}

function isWorkingSet(set: VolumeSet): boolean {
  return set.completed && set.type !== 'warmup';
}

/** Объём рабочих подходов в кг: вес × повторы, без разминки и незавершённых подходов. */
export function setVolume(set: VolumeSet): number {
  if (!isWorkingSet(set)) return 0;
  if (set.weightKg == null || set.reps == null) return 0;
  return set.weightKg * set.reps;
}

export function totalVolume(sets: VolumeSet[]): number {
  return sets.reduce((total, set) => total + setVolume(set), 0);
}

export function countWorkingSets(sets: VolumeSet[]): number {
  return sets.filter(isWorkingSet).length;
}

export function totalReps(sets: VolumeSet[]): number {
  return sets.reduce((total, set) => total + (isWorkingSet(set) ? (set.reps ?? 0) : 0), 0);
}
