import { getSetFieldsForExerciseType, type ExerciseType } from '@/domain/types';
import { inferExerciseFromLine } from '../inferExercise';
import { prepareCandidates } from '../matchExercise';
import { adaptSetsToFields, resolveLine } from '../resolveLine';
import type { ParsedLine, ParsedSet } from '../types';

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
const line = (name: string, sets: ParsedSet[]): ParsedLine => ({ lineIndex: 0, rawText: name, name, sets });

const candidates = prepareCandidates([
  {
    id: 'squat',
    names: ['Приседания со штангой', 'Squat (Barbell)'],
    isCustom: false,
    usageCount: 0,
    isInWorkout: false,
    order: 0,
  },
  { id: 'plank', names: ['Планка', 'Plank'], isCustom: false, usageCount: 0, isInWorkout: false, order: 1 },
]);
const types = new Map<string, ExerciseType>([
  ['squat', 'weight_reps'],
  ['plank', 'duration'],
]);

test('вывод типа нового упражнения из строки', () => {
  expect(inferExerciseFromLine('Присед с гирей', [set({ weightKg: 24, reps: 10 })])).toEqual({
    type: 'weight_reps',
    muscleGroup: 'quads',
    equipment: 'kettlebell',
  });
  expect(inferExerciseFromLine('Берпи', [set({ reps: 15 })])).toEqual({
    type: 'bodyweight_reps',
    muscleGroup: 'full_body',
    equipment: 'bodyweight',
  });
  expect(inferExerciseFromLine('Вис на турнике', [set({ durationSec: 40 })]).type).toBe('duration');
  expect(inferExerciseFromLine('Гребля', [set({ distanceM: 2000, durationSec: 480 })])).toEqual({
    type: 'distance_duration',
    muscleGroup: 'cardio',
    equipment: 'machine',
  });
  expect(
    inferExerciseFromLine('Подтягивания узким хватом', [set({ weightKg: 10, weightSign: 'extra', reps: 8 })])
      .type,
  ).toBe('weighted_bodyweight');
  expect(inferExerciseFromLine('Что-то новое', []).type).toBe('weight_reps');
});

test('голые числа у упражнения на время становятся секундами', () => {
  expect(adaptSetsToFields([set({ reps: 60 })], getSetFieldsForExerciseType('duration'), 'km')).toEqual({
    sets: [set({ durationSec: 60 })],
  });
});

test('время у упражнения на повторы — ошибка', () => {
  expect(
    adaptSetsToFields([set({ durationSec: 60 })], getSetFieldsForExerciseType('bodyweight_reps'), 'km'),
  ).toEqual({
    error: 'repsExpected',
  });
});

test('найденное, новое и ошибочное', () => {
  expect(
    resolveLine(line('присед со штаного', [set({ weightKg: 70, reps: 7 })]), candidates, types, 'km'),
  ).toEqual({
    kind: 'matched',
    lineIndex: 0,
    exerciseId: 'squat',
    exerciseType: 'weight_reps',
    sets: [set({ weightKg: 70, reps: 7 })],
  });
  expect(resolveLine(line('Планка', [set({ reps: 60 })]), candidates, types, 'km')).toEqual({
    kind: 'matched',
    lineIndex: 0,
    exerciseId: 'plank',
    exerciseType: 'duration',
    sets: [set({ durationSec: 60 })],
  });
  expect(
    resolveLine(line('фермерская прогулка', [set({ weightKg: 30, reps: 40 })]), candidates, types, 'km'),
  ).toMatchObject({ kind: 'new', name: 'Фермерская прогулка', inferred: { type: 'weight_reps' } });
  expect(resolveLine(line('присед', [set({ durationSec: 60 })]), candidates, types, 'km')).toEqual({
    kind: 'error',
    error: { lineIndex: 0, rawText: 'присед', reason: 'repsExpected' },
  });
});

test('голое число у бега — дистанция в единицах пользователя', () => {
  expect(
    adaptSetsToFields([set({ reps: 5 })], getSetFieldsForExerciseType('distance_duration'), 'km'),
  ).toEqual({
    sets: [set({ distanceM: 5000 })],
  });
  expect(
    adaptSetsToFields([set({ reps: 3 })], getSetFieldsForExerciseType('distance_duration'), 'mi'),
  ).toEqual({
    sets: [set({ distanceM: 4828.032 })],
  });
});
