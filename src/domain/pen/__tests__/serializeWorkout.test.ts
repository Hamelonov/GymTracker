import { parseLine } from '@/domain/quickEntry/parseLine';
import type { ActiveExercise, ActiveSet, ActiveWorkout, ExerciseType, SetType } from '@/domain/types';
import { serializeExerciseLine, serializeWorkout, type SerializeOptions } from '../serializeWorkout';

let nextId = 0;
const set = (partial: Partial<ActiveSet> = {}): ActiveSet => ({
  id: `set-${(nextId += 1)}`,
  type: 'normal',
  completed: true,
  completedAt: 1,
  previous: null,
  weightKg: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rpe: null,
  rir: null,
  ...partial,
});
const card = (exerciseId: string, sets: ActiveSet[]): ActiveExercise => ({
  id: `card-${exerciseId}`,
  exerciseId,
  supersetGroup: null,
  note: '',
  restSeconds: null,
  extraFields: [],
  sets,
});

const options: SerializeOptions = {
  weightUnit: 'kg',
  distanceUnit: 'km',
  language: 'ru',
  exerciseNameById: new Map([
    ['squat', 'Приседания со штангой'],
    ['pullup', 'Подтягивания'],
    ['pullup-weighted', 'Подтягивания с отягощением'],
    ['pullup-assisted', 'Подтягивания в гравитроне'],
    ['plank', 'Планка'],
    ['run', 'Бег'],
  ]),
  exerciseTypeById: new Map<string, ExerciseType>([
    ['squat', 'weight_reps'],
    ['pullup', 'bodyweight_reps'],
    ['pullup-weighted', 'weighted_bodyweight'],
    ['pullup-assisted', 'assisted_bodyweight'],
    ['plank', 'duration'],
    ['run', 'distance_duration'],
  ]),
};

const squatSets = [
  set({ weightKg: 70, reps: 9, rir: 1 }),
  set({ weightKg: 70, reps: 8, rir: 1 }),
  set({ weightKg: 80, reps: 5, type: 'failure' as SetType }),
];

test('вес, повторы, RIR, группы по весу и суффикс типа', () => {
  expect(serializeExerciseLine(card('squat', squatSets), options)).toBe(
    'Приседания со штангой 70кг х 9(1)/8(1), 80кг х 5о',
  );
});

test('свой вес, дополнительный вес и помощь', () => {
  expect(serializeExerciseLine(card('pullup', [set({ reps: 12 }), set({ reps: 10 })]), options)).toBe(
    'Подтягивания 12/10',
  );
  expect(serializeExerciseLine(card('pullup-weighted', [set({ weightKg: 10, reps: 8 })]), options)).toBe(
    'Подтягивания с отягощением +10кг х 8',
  );
  expect(serializeExerciseLine(card('pullup-assisted', [set({ weightKg: 20, reps: 8 })]), options)).toBe(
    'Подтягивания в гравитроне -20кг х 8',
  );
});

test('время и дистанция', () => {
  expect(
    serializeExerciseLine(card('plank', [set({ durationSec: 60 }), set({ durationSec: 45 })]), options),
  ).toBe('Планка 1:00/0:45');
  expect(serializeExerciseLine(card('run', [set({ distanceM: 5000, durationSec: 1500 })]), options)).toBe(
    'Бег 5км 25:00',
  );
  expect(serializeExerciseLine(card('plank', [set({ durationSec: 3750 })]), options)).toBe('Планка 1:02:30');
});

test('невыполненные подходы пропускаются, карточка без выполненных — одно название', () => {
  expect(
    serializeExerciseLine(
      card('squat', [set({ weightKg: 70, reps: 5 }), set({ completed: false })]),
      options,
    ),
  ).toBe('Приседания со штангой 70кг х 5');
  expect(
    serializeExerciseLine(card('squat', [set({ completed: false, weightKg: 70, reps: 5 })]), options),
  ).toBe('Приседания со штангой');
});

