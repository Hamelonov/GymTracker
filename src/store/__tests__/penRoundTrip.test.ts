import { serializeWorkout, type SerializeOptions } from '@/domain/pen/serializeWorkout';
import { extraFieldsForSets } from '@/domain/quickEntry/extraFieldsForSets';
import { prepareCandidates } from '@/domain/quickEntry/matchExercise';
import { parseEntryText } from '@/domain/quickEntry/parseLine';
import { resolveLine } from '@/domain/quickEntry/resolveLine';
import { toCommitSets } from '@/domain/quickEntry/toCommitSets';
import type {
  ActiveExercise,
  ActiveSet,
  ActiveWorkout,
  ExerciseType,
  ExtraField,
  SetValues,
} from '@/domain/types';
import { rebuildWorkoutFromLines, type QuickEntryCommit } from '../activeWorkoutPen';

const exercises: { id: string; name: string; type: ExerciseType }[] = [
  { id: 'squat', name: 'Приседания со штангой', type: 'weight_reps' },
  { id: 'tbar', name: 'Тяга 21', type: 'weight_reps' },
  { id: 'pullup-weighted', name: 'Подтягивания с отягощением', type: 'weighted_bodyweight' },
  { id: 'plank', name: 'Планка', type: 'duration' },
];
const candidates = prepareCandidates(
  exercises.map((exercise, order) => ({
    id: exercise.id,
    names: [exercise.name, exercise.name],
    isCustom: false,
    usageCount: 0,
    isInWorkout: true,
    order,
  })),
);
const typeByExerciseId = new Map(exercises.map((exercise) => [exercise.id, exercise.type]));
const options: SerializeOptions = {
  weightUnit: 'kg',
  distanceUnit: 'km',
  language: 'ru',
  exerciseNameById: new Map(exercises.map((exercise) => [exercise.id, exercise.name])),
  exerciseTypeById: typeByExerciseId,
};

let nextId = 0;
const set = (partial: Partial<ActiveSet>): ActiveSet => ({
  id: `set-${(nextId += 1)}`,
  type: 'normal',
  completed: true,
  completedAt: nextId,
  previous: null,
  weightKg: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rpe: null,
  rir: null,
  ...partial,
});
const card = (id: string, exerciseId: string, sets: ActiveSet[]): ActiveExercise => ({
  id,
  exerciseId,
  supersetGroup: null,
  note: `заметка ${id}`,
  restSeconds: 90,
  extraFields: [],
  sets,
});

/** Текст «Ручки» → коммиты так же, как делает экран, но без базы (все строки находятся в библиотеке). */
function commitsFromText(text: string): QuickEntryCommit[] {
  return parseEntryText(text, { weightUnit: 'kg', distanceUnit: 'km' }).map((result) => {
    if (!result.ok) throw new Error(`строка не разобралась: ${result.error.rawText}`);
    const resolved = resolveLine(result.line, candidates, typeByExerciseId, 'km');
    if (resolved.kind !== 'matched') throw new Error(`строка не найдена: ${result.line.rawText}`);
    return {
      exerciseId: resolved.exerciseId,
      sets: toCommitSets(resolved.sets),
      extraFields: extraFieldsForSets(resolved.sets, resolved.exerciseType),
    };
  });
}

const stripIds = (workout: ActiveWorkout) =>
  workout.exercises.map((exercise) => ({
    id: exercise.id,
    note: exercise.note,
    sets: exercise.sets.map(({ previous, ...rest }) => ({ ...rest, previous })),
  }));

test('Стандарт → Ручка → Стандарт без правок возвращает ту же тренировку', () => {
  const workout: ActiveWorkout = {
    id: 'w',
    name: 'Тренировка №1',
    startedAt: 0,
    routineId: null,
    notes: '',
    exercises: [
      card('squat-card', 'squat', [
        set({ weightKg: 70, reps: 9, rir: 1, rpe: 8 }),
        set({ weightKg: 70, reps: 8, rir: 1 }),
        set({ weightKg: 80, reps: 5, type: 'failure' }),
        set({ completed: false, completedAt: null, weightKg: 80, reps: 5 }),
      ]),
      card('tbar-card', 'tbar', [set({ weightKg: 60, reps: 10 })]),
      card('tbar-empty', 'tbar', []),
      card('pullup-card', 'pullup-weighted', [set({ weightKg: 10, reps: 8 }), set({ reps: 10 })]),
      card('plank-card', 'plank', [set({ durationSec: 60 }), set({ durationSec: 45, type: 'warmup' })]),
      card('empty-card', 'squat', [set({ completed: false, completedAt: null })]),
    ],
  };

  const text = serializeWorkout(workout, options);
  const rebuilt = rebuildWorkoutFromLines(
    workout,
    commitsFromText(text),
    new Map(),
    new Map<string, ExtraField[]>(),
    1000,
  );

  expect(stripIds(rebuilt)).toEqual(stripIds(workout));
});

test('новая строка в тексте занимает плановый подход карточки', () => {
  const plannedPrevious: SetValues = {
    weightKg: 65,
    reps: 8,
    durationSec: null,
    distanceM: null,
    rpe: null,
    rir: null,
  };
  const workout: ActiveWorkout = {
    id: 'w',
    name: 'Тренировка №2',
    startedAt: 0,
    routineId: null,
    notes: '',
    exercises: [
      card('squat-card', 'squat', [
        set({ weightKg: 70, reps: 8 }),
        set({
          id: 'plan',
          completed: false,
          completedAt: null,
          weightKg: 70,
          reps: 8,
          previous: plannedPrevious,
        }),
      ]),
    ],
  };
  const text = `${serializeWorkout(workout, options)}/7`;
  const rebuilt = rebuildWorkoutFromLines(
    workout,
    commitsFromText(text),
    new Map(),
    new Map<string, ExtraField[]>(),
    1000,
  );
  expect(
    rebuilt.exercises[0]?.sets.map((candidate) => [candidate.id, candidate.reps, candidate.completed]),
  ).toEqual([
    [expect.any(String), 8, true],
    ['plan', 7, true],
  ]);
  expect(rebuilt.exercises[0]?.sets[1]?.previous).toEqual(plannedPrevious);
});
