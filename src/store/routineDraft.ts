import { create } from 'zustand';
import type { RoutineDetail, RoutineExerciseInput, RoutineSetInput } from '@/db/repo/routines';
import { newId } from '@/domain/ids';
import { EMPTY_SET_VALUES, type SetValues, type SetType } from '@/domain/types';

export interface DraftSet extends RoutineSetInput {
  id: string;
}
export interface DraftExercise extends Omit<RoutineExerciseInput, 'sets'> {
  /** Id этой строки в черновике (одно упражнение может встретиться дважды), а не id упражнения. */
  id: string;
  sets: DraftSet[];
}

/** Если передать это как группу суперсета, стор создаст новый номер группы. */
export const NEW_SUPERSET_GROUP = -1;

interface RoutineDraftState {
  id: string | null;
  name: string;
  notes: string;
  folderId: string | null;
  exercises: DraftExercise[];
  reset: (routine?: RoutineDetail) => void;
  setName: (name: string) => void;
  setNotes: (notes: string) => void;
  addExercises: (exerciseIds: string[]) => void;
  removeExercise: (draftExerciseId: string) => void;
  moveExercise: (fromIndex: number, toIndex: number) => void;
  setRestSeconds: (draftExerciseId: string, restSeconds: number | null) => void;
  setExerciseNote: (draftExerciseId: string, note: string) => void;
  setSupersetGroup: (draftExerciseIds: string[], supersetGroup: number | null) => void;
  addSetToExercise: (draftExerciseId: string) => void;
  updateSet: (draftExerciseId: string, setId: string, patch: Partial<SetValues> & { type?: SetType }) => void;
  removeSet: (draftExerciseId: string, setId: string) => void;
}

const createDraftSet = (initialValues?: Partial<RoutineSetInput>): DraftSet => ({
  id: newId(),
  type: 'normal',
  ...EMPTY_SET_VALUES,
  ...initialValues,
});

export const useRoutineDraft = create<RoutineDraftState>((set, get) => {
  const updateExercise = (draftExerciseId: string, update: (exercise: DraftExercise) => DraftExercise) =>
    set({
      exercises: get().exercises.map((exercise) =>
        exercise.id === draftExerciseId ? update(exercise) : exercise,
      ),
    });

  return {
    id: null,
    name: '',
    notes: '',
    folderId: null,
    exercises: [],
    reset: (routine) =>
      set({
        id: routine?.id ?? null,
        name: routine?.name ?? '',
        notes: routine?.notes ?? '',
        folderId: routine?.folderId ?? null,
        exercises:
          routine?.exercises.map((exercise) => ({
            id: newId(),
            exerciseId: exercise.exerciseId,
            supersetGroup: exercise.supersetGroup,
            restSeconds: exercise.restSeconds,
            note: exercise.note,
            sets: exercise.sets.map((routineSet) => ({
              id: newId(),
              type: routineSet.type,
              weightKg: routineSet.weightKg,
              reps: routineSet.reps,
              durationSec: routineSet.durationSec,
              distanceM: routineSet.distanceM,
              rpe: routineSet.rpe,
              rir: null,
            })),
          })) ?? [],
      }),
    setName: (name) => set({ name }),
    setNotes: (notes) => set({ notes }),
    addExercises: (exerciseIds) =>
      set({
        exercises: [
          ...get().exercises,
          ...exerciseIds.map((exerciseId) => ({
            id: newId(),
            exerciseId,
            supersetGroup: null,
            restSeconds: null,
            note: '',
            sets: [createDraftSet(), createDraftSet(), createDraftSet()],
          })),
        ],
      }),
    removeExercise: (draftExerciseId) =>
      set({ exercises: get().exercises.filter((exercise) => exercise.id !== draftExerciseId) }),
    moveExercise: (fromIndex, toIndex) => {
      const reorderedExercises = [...get().exercises];
      const [movedExercise] = reorderedExercises.splice(fromIndex, 1);
      if (!movedExercise) return;
      reorderedExercises.splice(toIndex, 0, movedExercise);
      set({ exercises: reorderedExercises });
    },
    setRestSeconds: (draftExerciseId, restSeconds) =>
      updateExercise(draftExerciseId, (exercise) => ({ ...exercise, restSeconds })),
    setExerciseNote: (draftExerciseId, note) =>
      updateExercise(draftExerciseId, (exercise) => ({ ...exercise, note })),
    setSupersetGroup: (draftExerciseIds, supersetGroup) => {
      const highestGroup = get().exercises.reduce(
        (highest, exercise) => Math.max(highest, exercise.supersetGroup ?? 0),
        0,
      );
      const groupToAssign = supersetGroup === NEW_SUPERSET_GROUP ? highestGroup + 1 : supersetGroup;
      set({
        exercises: get().exercises.map((exercise) =>
          draftExerciseIds.includes(exercise.id) ? { ...exercise, supersetGroup: groupToAssign } : exercise,
        ),
      });
    },
    addSetToExercise: (draftExerciseId) =>
      updateExercise(draftExerciseId, (exercise) => {
        // Новый подход копирует значения последнего, так что вводить нужно только то, что изменилось.
        const lastSet = exercise.sets[exercise.sets.length - 1];
        const copiedValues = lastSet
          ? {
              weightKg: lastSet.weightKg,
              reps: lastSet.reps,
              durationSec: lastSet.durationSec,
              distanceM: lastSet.distanceM,
            }
          : undefined;
        return { ...exercise, sets: [...exercise.sets, createDraftSet(copiedValues)] };
      }),
    updateSet: (draftExerciseId, setId, patch) =>
      updateExercise(draftExerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((draftSet) => (draftSet.id === setId ? { ...draftSet, ...patch } : draftSet)),
      })),
    removeSet: (draftExerciseId, setId) =>
      updateExercise(draftExerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.filter((draftSet) => draftSet.id !== setId),
      })),
  };
});
