import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deferredStorage } from './kvStorage';
import { newId } from '@/domain/ids';
import type { ActiveExercise, ActiveSet, ActiveWorkout, SetType, SetValues } from '@/domain/types';
import { EMPTY_SET_VALUES } from '@/domain/types';
import type { RoutineDetail } from '@/db/repo/routines';
import { getLastPerformances } from '@/db/repo/exercises';

export type EditSession = { mode: 'new' } | { mode: 'edit'; workoutId: string; finishedAt: number };

interface ActiveWorkoutState {
  workout: ActiveWorkout | null;
  session: EditSession;
  /** Drives the minimized bar: true when the active screen is not on top. */
  minimized: boolean;
  startEmpty: (name: string) => void;
  startFromRoutine: (routine: RoutineDetail, name?: string) => void;
  startFromActive: (workout: ActiveWorkout, session: EditSession) => void;
  setMinimized: (minimized: boolean) => void;
  clear: () => void;
  rename: (name: string) => void;
  setNotes: (notes: string) => void;
  setStartedAt: (startedAt: number) => void;
  addExercises: (exerciseIds: string[]) => void;
  replaceExercise: (workoutExerciseId: string, exerciseId: string) => void;
  removeExercise: (workoutExerciseId: string) => ActiveExercise | null;
  restoreExercise: (exercise: ActiveExercise, index: number) => void;
  moveExercise: (from: number, to: number) => void;
  setExerciseNote: (workoutExerciseId: string, note: string) => void;
  setExerciseRest: (workoutExerciseId: string, restSeconds: number | null) => void;
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

function makeSet(previous: SetValues | null, type: SetType = 'normal', initialValues?: SetValues): ActiveSet {
  return {
    id: newId(),
    type,
    completed: false,
    completedAt: null,
    previous,
    ...EMPTY_SET_VALUES,
    ...(initialValues ?? {}),
  };
}

/** Empty sets prefilled with "previous" values from the last time the exercise was done. */
function makeSetsFromLastPerformance(lastSets: SetValues[] | undefined): ActiveSet[] {
  const setCount = Math.max(1, lastSets?.length ?? 0);
  return Array.from({ length: setCount }, (_, setIndex) => makeSet(lastSets?.[setIndex] ?? null));
}

function nextSupersetGroup(exercises: ActiveExercise[]): number {
  return exercises.reduce((maxGroup, exercise) => Math.max(maxGroup, exercise.supersetGroup ?? 0), 0) + 1;
}

function hasAnyValue(set: SetValues): boolean {
  return set.weightKg != null || set.reps != null || set.durationSec != null || set.distanceM != null;
}

/** Values to copy from the previous performance into the empty fields of a set being completed. */
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
          const lastPerformanceByExerciseId = getLastPerformances(
            routine.exercises.map((routineExercise) => routineExercise.exerciseId),
          );
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
              sets: plannedSets.map((plannedSet, setIndex) =>
                makeSet(previousPerformance?.sets[setIndex] ?? null, plannedSet.type, {
                  weightKg: plannedSet.weightKg,
                  reps: plannedSet.reps,
                  durationSec: plannedSet.durationSec,
                  distanceM: plannedSet.distanceM,
                  rpe: plannedSet.rpe,
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
        clear: () => set({ workout: null, session: { mode: 'new' }, minimized: false }),
        rename: (name) => updateWorkout((workout) => ({ ...workout, name })),
        setNotes: (notes) => updateWorkout((workout) => ({ ...workout, notes })),
        setStartedAt: (startedAt) => updateWorkout((workout) => ({ ...workout, startedAt })),
        addExercises: (exerciseIds) => {
          const lastPerformanceByExerciseId = getLastPerformances(exerciseIds);
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
                sets: makeSetsFromLastPerformance(lastPerformanceByExerciseId.get(exerciseId)?.sets),
              })),
            ],
          }));
        },
        replaceExercise: (workoutExerciseId, exerciseId) => {
          const previousPerformance = getLastPerformances([exerciseId]).get(exerciseId);
          updateExercise(workoutExerciseId, (exercise) => ({
            ...exercise,
            exerciseId,
            note: '',
            sets: makeSetsFromLastPerformance(previousPerformance?.sets),
          }));
        },
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
            // -1 asks for a brand-new superset group.
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
            // Seed the new set with the last set's values for fast entry.
            const initialValues: SetValues | undefined = lastSet
              ? {
                  weightKg: lastSet.weightKg,
                  reps: lastSet.reps,
                  durationSec: lastSet.durationSec,
                  distanceM: lastSet.distanceM,
                  rpe: null,
                }
              : undefined;
            // The last performance only covers the sets that already exist, so an added set has no "previous".
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
          // When completing an empty set, fall back to previous values so one tap logs "same as last time".
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
      partialize: (state) => ({ workout: state.workout, session: state.session }),
    },
  ),
);
