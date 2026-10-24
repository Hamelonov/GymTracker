import type { ActiveWorkout } from '@/domain/types';
import { normalizeActiveWorkout } from '../normalizeActiveWorkout';

test('тренировка из старого хранилища получает extraFields и rir', () => {
  // Так выглядела запись до появления дополнительных полей: без extraFields у упражнения и без rir у подхода.
  const legacyWorkout = {
    id: 'workout',
    name: 'Тренировка №1',
    startedAt: 0,
    routineId: null,
    notes: '',
    exercises: [
      {
        id: 'card',
        exerciseId: 'squat',
        supersetGroup: null,
        note: '',
        restSeconds: null,
        sets: [
          {
            id: 'set',
            type: 'normal',
            completed: true,
            completedAt: 5,
            previous: null,
            weightKg: 70,
            reps: 8,
            durationSec: null,
            distanceM: null,
            rpe: 8,
          },
        ],
      },
    ],
  } as unknown as ActiveWorkout;

  const normalized = normalizeActiveWorkout(legacyWorkout);
  expect(normalized?.exercises[0]?.extraFields).toEqual([]);
  expect(normalized?.exercises[0]?.sets[0]).toMatchObject({ weightKg: 70, reps: 8, rpe: 8, rir: null });
});

test('null остаётся null, а полная тренировка не меняется', () => {
  expect(normalizeActiveWorkout(null)).toBeNull();
  const workout: ActiveWorkout = {
    id: 'workout',
    name: 'Тренировка №2',
    startedAt: 0,
    routineId: null,
    notes: '',
    exercises: [
      {
        id: 'card',
        exerciseId: 'squat',
        supersetGroup: null,
        note: '',
        restSeconds: null,
        extraFields: ['rir'],
        sets: [],
      },
    ],
  };
  expect(normalizeActiveWorkout(workout)).toEqual(workout);
});
