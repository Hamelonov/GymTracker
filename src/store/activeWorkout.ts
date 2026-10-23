import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { newId } from '@/domain/ids';
import type { ActiveExercise, ActiveSet, ActiveWorkout, SetType, SetValues } from '@/domain/types';
import { EMPTY_SET_VALUES } from '@/domain/types';
import type { RoutineDetail } from '@/db/repo/routines';
import { lastPerformances } from '@/db/repo/exercises';

export type EditSession = { mode: 'new' } | { mode: 'edit'; workoutId: string; finishedAt: number };

interface ActiveWorkoutState {
  workout: ActiveWorkout | null;
  session: EditSession;
  /** Drives the minimized bar: true when the active screen is not on top. */
  minimized: boolean;
  /** Route segment of the exercise currently targeted by the picker / superset dialog. */
  startEmpty: (name: string) => void;
  startFromRoutine: (routine: RoutineDetail, name?: string) => void;
  startFromActive: (w: ActiveWorkout, session: EditSession) => void;
  setMinimized: (v: boolean) => void;
  clear: () => void;
  rename: (name: string) => void;
  setNotes: (notes: string) => void;
  setStartedAt: (ts: number) => void;
  addExercises: (exerciseIds: string[]) => void;
  replaceExercise: (activeId: string, exerciseId: string) => void;
  removeExercise: (activeId: string) => ActiveExercise | null;
  restoreExercise: (ex: ActiveExercise, index: number) => void;
  moveExercise: (from: number, to: number) => void;
  setExerciseNote: (activeId: string, note: string) => void;
  setExerciseRest: (activeId: string, restSeconds: number | null) => void;
  setSuperset: (activeIds: string[], group: number | null) => void;
  addSet: (activeId: string) => void;
  updateSet: (activeId: string, setId: string, patch: Partial<SetValues> & { type?: SetType }) => void;
  toggleSet: (activeId: string, setId: string) => { completed: boolean; restSeconds: number | null } | null;
  removeSet: (activeId: string, setId: string) => { set: ActiveSet; index: number } | null;
  restoreSet: (activeId: string, set: ActiveSet, index: number) => void;
  completeAllSets: () => void;
}

const kvStorage = {
  getItem: (name: string) => Storage.getItemSync(name),
  setItem: (name: string, value: string) => Storage.setItemSync(name, value),
  removeItem: (name: string) => {
    Storage.removeItemSync(name);
  },
};

function makeSet(previous: SetValues | null, type: SetType = 'normal', seed?: SetValues): ActiveSet {
  return {
    id: newId(),
    type,
    completed: false,
    completedAt: null,
    previous,
    ...EMPTY_SET_VALUES,
    ...(seed ?? {}),
  };
}

function nextSupersetGroup(exs: ActiveExercise[]): number {
  return exs.reduce((m, e) => Math.max(m, e.supersetGroup ?? 0), 0) + 1;
}

