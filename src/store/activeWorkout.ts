import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deferredStorage } from './kvStorage';
import { makeSet, makeSetsFromLastPerformance } from './activeWorkoutSets';
import { normalizeActiveWorkout } from './normalizeActiveWorkout';
import { newId } from '@/domain/ids';
import type {
  ActiveExercise,
  ActiveSet,
  ActiveWorkout,
  ExtraField,
  SetType,
  SetValues,
} from '@/domain/types';
import { EMPTY_SET_VALUES, getSetFieldsForExerciseType } from '@/domain/types';
import { initialExtraFields } from '@/domain/extraFields';
import type { RoutineDetail } from '@/db/repo/routines';
import { getExercisesByIds, getLastPerformances } from '@/db/repo/exercises';

/**
 * С какими дополнительными колонками создаётся карточка: запомненные у упражнения плюс «Вес»,
 * если у упражнения без поля веса вес уже был в прошлый раз или запланирован — иначе он заполнился бы невидимо.
 */
function getInitialExtraFields(
  exerciseIds: string[],
  setsByExerciseId: Map<string, SetValues[]>,
): Map<string, ExtraField[]> {
  const rows = getExercisesByIds(exerciseIds);
  return new Map(
    exerciseIds.map((exerciseId) => {
      const row = rows.get(exerciseId);
      const fields = getSetFieldsForExerciseType(row?.type ?? 'weight_reps');
      return [
        exerciseId,
        initialExtraFields(row?.rememberedExtraFields ?? [], setsByExerciseId.get(exerciseId) ?? [], fields),
      ];
    }),
  );
}

/**
 * `isNewEntry` — тренировка вводится задним числом и ещё не лежит в базе: её нужно вставить, а не обновить.
 */
export type EditSession =
  { mode: 'new' } | { mode: 'edit'; workoutId: string; finishedAt: number; isNewEntry?: boolean };

interface ActiveWorkoutState {
  workout: ActiveWorkout | null;
  session: EditSession;
  /** Управляет свёрнутой панелью: true, когда экран активной тренировки не на переднем плане. */
  minimized: boolean;
  startEmpty: (name: string) => void;
  startFromRoutine: (routine: RoutineDetail, name?: string) => void;
  startFromActive: (workout: ActiveWorkout, session: EditSession) => void;
  setMinimized: (minimized: boolean) => void;
  clear: () => void;
  rename: (name: string) => void;
  setNotes: (notes: string) => void;
  setStartedAt: (startedAt: number) => void;
  /** Меняет длительность правки: конец отсчитывается от времени начала. У живой тренировки не действует. */
  setSessionDuration: (durationSec: number) => void;
  /** Двигает время начала правки и переносит конец следом: длительность остаётся прежней. */
  setSessionStartedAt: (startedAt: number) => void;
  addExercises: (exerciseIds: string[]) => void;
  replaceExercise: (workoutExerciseId: string, exerciseId: string) => void;
  removeExercise: (workoutExerciseId: string) => ActiveExercise | null;
  restoreExercise: (exercise: ActiveExercise, index: number) => void;
  moveExercise: (from: number, to: number) => void;
  setExerciseNote: (workoutExerciseId: string, note: string) => void;
  setExerciseRest: (workoutExerciseId: string, restSeconds: number | null) => void;
  /** Меняет только список включённых колонок; введённые значения скрытых полей не стираются. */
  setExtraFields: (workoutExerciseId: string, extraFields: ExtraField[]) => void;
  setSuperset: (workoutExerciseIds: string[], group: number | null) => void;
  addSet: (workoutExerciseId: string) => void;
  updateSet: (
    workoutExerciseId: string,
    setId: string,
    patch: Partial<SetValues> & { type?: SetType },
  ) => void;
  toggleSet: (
    workoutExerciseId: string,
    setId: string,
  ) => { completed: boolean; restSeconds: number | null } | null;
  removeSet: (workoutExerciseId: string, setId: string) => { set: ActiveSet; index: number } | null;
  restoreSet: (workoutExerciseId: string, set: ActiveSet, index: number) => void;
  completeAllSets: () => void;
}