test('английский интерфейс и фунты', () => {
  const englishOptions: SerializeOptions = { ...options, language: 'en', weightUnit: 'lb' };
  expect(
    serializeExerciseLine(card('squat', [set({ weightKg: 70, reps: 5, type: 'failure' })]), englishOptions),
  ).toBe('Приседания со штангой 154.32lb x 5f');
});

test('тренировка — строки через перевод строки', () => {
  const workout: ActiveWorkout = {
    id: 'w',
    name: 'Тренировка №1',
    startedAt: 0,
    routineId: null,
    notes: '',
    exercises: [card('squat', squatSets), card('pullup', [set({ reps: 12 })])],
  };
  expect(serializeWorkout(workout, options)).toBe(
    'Приседания со штангой 70кг х 9(1)/8(1), 80кг х 5о\nПодтягивания 12',
  );
});

test('круг: сериализованная строка разбирается в те же подходы', () => {
  const cases: [string, ActiveSet[]][] = [
    ['squat', squatSets],
    ['pullup-weighted', [set({ weightKg: 10, reps: 8 })]],
    ['pullup-assisted', [set({ weightKg: 20, reps: 8 })]],
    ['plank', [set({ durationSec: 60 }), set({ durationSec: 45 })]],
    ['run', [set({ distanceM: 5000, durationSec: 1500 })]],
    ['squat', [set({ weightKg: 72.5, reps: 5, type: 'warmup' })]],
  ];
  for (const [exerciseId, sets] of cases) {
    const line = serializeExerciseLine(card(exerciseId, sets), options);
    const parsed = parseLine(line, 0, { weightUnit: 'kg', distanceUnit: 'km' });
    if (!parsed.ok) throw new Error(`не разобралось: ${line}`);
    expect(parsed.line.sets.length).toBe(sets.length);
    parsed.line.sets.forEach((parsedSet, index) => {
      const original = sets[index];
      expect(parsedSet.weightKg ?? 0).toBeCloseTo(original?.weightKg ?? 0, 2);
      expect(parsedSet.reps).toBe(original?.reps ?? null);
      expect(parsedSet.rir).toBe(original?.rir ?? null);
      expect(parsedSet.type).toBe(original?.type);
      expect(parsedSet.durationSec).toBe(original?.durationSec ?? null);
      expect(parsedSet.distanceM ?? 0).toBeCloseTo(original?.distanceM ?? 0, 0);
    });
  }
});

test('название с цифрами отделяется двоеточием, подход без повторов — только вес, сброс веса — «0кг»', () => {
  const digitsOptions: SerializeOptions = {
    ...options,
    exerciseNameById: new Map([...options.exerciseNameById, ['tbar', 'Тяга 21']]),
    exerciseTypeById: new Map([...options.exerciseTypeById, ['tbar', 'weight_reps']]),
  };
  expect(serializeExerciseLine(card('tbar', [set({ weightKg: 70, reps: 8 })]), digitsOptions)).toBe(
    'Тяга 21: 70кг х 8',
  );
  expect(serializeExerciseLine(card('tbar', []), digitsOptions)).toBe('Тяга 21:');
  expect(serializeExerciseLine(card('squat', [set({ weightKg: 70 })]), options)).toBe(
    'Приседания со штангой 70кг',
  );
  expect(
    serializeExerciseLine(
      card('pullup-weighted', [set({ weightKg: 10, reps: 8 }), set({ reps: 10 })]),
      options,
    ),
  ).toBe('Подтягивания с отягощением +10кг х 8, +0кг х 10');
  expect(
    serializeExerciseLine(card('squat', [set({ weightKg: 70, reps: 5 })]), { ...options, language: 'en' }),
  ).toBe('Приседания со штангой 70kg x 5');
});

test('тип подхода у планки пишется суффиксом после времени', () => {
  expect(
    serializeExerciseLine(
      card('plank', [set({ durationSec: 60 }), set({ durationSec: 45, type: 'warmup' })]),
      options,
    ),
  ).toBe('Планка 1:00/0:45р');
});
