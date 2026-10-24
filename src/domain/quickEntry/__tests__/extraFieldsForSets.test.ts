import { extraFieldsForSets } from '../extraFieldsForSets';
import type { ParsedSet } from '../types';

const set = (partial: Partial<ParsedSet>): ParsedSet => ({
  type: 'normal',
  weightKg: null,
  weightSign: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rir: null,
  ...partial,
});

test('RIR в строке включает поле RIR', () => {
  expect(extraFieldsForSets([set({ reps: 8, rir: 1 })], 'weight_reps')).toEqual(['rir']);
});

test('вес у упражнения без поля веса включает поле «Вес»', () => {
  expect(
    extraFieldsForSets([set({ weightKg: 10, weightSign: 'extra', reps: 8 })], 'bodyweight_reps'),
  ).toEqual(['weight']);
});

test('обычный вес у упражнения с весом ничего не включает', () => {
  expect(extraFieldsForSets([set({ weightKg: 70, reps: 8 })], 'weight_reps')).toEqual([]);
});
