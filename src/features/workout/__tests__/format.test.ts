import { getSetFieldsForExerciseType, type SetValues } from '@/domain/types';
import { formatSetLineWithExtras, formatSetValues } from '../format';

const units = { weight: 'kg', distance: 'km' } as const;
const values = (partial: Partial<SetValues>): SetValues => ({
  weightKg: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rpe: null,
  rir: null,
  ...partial,
});

test('дополнительный вес у подтягиваний и планки виден в истории', () => {
  expect(
    formatSetValues(values({ weightKg: 10, reps: 8 }), getSetFieldsForExerciseType('bodyweight_reps'), units),
  ).toBe('+10 kg × 8');
  expect(formatSetValues(values({ reps: 8 }), getSetFieldsForExerciseType('bodyweight_reps'), units)).toBe(
    '8',
  );
  expect(
    formatSetValues(
      values({ weightKg: 20, durationSec: 60 }),
      getSetFieldsForExerciseType('duration'),
      units,
    ),
  ).toBe('+20 kg · 1:00');
});

test('строка истории пишется как в «Ручке», RPE — через @', () => {
  const set = (partial: Partial<SetValues>) => ({ ...values(partial), type: 'normal' as const });
  expect(
    formatSetLineWithExtras(set({ weightKg: 100, reps: 8, rir: 1, rpe: 8.5 }), 'weight_reps', units, 'ru'),
  ).toBe('100кг х 8(1) @8.5');
  expect(formatSetLineWithExtras(set({ weightKg: 100, reps: 8 }), 'weight_reps', units, 'en')).toBe(
    '100kg x 8',
  );
  expect(formatSetLineWithExtras(set({ weightKg: 10, reps: 8 }), 'bodyweight_reps', units, 'ru')).toBe(
    '+10кг х 8',
  );
  expect(formatSetLineWithExtras(set({ durationSec: 60 }), 'duration', units, 'ru')).toBe('1:00');
});
