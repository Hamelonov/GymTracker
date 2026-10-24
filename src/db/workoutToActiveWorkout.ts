import type { WorkoutDetail } from './repo/workouts';
import { withFieldsThatHaveValues } from '@/domain/extraFields';
import { getSetFieldsForExerciseType, type ActiveWorkout } from '@/domain/types';

/** Превращает сохранённую тренировку обратно в редактируемую структуру активной тренировки. */
export function workoutToActiveWorkout(workout: WorkoutDetail): ActiveWorkout {
  return {
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt,
    routineId: workout.routineId,
    notes: workout.notes,
    exercises: workout.exercises.map((workoutExercise) => ({
      id: workoutExercise.id,
      exerciseId: workoutExercise.exerciseId,
      supersetGroup: workoutExercise.supersetGroup,
      note: workoutExercise.note,
      restSeconds: workoutExercise.restSeconds,
      // Старые записи без списка полей: поле со значениями считается включённым, иначе RPE пропал бы из вида.
      extraFields: withFieldsThatHaveValues(
        workoutExercise.extraFields,
        workoutExercise.sets,
        getSetFieldsForExerciseType(workoutExercise.exercise.type),
      ),
      sets: workoutExercise.sets.map((set) => ({
        id: set.id,
        type: set.type,
        weightKg: set.weightKg,
        reps: set.reps,
        durationSec: set.durationSec,
        distanceM: set.distanceM,
        rpe: set.rpe,
        rir: set.rir,
        completed: true,
        completedAt: set.completedAt,
        previous: null,
        prTypes: set.prTypes,
      })),
    })),
  };
}
