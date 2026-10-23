import { create } from 'zustand';
import type { RoutineDetail, RoutineExerciseInput, RoutineSetInput } from '@/db/repo/routines';
import { newId } from '@/domain/ids';
import { EMPTY_SET_VALUES, type SetValues, type SetType } from '@/domain/types';

export interface DraftSet extends RoutineSetInput {
  id: string;
}
export interface DraftExercise extends Omit<RoutineExerciseInput, 'sets'> {
  id: string;
  sets: DraftSet[];
}

interface RoutineDraftState {
  id: string | null;
  name: string;
  notes: string;
  folderId: string | null;
  exercises: DraftExercise[];
  reset: (r?: RoutineDetail) => void;
  setName: (v: string) => void;
  setNotes: (v: string) => void;
  setFolder: (v: string | null) => void;
  addExercises: (ids: string[]) => void;
  removeExercise: (id: string) => void;
  move: (from: number, to: number) => void;
  setRest: (id: string, v: number | null) => void;
  setNote: (id: string, v: string) => void;
  setSuperset: (ids: string[], group: number | null) => void;
  addSet: (id: string) => void;
  updateSet: (id: string, setId: string, patch: Partial<SetValues> & { type?: SetType }) => void;
  removeSet: (id: string, setId: string) => void;
}

const newSet = (seed?: Partial<RoutineSetInput>): DraftSet => ({ id: newId(), type: 'normal', ...EMPTY_SET_VALUES, ...seed });

export const useRoutineDraft = create<RoutineDraftState>((set, get) => {
  const upd = (id: string, fn: (e: DraftExercise) => DraftExercise) => set({ exercises: get().exercises.map((e) => (e.id === id ? fn(e) : e)) });
  return {
    id: null,
    name: '',
    notes: '',
    folderId: null,
    exercises: [],
    reset: (r) =>
      set({
        id: r?.id ?? null,
        name: r?.name ?? '',
        notes: r?.notes ?? '',
        folderId: r?.folderId ?? null,
        exercises:
          r?.exercises.map((e) => ({
            id: newId(),
            exerciseId: e.exerciseId,
            supersetGroup: e.supersetGroup,
            restSeconds: e.restSeconds,
            note: e.note,
            sets: e.sets.map((s) => ({ id: newId(), type: s.type, weightKg: s.weightKg, reps: s.reps, durationSec: s.durationSec, distanceM: s.distanceM, rpe: s.rpe })),
          })) ?? [],
      }),
    setName: (name) => set({ name }),
    setNotes: (notes) => set({ notes }),
    setFolder: (folderId) => set({ folderId }),
    addExercises: (ids) =>
      set({
        exercises: [
          ...get().exercises,
          ...ids.map((exerciseId) => ({ id: newId(), exerciseId, supersetGroup: null, restSeconds: null, note: '', sets: [newSet(), newSet(), newSet()] })),
        ],
      }),
    removeExercise: (id) => set({ exercises: get().exercises.filter((e) => e.id !== id) }),
    move: (from, to) => {
      const list = [...get().exercises];
      const [item] = list.splice(from, 1);
      if (!item) return;
      list.splice(to, 0, item);
      set({ exercises: list });
    },
    setRest: (id, restSeconds) => upd(id, (e) => ({ ...e, restSeconds })),
    setNote: (id, note) => upd(id, (e) => ({ ...e, note })),
    setSuperset: (ids, group) => {
      const g = group === -1 ? get().exercises.reduce((m, e) => Math.max(m, e.supersetGroup ?? 0), 0) + 1 : group;
      set({ exercises: get().exercises.map((e) => (ids.includes(e.id) ? { ...e, supersetGroup: g } : e)) });
    },
    addSet: (id) =>
      upd(id, (e) => {
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, newSet(last ? { weightKg: last.weightKg, reps: last.reps, durationSec: last.durationSec, distanceM: last.distanceM } : undefined)] };
      }),
    updateSet: (id, setId, patch) => upd(id, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) })),
    removeSet: (id, setId) => upd(id, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) })),
  };
});
