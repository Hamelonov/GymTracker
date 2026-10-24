import type { ActiveWorkout } from '@/domain/types';

/**
 * Дополняет тренировку из старого хранилища полями, которых тогда не было: `extraFields` у упражнения
 * и `rir` у подхода. Иначе активная тренировка, начатая до обновления, упала бы на первом же рендере.
 */
export function normalizeActiveWorkout(workout: ActiveWorkout | null): ActiveWorkout | null {
  if (!workout) return null;
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      extraFields: exercise.extraFields ?? [],
      sets: exercise.sets.map((set) => ({
        ...set,
        rir: set.rir ?? null,
        previous: set.previous ? { ...set.previous, rir: set.previous.rir ?? null } : null,
      })),
    })),
  };
}