function nextSupersetGroup(exercises: ActiveExercise[]): number {
  return exercises.reduce((maxGroup, exercise) => Math.max(maxGroup, exercise.supersetGroup ?? 0), 0) + 1;
}

function hasAnyValue(set: SetValues): boolean {
  return set.weightKg != null || set.reps != null || set.durationSec != null || set.distanceM != null;
}

/** Значения, которые копируются из прошлого выполнения в пустые поля завершаемого подхода. */
function valuesToFillFromPrevious(set: ActiveSet): Partial<SetValues> {
  const fill: Partial<SetValues> = {};
  const previous = set.previous;
  if (!previous) return fill;
  if (set.weightKg == null && previous.weightKg != null) fill.weightKg = previous.weightKg;
  if (set.reps == null && previous.reps != null) fill.reps = previous.reps;
  if (set.durationSec == null && previous.durationSec != null) fill.durationSec = previous.durationSec;
  if (set.distanceM == null && previous.distanceM != null) fill.distanceM = previous.distanceM;
  return fill;
}

export const useActiveWorkout = create<ActiveWorkoutState>()(
  persist(
    (set, get) => {
      const updateWorkout = (transform: (workout: ActiveWorkout) => ActiveWorkout) => {
        const workout = get().workout;
        if (!workout) return;
        set({ workout: transform(workout) });
      };
      const updateExercise = (
        workoutExerciseId: string,
        transform: (exercise: ActiveExercise) => ActiveExercise,
      ) =>
        updateWorkout((workout) => ({
          ...workout,
          exercises: workout.exercises.map((exercise) =>
            exercise.id === workoutExerciseId ? transform(exercise) : exercise,
          ),
        }));

      return {
        workout: null,
        session: { mode: 'new' },
        minimized: true,
        startEmpty: (name) =>
          set({
            workout: { id: newId(), name, startedAt: Date.now(), routineId: null, notes: '', exercises: [] },
            session: { mode: 'new' },
            minimized: false,
          }),
        startFromRoutine: (routine, name) => {
          const routineExerciseIds = routine.exercises.map((routineExercise) => routineExercise.exerciseId);
          const lastPerformanceByExerciseId = getLastPerformances(routineExerciseIds);
          const plannedSetsByExerciseId = new Map(
            routine.exercises.map((routineExercise) => [
              routineExercise.exerciseId,
              [
                // Из запланированных подходов важен только вес: он решает, показывать ли колонку «Вес».
                ...routineExercise.sets.map((plannedSet) => ({
                  ...EMPTY_SET_VALUES,
                  weightKg: plannedSet.weightKg,
                })),
                ...(lastPerformanceByExerciseId.get(routineExercise.exerciseId)?.sets ?? []),
              ],
            ]),
          );
          const extraFieldsByExerciseId = getInitialExtraFields(routineExerciseIds, plannedSetsByExerciseId);
          const exercises: ActiveExercise[] = routine.exercises.map((routineExercise) => {
            const previousPerformance = lastPerformanceByExerciseId.get(routineExercise.exerciseId);
            const plannedSets =
              routineExercise.sets.length > 0
                ? routineExercise.sets
                : [{ type: 'normal' as SetType, ...EMPTY_SET_VALUES }];
            return {
              id: newId(),
              exerciseId: routineExercise.exerciseId,
              supersetGroup: routineExercise.supersetGroup,
              note: '',
              restSeconds: routineExercise.restSeconds,
              extraFields: extraFieldsByExerciseId.get(routineExercise.exerciseId) ?? [],
              sets: plannedSets.map((plannedSet, setIndex) =>
                makeSet(previousPerformance?.sets[setIndex] ?? null, plannedSet.type, {
                  weightKg: plannedSet.weightKg,
                  reps: plannedSet.reps,
                  durationSec: plannedSet.durationSec,
                  distanceM: plannedSet.distanceM,
                  rpe: plannedSet.rpe,
                  rir: null,
                }),
              ),
            };
          });
          set({
            workout: {
              id: newId(),
              name: name ?? routine.name,
              startedAt: Date.now(),
              routineId: routine.id,
              notes: '',
              exercises,
            },
            session: { mode: 'new' },
            minimized: false,
          });
        },
        startFromActive: (workout, session) => set({ workout, session, minimized: false }),
        setMinimized: (minimized) => set({ minimized }),
        clear: () =>
          set({
            workout: null,
            session: { mode: 'new' },
            minimized: false,
          }),
        rename: (name) => updateWorkout((workout) => ({ ...workout, name })),
        setNotes: (notes) => updateWorkout((workout) => ({ ...workout, notes })),
        setStartedAt: (startedAt) => updateWorkout((workout) => ({ ...workout, startedAt })),
        setSessionStartedAt: (startedAt) => {
          const { workout, session } = get();
          if (!workout || session.mode !== 'edit') return;
          const durationMs = session.finishedAt - workout.startedAt;
          set({
            workout: { ...workout, startedAt },
            session: { ...session, finishedAt: startedAt + durationMs },
          });
        },
        setSessionDuration: (durationSec) => {
          const { workout, session } = get();
          if (!workout || session.mode !== 'edit') return;
          set({ session: { ...session, finishedAt: workout.startedAt + durationSec * 1000 } });
        },
        addExercises: (exerciseIds) => {
          const lastPerformanceByExerciseId = getLastPerformances(exerciseIds);
          const previousSetsByExerciseId = new Map(
            exerciseIds.map((exerciseId) => [
              exerciseId,
              lastPerformanceByExerciseId.get(exerciseId)?.sets ?? [],
            ]),
          );
          const extraFieldsByExerciseId = getInitialExtraFields(exerciseIds, previousSetsByExerciseId);
          updateWorkout((workout) => ({
            ...workout,
            exercises: [
              ...workout.exercises,
              ...exerciseIds.map((exerciseId) => ({
                id: newId(),
                exerciseId,
                supersetGroup: null,
                note: '',
                restSeconds: null,
                extraFields: extraFieldsByExerciseId.get(exerciseId) ?? [],
                sets: makeSetsFromLastPerformance(lastPerformanceByExerciseId.get(exerciseId)?.sets),
              })),
            ],
          }));
        },
        replaceExercise: (workoutExerciseId, exerciseId) => {
          const previousPerformance = getLastPerformances([exerciseId]).get(exerciseId);
          const extraFields =
            getInitialExtraFields([exerciseId], new Map([[exerciseId, previousPerformance?.sets ?? []]])).get(
              exerciseId,
            ) ?? [];
          updateExercise(workoutExerciseId, (exercise) => ({
            ...exercise,
            exerciseId,
            note: '',
            extraFields,
            sets: makeSetsFromLastPerformance(previousPerformance?.sets),
          }));
        },
        setExtraFields: (workoutExerciseId, extraFields) =>
          updateExercise(workoutExerciseId, (exercise) => ({ ...exercise, extraFields })),
        removeExercise: (workoutExerciseId) => {
          const removedExercise =
            get().workout?.exercises.find((exercise) => exercise.id === workoutExerciseId) ?? null;
          updateWorkout((workout) => ({
            ...workout,
            exercises: workout.exercises.filter((exercise) => exercise.id !== workoutExerciseId),
          }));
          return removedExercise;
        },
        restoreExercise: (exercise, index) =>
          updateWorkout((workout) => {
            const exercises = [...workout.exercises];
            exercises.splice(Math.min(index, exercises.length), 0, exercise);
            return { ...workout, exercises };
          }),
        moveExercise: (from, to) =>
          updateWorkout((workout) => {
            const exercises = [...workout.exercises];
            const [movedExercise] = exercises.splice(from, 1);
            if (!movedExercise) return workout;
            exercises.splice(to, 0, movedExercise);
            return { ...workout, exercises };
          }),
        setExerciseNote: (workoutExerciseId, note) =>
          updateExercise(workoutExerciseId, (exercise) => ({ ...exercise, note })),
        setExerciseRest: (workoutExerciseId, restSeconds) =>
          updateExercise(workoutExerciseId, (exercise) => ({ ...exercise, restSeconds })),
        setSuperset: (workoutExerciseIds, group) =>
          updateWorkout((workout) => {
            // -1 означает создать новую группу суперсета.
            const supersetGroup = group === -1 ? nextSupersetGroup(workout.exercises) : group;
            return {
              ...workout,
              exercises: workout.exercises.map((exercise) =>
                workoutExerciseIds.includes(exercise.id) ? { ...exercise, supersetGroup } : exercise,
              ),
            };
          }),
        addSet: (workoutExerciseId) =>
          updateExercise(workoutExerciseId, (exercise) => {
            const lastSet = exercise.sets[exercise.sets.length - 1];
            // Заполняем новый подход значениями последнего для быстрого ввода.
            const initialValues: SetValues | undefined = lastSet
              ? {
                  weightKg: lastSet.weightKg,
                  reps: lastSet.reps,
                  durationSec: lastSet.durationSec,
                  distanceM: lastSet.distanceM,
                  rpe: null,
                  rir: null,
                }
              : undefined;
            // Прошлое выполнение покрывает только уже существующие подходы, поэтому у добавленного нет «прошлого».
            return {
              ...exercise,
              sets: [...exercise.sets, makeSet(null, 'normal', initialValues)],
            };
          }),
        updateSet: (workoutExerciseId, setId, patch) =>
          updateExercise(workoutExerciseId, (exercise) => ({
            ...exercise,
            sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
          })),
        toggleSet: (workoutExerciseId, setId) => {
          const exercise = get().workout?.exercises.find((candidate) => candidate.id === workoutExerciseId);
          const toggledSet = exercise?.sets.find((set) => set.id === setId);
          if (!exercise || !toggledSet) return null;
          const completed = !toggledSet.completed;
          // При завершении пустого подхода берём прошлые значения, чтобы один тап записывал «как в прошлый раз».
          const fill = completed ? valuesToFillFromPrevious(toggledSet) : {};
          updateExercise(workoutExerciseId, (currentExercise) => ({
            ...currentExercise,
            sets: currentExercise.sets.map((set) =>
              set.id === setId
                ? { ...set, ...fill, completed, completedAt: completed ? Date.now() : null }
                : set,
            ),
          }));
          return { completed, restSeconds: exercise.restSeconds };
        },
        removeSet: (workoutExerciseId, setId) => {
          const exercise = get().workout?.exercises.find((candidate) => candidate.id === workoutExerciseId);
          const index = exercise?.sets.findIndex((set) => set.id === setId) ?? -1;
          const removedSet = index >= 0 ? exercise?.sets[index] : undefined;
          if (!removedSet) return null;
          updateExercise(workoutExerciseId, (currentExercise) => ({
            ...currentExercise,
            sets: currentExercise.sets.filter((set) => set.id !== setId),
          }));
          return { set: removedSet, index };
        },
        restoreSet: (workoutExerciseId, restoredSet, index) =>
          updateExercise(workoutExerciseId, (exercise) => {
            const sets = [...exercise.sets];
            sets.splice(Math.min(index, sets.length), 0, restoredSet);
            return { ...exercise, sets };
          }),
        completeAllSets: () =>
          updateWorkout((workout) => ({
            ...workout,
            exercises: workout.exercises.map((exercise) => ({
              ...exercise,
              sets: exercise.sets.map((set) => {
                if (set.completed) return set;
                const previous = set.previous;
                if (!hasAnyValue(set) && !previous) return set;
                return {
                  ...set,
                  weightKg: set.weightKg ?? previous?.weightKg ?? null,
                  reps: set.reps ?? previous?.reps ?? null,
                  durationSec: set.durationSec ?? previous?.durationSec ?? null,
                  distanceM: set.distanceM ?? previous?.distanceM ?? null,
                  completed: true,
                  completedAt: Date.now(),
                };
              }),
            })),
          })),
      };
    },
    {
      name: 'active-workout',
      storage: createJSONStorage(() => deferredStorage),
      partialize: (state) => ({
        workout: state.workout,
        session: state.session,
      }),
      // Берём из сохранённого только тренировку и сессию: тренировка прошлой версии могла не иметь новых полей,
      // а ключи удалённого режима «Ручка» (entryMode, penText) в старых сохранениях отбрасываются.
      merge: (persisted, current) => {
        const persistedState = (persisted ?? {}) as Partial<ActiveWorkoutState>;
        return {
          ...current,
          workout: normalizeActiveWorkout(persistedState.workout ?? null),
          session: persistedState.session ?? current.session,
        };
      },
    },
  ),
);
