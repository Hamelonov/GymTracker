import type { ActiveExercise, ActiveSet, ActiveWorkout, SetValues } from '@/domain/types';
import { applyQuickEntry, type QuickEntryCommit } from '../activeWorkoutQuickEntry';

const values = (partial: Partial<SetValues> = {}): SetValues => ({
  weightKg: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rpe: null,
  ...partial,
});

const plannedSet = (id: string, partial: Partial<ActiveSet> = {}): ActiveSet => ({
  id,
  type: 'normal',
  completed: false,
  completedAt: null,
  previous: null,
  ...values(),
  ...partial,
});

const workoutWith = (exercises: ActiveExercise[]): ActiveWorkout => ({
  id: 'workout',
  name: 'Тренировка №1',
  startedAt: 0,
  routineId: null,
  notes: '',
  exercises,
});

const commitOf = (exerciseId: string, sets: (Partial<SetValues> & { type?: ActiveSet['type'] })[]) => ({
  exerciseId,
  sets: sets.map(({ type, ...rest }) => ({ type: type ?? 'normal', ...values(rest) })),
});

const noHistory = new Map<string, { sets: SetValues[] }>();

test('новая карточка с выполненными подходами', () => {
  const commits: QuickEntryCommit[] = [
    commitOf('squat', [
      { weightKg: 70, reps: 7 },
      { weightKg: 70, reps: 6 },
    ]),
  ];
  const outcome = applyQuickEntry(workoutWith([]), commits, noHistory, 1000);
  expect(outcome.workout.exercises).toHaveLength(1);
  const sets = outcome.workout.exercises[0]?.sets ?? [];
  expect(sets.map((set) => [set.weightKg, set.reps, set.completed, set.completedAt])).toEqual([
    [70, 7, true, 1000],
    [70, 6, true, 1000],
  ]);
  expect(outcome.addedSetCount).toBe(2);
  expect(outcome.workoutExerciseIds).toEqual([outcome.workout.exercises[0]?.id]);
});

test('заполняет запланированные пустые подходы на месте, лишние дописывает', () => {
  const previous = values({ weightKg: 65, reps: 8 });
  const card: ActiveExercise = {
    id: 'card',
    exerciseId: 'squat',
    supersetGroup: null,
    note: '',
    restSeconds: null,
    sets: [
      plannedSet('a', { completed: true, completedAt: 5, weightKg: 60, reps: 10 }),
      plannedSet('b', { previous }),
      plannedSet('c'),
    ],
  };
  const commits = [
    commitOf(
      'squat',
      [7, 6, 5].map((reps) => ({ weightKg: 70, reps })),
    ),
  ];
  const history = new Map([
    ['squat', { sets: [previous, previous, previous, values({ weightKg: 65, reps: 6 })] }],
  ]);
  const outcome = applyQuickEntry(workoutWith([card]), commits, history, 1000);
  const sets = outcome.workout.exercises[0]?.sets ?? [];
  expect(sets.map((set) => set.id).slice(0, 3)).toEqual(['a', 'b', 'c']);
  expect(sets.map((set) => [set.weightKg, set.reps, set.completed])).toEqual([
    [60, 10, true],
    [70, 7, true],
    [70, 6, true],
    [70, 5, true],
  ]);
  expect(sets[1]?.previous).toEqual(previous);
  expect(sets[3]?.previous).toEqual(values({ weightKg: 65, reps: 6 }));
  expect(outcome.addedSetCount).toBe(3);
});

test('две записи одного упражнения — одна карточка', () => {
  const commits = [
    commitOf('squat', [{ weightKg: 70, reps: 7 }]),
    commitOf('squat', [{ weightKg: 70, reps: 6 }]),
  ];
  const outcome = applyQuickEntry(workoutWith([]), commits, noHistory, 1000);
  expect(outcome.workout.exercises).toHaveLength(1);
  expect(outcome.workout.exercises[0]?.sets.map((set) => set.reps)).toEqual([7, 6]);
  expect(outcome.workoutExerciseIds).toHaveLength(1);
});

test('только название — карточка с пустыми подходами из прошлого раза, ничего не выполнено', () => {
  const history = new Map([
    ['squat', { sets: [values({ weightKg: 60, reps: 8 }), values({ weightKg: 60, reps: 8 })] }],
  ]);
  const outcome = applyQuickEntry(workoutWith([]), [commitOf('squat', [])], history, 1000);
  expect(outcome.workout.exercises[0]?.sets.map((set) => [set.completed, set.previous?.weightKg])).toEqual([
    [false, 60],
    [false, 60],
  ]);
  expect(outcome.addedSetCount).toBe(0);
});

test('тип подхода из записи сохраняется', () => {
  const commits = [commitOf('squat', [{ type: 'warmup', weightKg: 40, reps: 10 }])];
  const outcome = applyQuickEntry(workoutWith([]), commits, noHistory, 1000);
  expect(outcome.workout.exercises[0]?.sets[0]?.type).toBe('warmup');
});

test('для таймера отдыха запоминается последняя карточка, куда реально добавлены подходы', () => {
  const commits = [commitOf('squat', [{ weightKg: 70, reps: 7 }]), commitOf('bench', [])];
  const outcome = applyQuickEntry(workoutWith([]), commits, noHistory, 1000);
  expect(outcome.workoutExerciseIds).toHaveLength(2);
  expect(outcome.lastWorkoutExerciseIdWithNewSets).toBe(outcome.workout.exercises[0]?.id);
});
