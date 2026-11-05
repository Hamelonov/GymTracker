import { useTranslation } from 'react-i18next';
import { updateExercise } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { toggleExtraField } from '@/domain/extraFields';
import type { ActiveExercise, ActiveWorkout, ExtraField, SetType } from '@/domain/types';
import { push } from '@/lib/nav';
import { useActiveWorkout } from '@/store/activeWorkout';
import { toast } from '@/ui';
import type { ActiveWorkoutActions } from './useActiveWorkoutActions';

interface UseExerciseSheetActionsOptions {
  workout: ActiveWorkout;
  exercisesById: Map<string, ExerciseRow>;
  actions: ActiveWorkoutActions;
}

/** Обработчики шторок над упражнением, для которого шторка открыта. */
export function useExerciseSheetActions({ workout, exercisesById, actions }: UseExerciseSheetActionsOptions) {
  const { t: translate } = useTranslation();
  const getWorkoutStore = useActiveWorkout.getState;
  const { sheet, setSheet, closeSheet, noteDraft, restSecondsFor, deleteSetWithUndo } = actions;

  const currentExercise =
    sheet.kind !== 'none' && 'workoutExerciseId' in sheet
      ? workout.exercises.find((exercise) => exercise.id === sheet.workoutExerciseId)
      : undefined;
  const currentExerciseIndex = currentExercise ? workout.exercises.indexOf(currentExercise) : -1;
  const currentExerciseDetails = currentExercise ? exercisesById.get(currentExercise.exerciseId) : undefined;
  const currentRestSeconds = currentExercise ? restSecondsFor(currentExercise.id) : null;

  const openDescription = () => {
    if (currentExercise) setSheet({ kind: 'description', workoutExerciseId: currentExercise.id });
  };

  const openExtraFields = () => {
    if (currentExercise) setSheet({ kind: 'extraFields', workoutExerciseId: currentExercise.id });
  };

  const openRestPicker = () => {
    if (currentExercise) setSheet({ kind: 'rest', workoutExerciseId: currentExercise.id });
  };

  const removeCurrentExerciseWithUndo = () => {
    if (!currentExercise) return;
    const removed = getWorkoutStore().removeExercise(currentExercise.id);
    closeSheet();
    if (removed)
      toast(translate('common.deleted'), {
        actionLabel: translate('common.undo'),
        onAction: () => getWorkoutStore().restoreExercise(removed, currentExerciseIndex),
      });
  };

  const toggleExtraFieldForCurrent = (workoutExerciseId: string, field: ExtraField) => {
    const exercise = getWorkoutStore().workout?.exercises.find(
      (candidate) => candidate.id === workoutExerciseId,
    );
    if (!exercise) return;
    const extraFields = toggleExtraField(exercise.extraFields, field);
    getWorkoutStore().setExtraFields(workoutExerciseId, extraFields);
    // Пока «Запоминать» включено, у упражнения всегда лежит актуальный список полей карточки.
    const exerciseRow = exercisesById.get(exercise.exerciseId);
    if (exerciseRow && exerciseRow.rememberedExtraFields.length > 0) {
      updateExercise(exercise.exerciseId, { rememberedExtraFields: extraFields });
    }
  };

  const setRememberExtraFields = (exerciseId: string, remember: boolean) => {
    const rememberedExtraFields = remember ? (currentExercise?.extraFields ?? []) : [];
    updateExercise(exerciseId, { rememberedExtraFields });
  };

  const setCurrentExerciseRest = (seconds: number | null) => {
    if (currentExercise) getWorkoutStore().setExerciseRest(currentExercise.id, seconds);
    closeSheet();
  };

  const replaceCurrentExercise = () => {
    if (!currentExercise) return;
    closeSheet();
    push({ pathname: '/exercise/picker', params: { mode: 'replace', target: currentExercise.id } });
  };

  // Если в суперсете: выйти из него. Если нет: выбрать партнёра, с которым его создать.
  const toggleCurrentExerciseSuperset = () => {
    if (!currentExercise) return;
    if (currentExercise.supersetGroup != null) {
      getWorkoutStore().setSuperset([currentExercise.id], null);
      closeSheet();
    } else {
      setSheet({ kind: 'superset', workoutExerciseId: currentExercise.id });
    }
  };

  const linkCurrentExerciseWith = (partner: ActiveExercise) => {
    if (!currentExercise) return;
    // Присоединиться к суперсету партнёра или -1, чтобы начать новый.
    getWorkoutStore().setSuperset([currentExercise.id, partner.id], partner.supersetGroup ?? -1);
    closeSheet();
  };

  const moveCurrentExercise = (offset: number) => {
    getWorkoutStore().moveExercise(currentExerciseIndex, currentExerciseIndex + offset);
    closeSheet();
  };

  const changeSelectedSetType = (type: SetType) => {
    if (sheet.kind === 'setType') getWorkoutStore().updateSet(sheet.workoutExerciseId, sheet.setId, { type });
    closeSheet();
  };

  const deleteSelectedSet = () => {
    if (sheet.kind === 'setType') deleteSetWithUndo(sheet.workoutExerciseId, sheet.setId);
    closeSheet();
  };

  const saveNoteAndClose = () => {
    if (currentExercise) getWorkoutStore().setExerciseNote(currentExercise.id, noteDraft);
    closeSheet();
  };

  return {
    currentExercise,
    currentExerciseIndex,
    currentExerciseDetails,
    currentRestSeconds,
    openDescription,
    openExtraFields,
    openRestPicker,
    removeCurrentExerciseWithUndo,
    toggleExtraFieldForCurrent,
    setRememberExtraFields,
    setCurrentExerciseRest,
    replaceCurrentExercise,
    toggleCurrentExerciseSuperset,
    linkCurrentExerciseWith,
    moveCurrentExercise,
    changeSelectedSetType,
    deleteSelectedSet,
    saveNoteAndClose,
  };
}
