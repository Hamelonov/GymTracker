import type { ActiveSet, SetType } from '@/domain/types';
import { buildSetGroups, type SetFormatOptions } from '../setFormatting';

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

const options: SetFormatOptions = { weightUnit: 'kg', distanceUnit: 'km', language: 'ru' };

const squatSets = [
  set({ weightKg: 70, reps: 9, rir: 1 }),
  set({ weightKg: 70, reps: 8, rir: 1 }),
  set({ weightKg: 80, reps: 5, type: 'failure' as SetType }),
];

function describeGroups(groups: ReturnType<typeof buildSetGroups>) {
  return groups.map((group) => [group.weightText, group.valuesText]);
}

test('вес, повторы, RIR, группы по весу и суффикс типа', () => {
  expect(describeGroups(buildSetGroups(squatSets, 'weight_reps', options))).toEqual([
    ['70кг', '9(1)/8(1)'],
    ['80кг', '5о'],
  ]);
});

test('свой вес, дополнительный вес и помощь гравитрона — без знаков «+» и «-»', () => {
  const ownWeightSets = [set({ reps: 12 }), set({ reps: 10 })];
  expect(describeGroups(buildSetGroups(ownWeightSets, 'bodyweight_reps', options))).toEqual([
    [null, '12/10'],
  ]);
  const addedWeightSets = [set({ weightKg: 10, reps: 8 })];
  expect(describeGroups(buildSetGroups(addedWeightSets, 'weighted_bodyweight', options))).toEqual([
    ['10кг', '8'],
  ]);
  const assistedSets = [set({ weightKg: 20, reps: 8 })];
  expect(describeGroups(buildSetGroups(assistedSets, 'assisted_bodyweight', options))).toEqual([
    ['20кг', '8'],
  ]);
});

test('время и дистанция', () => {
  const plankSets = [set({ durationSec: 60 }), set({ durationSec: 45 })];
  expect(describeGroups(buildSetGroups(plankSets, 'duration', options))).toEqual([[null, '1:00/0:45']]);
  const runSets = [set({ distanceM: 5000, durationSec: 1500 })];
  expect(describeGroups(buildSetGroups(runSets, 'distance_duration', options))).toEqual([
    [null, '5км 25:00'],
  ]);
  const longPlankSets = [set({ durationSec: 3750 })];
  expect(describeGroups(buildSetGroups(longPlankSets, 'duration', options))).toEqual([[null, '1:02:30']]);
});

test('тип подхода у планки пишется суффиксом после времени', () => {
  const plankSets = [set({ durationSec: 60 }), set({ durationSec: 45, type: 'warmup' })];
  expect(describeGroups(buildSetGroups(plankSets, 'duration', options))).toEqual([[null, '1:00/0:45р']]);
});

test('пустые подходы пропускаются', () => {
  const sets = [set({ weightKg: 70, reps: 5 }), set()];
  expect(describeGroups(buildSetGroups(sets, 'weight_reps', options))).toEqual([['70кг', '5']]);
});

test('английский интерфейс и фунты', () => {
  const englishOptions: SetFormatOptions = { ...options, language: 'en', weightUnit: 'lb' };
  const sets = [set({ weightKg: 70, reps: 5, type: 'failure' })];
  expect(describeGroups(buildSetGroups(sets, 'weight_reps', englishOptions))).toEqual([['154.32lb', '5f']]);
});

test('подход без повторов — только вес, подход без веса после веса сбрасывает вес в ноль', () => {
  expect(describeGroups(buildSetGroups([set({ weightKg: 70 })], 'weight_reps', options))).toEqual([
    ['70кг', ''],
  ]);
  const addedWeightSets = [set({ weightKg: 10, reps: 8 }), set({ reps: 10 })];
  expect(describeGroups(buildSetGroups(addedWeightSets, 'weighted_bodyweight', options))).toEqual([
    ['10кг', '8'],
    ['0кг', '10'],
  ]);
});

test('группы для таблиц: строка на каждый вес, у каждой группы свои подходы', () => {
  const sets = [
    set({ weightKg: 70, reps: 9, rir: 1 }),
    set({ weightKg: 70, reps: 8 }),
    set({ weightKg: 70, reps: 8 }),
    set({ weightKg: 72.5, reps: 8, rpe: 9 }),
  ];
  const groups = buildSetGroups(sets, 'weight_reps', options);
  expect(groups.map((group) => [group.weightText, group.valuesText])).toEqual([
    ['70кг', '9(1)/8/8'],
    ['72.5кг', '8'],
  ]);
  expect(groups.map((group) => group.sets.length)).toEqual([3, 1]);
  expect(groups[1]?.sets[0]?.rpe).toBe(9);
});

describe('buildSetGroups с разделителем из настроек', () => {
  const sets = [
    set({ weightKg: 70, reps: 9 }),
    set({ weightKg: 70, reps: 8 }),
    set({ weightKg: 70, reps: 8 }),
  ];

  it('по умолчанию склеивает повторы слэшем', () => {
    expect(buildSetGroups(sets, 'weight_reps', options)[0]?.valuesText).toBe('9/8/8');
  });

  it('использует свой символ вместо слэша', () => {
    expect(buildSetGroups(sets, 'weight_reps', { ...options, setSeparator: '!' })[0]?.valuesText).toBe(
      '9!8!8',
    );
    expect(buildSetGroups(sets, 'weight_reps', { ...options, setSeparator: '·' })[0]?.valuesText).toBe(
      '9·8·8',
    );
  });
});
