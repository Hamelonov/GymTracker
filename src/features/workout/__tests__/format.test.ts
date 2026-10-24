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

test('RIR и RPE добавляются только когда они есть', () => {
  const fields = getSetFieldsForExerciseType('weight_reps');
  expect(formatSetLineWithExtras(values({ weightKg: 100, reps: 8, rir: 1, rpe: 8.5 }), fields, units)).toBe(
    '100 kg × 8 · RIR 1 · @8.5',
  );
  expect(formatSetLineWithExtras(values({ weightKg: 100, reps: 8 }), fields, units)).toBe('100 kg × 8');
});
