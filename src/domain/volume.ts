import type { SetType, SetValues } from './types';

export interface VolumeSet extends SetValues {
  type: SetType;
  completed: boolean;
}

/** Working-set volume in kg: weight × reps, ignoring warm-ups and incomplete sets. */
export function setVolume(set: VolumeSet): number {
  if (!set.completed || set.type === 'warmup') return 0;
  if (set.weightKg == null || set.reps == null) return 0;
  return set.weightKg * set.reps;
}

export function totalVolume(sets: VolumeSet[]): number {
  return sets.reduce((acc, s) => acc + setVolume(s), 0);
}

export function countWorkingSets(sets: VolumeSet[]): number {
  return sets.filter((s) => s.completed && s.type !== 'warmup').length;
}

export function totalReps(sets: VolumeSet[]): number {
  return sets.reduce((acc, s) => acc + (s.completed && s.type !== 'warmup' ? (s.reps ?? 0) : 0), 0);
}
