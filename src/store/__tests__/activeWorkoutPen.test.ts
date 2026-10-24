import type { ActiveExercise, ActiveSet, ActiveWorkout, ExtraField, SetValues } from '@/domain/types';
import { rebuildWorkoutFromLines, type QuickEntryCommit } from '../activeWorkoutPen';

const values = (partial: Partial<SetValues> = {}): SetValues => ({
  weightKg: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rpe: null,
  rir: null,
  ...partial,
});

const activeSet = (id: string, partial: Partial<ActiveSet> = {}): ActiveSet => ({
  id,
  type: 'normal',
  completed: false,
  completedAt: null,
  previous: null,
  ...values(),
  ...partial,
});

const card = (
  id: string,
  exerciseId: string,
  sets: ActiveSet[],
  extraFields: ExtraField[] = [],
): ActiveExercise => ({
  id,
  exerciseId,
  supersetGroup: null,
  note: 'заметка',
  restSeconds: 120,
  extraFields,
  sets,
});

const workoutWith = (exercises: ActiveExercise[]): ActiveWorkout => ({
  id: 'workout',
  name: 'Тренировка №1',
  startedAt: 0,
  routineId: null,
  notes: '',
  exercises,
});

const commitOf = (
  exerciseId: string,
  sets: (Partial<SetValues> & { type?: ActiveSet['type'] })[],
  extraFields: ExtraField[] = [],
): QuickEntryCommit => ({
  exerciseId,
  sets: sets.map(({ type, ...rest }) => ({ type: type ?? 'normal', ...values(rest) })),
  extraFields,
});

const noHistory = new Map<string, { sets: SetValues[] }>();
const noRemembered = new Map<string, ExtraField[]>();

test('подходы из текста занимают выполненные по позициям, затем план по порядку', () => {
  const existing = card('card', 'squat', [
    activeSet('a', { completed: true, completedAt: 5, weightKg: 70, reps: 8, rpe: 8 }),
    activeSet('b', { weightKg: 70, reps: 7 }),
    activeSet('plan', { previous: values({ weightKg: 65, reps: 8 }) }),
  ]);
  const commits = [
    commitOf('squat', [
      { weightKg: 70, reps: 8, rir: 1 },
      { weightKg: 70, reps: 7 },
      { weightKg: 70, reps: 6 },
    ]),
  ];
  const rebuilt = rebuildWorkoutFromLines(workoutWith([existing]), commits, noHistory, noRemembered, 1000);
  const sets = rebuilt.exercises[0]?.sets ?? [];
  expect(sets.map((set) => set.id)).toEqual(['a', 'b', 'plan']);
  expect(sets.map((set) => [set.reps, set.completed, set.completedAt])).toEqual([
    [8, true, 5],
    [7, true, 1000],
    [6, true, 1000],
  ]);
  expect(sets[0]).toMatchObject({ rir: 1, rpe: 8 });
  expect(sets[2]?.previous).toEqual(values({ weightKg: 65, reps: 8 }));
  expect(rebuilt.exercises[0]).toMatchObject({ id: 'card', note: 'заметка', restSeconds: 120 });
});

test('карточки вне текста удаляются, порядок — по строкам', () => {
  const workout = workoutWith([
    card('squat-card', 'squat', [activeSet('s', { completed: true, weightKg: 70, reps: 5 })]),
    card('bench-card', 'bench', [activeSet('b', { completed: true, weightKg: 60, reps: 5 })]),
    card('row-card', 'row', []),
  ]);
  const commits = [
    commitOf('row', [{ weightKg: 50, reps: 10 }]),
    commitOf('squat', [{ weightKg: 70, reps: 5 }]),
  ];
  const rebuilt = rebuildWorkoutFromLines(workout, commits, noHistory, noRemembered, 1000);
  expect(rebuilt.exercises.map((exercise) => exercise.id)).toEqual(['row-card', 'squat-card']);
});

test('две строки одного упражнения — одна карточка с подходами подряд', () => {
  const commits = [
    commitOf('squat', [{ weightKg: 70, reps: 7 }]),
    commitOf('squat', [{ weightKg: 70, reps: 6 }]),
  ];
  const rebuilt = rebuildWorkoutFromLines(workoutWith([]), commits, noHistory, noRemembered, 1000);
  expect(rebuilt.exercises).toHaveLength(1);
  expect(rebuilt.exercises[0]?.sets.map((set) => set.reps)).toEqual([7, 6]);
});

