import {
  availableExtraFields,
  initialExtraFields,
  normalizeExtraFields,
  toggleExtraField,
  withFieldsThatHaveValues,
} from '../extraFields';
import { getSetFieldsForExerciseType, type SetValues } from '../types';

const WEIGHT_REPS = getSetFieldsForExerciseType('weight_reps');
const REPS = getSetFieldsForExerciseType('bodyweight_reps');

const values = (partial: Partial<SetValues> = {}): SetValues => ({
  weightKg: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rpe: null,
  rir: null,
  ...partial,
});

test('вес можно добавить только упражнениям без поля веса', () => {
  expect(availableExtraFields(WEIGHT_REPS)).toEqual(['rir', 'rpe']);
  expect(availableExtraFields(REPS)).toEqual(['weight', 'rir', 'rpe']);
});

test('нормализация: порядок, дубли, недоступные поля, пустое значение', () => {
  expect(normalizeExtraFields(['rpe', 'rir', 'rir'], WEIGHT_REPS)).toEqual(['rir', 'rpe']);
  expect(normalizeExtraFields(['weight'], WEIGHT_REPS)).toEqual([]);
  expect(normalizeExtraFields(undefined, REPS)).toEqual([]);
});

test('переключение поля', () => {
  expect(toggleExtraField(['rir'], 'rir')).toEqual([]);
  expect(toggleExtraField([], 'rpe')).toEqual(['rpe']);
  expect(toggleExtraField(['rpe'], 'rir')).toEqual(['rir', 'rpe']);
});

test('старые записи: поля со значениями считаются включёнными', () => {
  expect(withFieldsThatHaveValues([], [values({ rpe: 8, weightKg: 10 })], REPS)).toEqual(['weight', 'rpe']);
  expect(withFieldsThatHaveValues(['rir'], [values()], WEIGHT_REPS)).toEqual(['rir']);
  expect(withFieldsThatHaveValues([], [values({ weightKg: 80, reps: 5 })], WEIGHT_REPS)).toEqual([]);
});

test('при создании карточки: запомненные поля плюс вес, если он был в прошлый раз у упражнения без веса', () => {
  expect(initialExtraFields([], [values({ weightKg: 10, reps: 8 })], REPS)).toEqual(['weight']);
  // RIR и RPE из прошлого раза не включаются сами: владелец просил добавлять их заново.
  expect(initialExtraFields(['rir'], [values({ rpe: 8 })], WEIGHT_REPS)).toEqual(['rir']);
  expect(initialExtraFields(['rpe'], [values({ weightKg: 10 })], REPS)).toEqual(['weight', 'rpe']);
  expect(initialExtraFields([], [values({ weightKg: 80 })], WEIGHT_REPS)).toEqual([]);
});
