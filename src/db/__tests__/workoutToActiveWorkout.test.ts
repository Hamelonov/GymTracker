import type { WorkoutDetail } from '@/db/repo/workouts';
import { workoutToActiveWorkout } from '../workoutToActiveWorkout';

test('RIR и RPE из базы попадают в свои поля, а поля со значениями включаются', () => {
  const workout = {
    id: 'w',
    name: 'Тренировка №1',
    startedAt: 0,
    finishedAt: 0,
    durationSec: 0,
    notes: '',
    routineId: null,
    volumeKg: 0,
    setCount: 1,
    prCount: 0,
    exercises: [
      {
        id: 'card',
        workoutId: 'w',
        exerciseId: 'squat',
        position: 0,
        supersetGroup: null,
        note: '',
        restSeconds: null,
        extraFields: [],
        exercise: { type: 'weight_reps' },
        sets: [
          {
            id: 'set',
            workoutExerciseId: 'card',
            position: 0,
            type: 'normal',
            weightKg: 100,
            reps: 8,
            durationSec: null,
            distanceM: null,
            rpe: 8,
            rir: 1,
            completed: true,
            completedAt: 5,
            prTypes: [],
          },
        ],
      },
    ],
  } as unknown as WorkoutDetail;

  const active = workoutToActiveWorkout(workout);
  expect(active.exercises[0]?.sets[0]).toMatchObject({ weightKg: 100, reps: 8, rpe: 8, rir: 1 });
  expect(active.exercises[0]?.extraFields).toEqual(['rir', 'rpe']);
});