test('новая карточка берёт запомненные поля и поля из строки, прошлое — по индексу', () => {
  const history = new Map([['squat', { sets: [values({ weightKg: 65, reps: 8 })] }]]);
  const remembered = new Map<string, ExtraField[]>([['squat', ['rpe']]]);
  const rebuilt = rebuildWorkoutFromLines(
    workoutWith([]),
    [commitOf('squat', [{ weightKg: 70, reps: 8, rir: 1 }], ['rir'])],
    history,
    remembered,
    1000,
  );
  expect(rebuilt.exercises[0]?.extraFields).toEqual(['rir', 'rpe']);
  expect(rebuilt.exercises[0]?.sets[0]?.previous).toEqual(values({ weightKg: 65, reps: 8 }));
});

test('вес из текста не сдвигает старый вес, если совпадает с точностью до 0,01 кг', () => {
  const existing = card('card', 'squat', [
    activeSet('a', { completed: true, completedAt: 5, weightKg: 45.359237, reps: 5 }),
  ]);
  const rebuilt = rebuildWorkoutFromLines(
    workoutWith([existing]),
    [commitOf('squat', [{ weightKg: 45.36, reps: 5 }])],
    noHistory,
    noRemembered,
    1000,
  );
  expect(rebuilt.exercises[0]?.sets[0]?.weightKg).toBe(45.359237);
});

test('только название: у существующей карточки остаётся план, у новой — пустые из прошлого раза', () => {
  const existing = card('card', 'squat', [
    activeSet('done', { completed: true, weightKg: 70, reps: 8 }),
    activeSet('plan'),
  ]);
  const rebuilt = rebuildWorkoutFromLines(
    workoutWith([existing]),
    [commitOf('squat', [])],
    noHistory,
    noRemembered,
    1000,
  );
  expect(rebuilt.exercises[0]?.sets.map((set) => set.id)).toEqual(['plan']);

  const history = new Map([
    ['bench', { sets: [values({ weightKg: 60, reps: 8 }), values({ weightKg: 60, reps: 8 })] }],
  ]);
  const fresh = rebuildWorkoutFromLines(
    workoutWith([]),
    [commitOf('bench', [])],
    history,
    noRemembered,
    1000,
  );
  expect(fresh.exercises[0]?.sets.map((set) => [set.completed, set.previous?.weightKg])).toEqual([
    [false, 60],
    [false, 60],
  ]);
});

test('вторая строка того же упражнения идёт во вторую карточку, лишние — в последнюю', () => {
  const first = card('first', 'bench', [
    activeSet('f1', { completed: true, completedAt: 5, weightKg: 60, reps: 8 }),
  ]);
  const second = {
    ...card('second', 'bench', [
      activeSet('s1', { completed: true, completedAt: 6, weightKg: 50, reps: 12 }),
    ]),
    note: 'вторая',
  };
  const commits = [
    commitOf('bench', [{ weightKg: 60, reps: 8 }]),
    commitOf('bench', [{ weightKg: 50, reps: 12 }]),
    commitOf('bench', [{ weightKg: 40, reps: 15 }]),
  ];
  const rebuilt = rebuildWorkoutFromLines(
    workoutWith([first, second]),
    commits,
    noHistory,
    noRemembered,
    1000,
  );
  expect(rebuilt.exercises.map((exercise) => exercise.id)).toEqual(['first', 'second']);
  expect(rebuilt.exercises[1]?.note).toBe('вторая');
  expect(rebuilt.exercises[1]?.sets.map((set) => [set.id, set.reps, set.completedAt])).toEqual([
    ['s1', 12, 6],
    [expect.any(String), 15, 1000],
  ]);
});

test('выполненные пустые подходы не сдвигают позиции', () => {
  const existing = card('card', 'squat', [
    activeSet('empty', { completed: true, completedAt: 3 }),
    activeSet('done', { completed: true, completedAt: 4, weightKg: 70, reps: 8 }),
  ]);
  const rebuilt = rebuildWorkoutFromLines(
    workoutWith([existing]),
    [commitOf('squat', [{ weightKg: 70, reps: 8 }])],
    noHistory,
    noRemembered,
    1000,
  );
  expect(rebuilt.exercises[0]?.sets.map((set) => [set.id, set.completedAt])).toEqual([['done', 4]]);
});