export const useActiveWorkout = create<ActiveWorkoutState>()(
  persist(
    (set, get) => {
      const update = (fn: (w: ActiveWorkout) => ActiveWorkout) => {
        const w = get().workout;
        if (!w) return;
        set({ workout: fn(w) });
      };
      const updateExercise = (activeId: string, fn: (e: ActiveExercise) => ActiveExercise) =>
        update((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === activeId ? fn(e) : e)) }));

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
          const prev = lastPerformances(routine.exercises.map((e) => e.exerciseId));
          const exercises: ActiveExercise[] = routine.exercises.map((re) => {
            const p = prev.get(re.exerciseId);
            const planned = re.sets.length > 0 ? re.sets : [{ type: 'normal' as SetType, ...EMPTY_SET_VALUES }];
            return {
              id: newId(),
              exerciseId: re.exerciseId,
              supersetGroup: re.supersetGroup,
              note: '',
              restSeconds: re.restSeconds,
              sets: planned.map((s, i) =>
                makeSet(p?.sets[i] ?? null, s.type, {
                  weightKg: s.weightKg,
                  reps: s.reps,
                  durationSec: s.durationSec,
                  distanceM: s.distanceM,
                  rpe: s.rpe,
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
        startFromActive: (w, session) => set({ workout: w, session, minimized: false }),
        setMinimized: (v) => set({ minimized: v }),
        clear: () => set({ workout: null, session: { mode: 'new' }, minimized: false }),
        rename: (name) => update((w) => ({ ...w, name })),
        setNotes: (notes) => update((w) => ({ ...w, notes })),
        setStartedAt: (ts) => update((w) => ({ ...w, startedAt: ts })),
        addExercises: (exerciseIds) => {
          const prev = lastPerformances(exerciseIds);
          update((w) => ({
            ...w,
            exercises: [
              ...w.exercises,
              ...exerciseIds.map((exerciseId) => {
                const p = prev.get(exerciseId);
                const count = Math.max(1, p?.sets.length ?? 0);
                return {
                  id: newId(),
                  exerciseId,
                  supersetGroup: null,
                  note: '',
                  restSeconds: null,
                  sets: Array.from({ length: count }, (_, i) => makeSet(p?.sets[i] ?? null)),
                };
              }),
            ],
          }));
        },
        replaceExercise: (activeId, exerciseId) => {
          const p = lastPerformances([exerciseId]).get(exerciseId);
          updateExercise(activeId, (e) => ({
            ...e,
            exerciseId,
            note: '',
            sets: Array.from({ length: Math.max(1, p?.sets.length ?? 0) }, (_, i) => makeSet(p?.sets[i] ?? null)),
          }));
        },
        removeExercise: (activeId) => {
          const w = get().workout;
          const ex = w?.exercises.find((e) => e.id === activeId) ?? null;
          update((w2) => ({ ...w2, exercises: w2.exercises.filter((e) => e.id !== activeId) }));
          return ex;
        },
        restoreExercise: (ex, index) =>
          update((w) => {
            const list = [...w.exercises];
            list.splice(Math.min(index, list.length), 0, ex);
            return { ...w, exercises: list };
          }),
        moveExercise: (from, to) =>
          update((w) => {
            const list = [...w.exercises];
            const [item] = list.splice(from, 1);
            if (!item) return w;
            list.splice(to, 0, item);
            return { ...w, exercises: list };
          }),
        setExerciseNote: (activeId, note) => updateExercise(activeId, (e) => ({ ...e, note })),
        setExerciseRest: (activeId, restSeconds) => updateExercise(activeId, (e) => ({ ...e, restSeconds })),
        setSuperset: (activeIds, group) =>
          update((w) => {
            const g = group === -1 ? nextSupersetGroup(w.exercises) : group;
            return { ...w, exercises: w.exercises.map((e) => (activeIds.includes(e.id) ? { ...e, supersetGroup: g } : e)) };
          }),
        addSet: (activeId) =>
          updateExercise(activeId, (e) => {
            const last = e.sets[e.sets.length - 1];
            const prevIndex = e.sets.length;
            // Seed the new set with the last set's values for fast entry.
            const seed: SetValues | undefined = last
              ? { weightKg: last.weightKg, reps: last.reps, durationSec: last.durationSec, distanceM: last.distanceM, rpe: null }
              : undefined;
            const previous = last?.previous ? (e.sets[prevIndex]?.previous ?? null) : null;
            return { ...e, sets: [...e.sets, makeSet(previous, last?.type === 'warmup' ? 'normal' : 'normal', seed)] };
          }),
        updateSet: (activeId, setId, patch) =>
          updateExercise(activeId, (e) => ({
            ...e,
            sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
          })),
        toggleSet: (activeId, setId) => {
          const w = get().workout;
          const ex = w?.exercises.find((e) => e.id === activeId);
          const s = ex?.sets.find((x) => x.id === setId);
          if (!ex || !s) return null;
          const completed = !s.completed;
          // When completing an empty set, fall back to previous values so one tap logs "same as last time".
          const fill: Partial<SetValues> = {};
          if (completed && s.previous) {
            if (s.weightKg == null && s.previous.weightKg != null) fill.weightKg = s.previous.weightKg;
            if (s.reps == null && s.previous.reps != null) fill.reps = s.previous.reps;
            if (s.durationSec == null && s.previous.durationSec != null) fill.durationSec = s.previous.durationSec;
            if (s.distanceM == null && s.previous.distanceM != null) fill.distanceM = s.previous.distanceM;
          }
          updateExercise(activeId, (e) => ({
            ...e,
            sets: e.sets.map((x) => (x.id === setId ? { ...x, ...fill, completed, completedAt: completed ? Date.now() : null } : x)),
          }));
          return { completed, restSeconds: ex.restSeconds };
        },
        removeSet: (activeId, setId) => {
          const w = get().workout;
          const ex = w?.exercises.find((e) => e.id === activeId);
          const index = ex?.sets.findIndex((s) => s.id === setId) ?? -1;
          const s = index >= 0 ? ex?.sets[index] : undefined;
          if (!s) return null;
          updateExercise(activeId, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== setId) }));
          return { set: s, index };
        },
        restoreSet: (activeId, s, index) =>
          updateExercise(activeId, (e) => {
            const list = [...e.sets];
            list.splice(Math.min(index, list.length), 0, s);
            return { ...e, sets: list };
          }),
        completeAllSets: () =>
          update((w) => ({
            ...w,
            exercises: w.exercises.map((e) => ({
              ...e,
              sets: e.sets.map((s) => {
                if (s.completed) return s;
                const hasValue = s.weightKg != null || s.reps != null || s.durationSec != null || s.distanceM != null;
                const prev = s.previous;
                if (!hasValue && !prev) return s;
                return {
                  ...s,
                  weightKg: s.weightKg ?? prev?.weightKg ?? null,
                  reps: s.reps ?? prev?.reps ?? null,
                  durationSec: s.durationSec ?? prev?.durationSec ?? null,
                  distanceM: s.distanceM ?? prev?.distanceM ?? null,
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
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => ({ workout: s.workout, session: s.session }),
    },
  ),
);
