import React from 'react';
import { getLastPerformances } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { useQuery } from '@/db/version';
import type { ActiveWorkout, DistanceUnit, WeightUnit } from '@/domain/types';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settings';
import { ExerciseDescriptionSheet } from './sheets/ExerciseDescriptionSheet';
import { ExerciseMenuSheet } from './sheets/ExerciseMenuSheet';
import { ExerciseNoteSheet } from './sheets/ExerciseNoteSheet';
import { ExtraFieldsSheet } from './sheets/ExtraFieldsSheet';
import { FinishWorkoutSheet } from './sheets/FinishWorkoutSheet';
import { RenameWorkoutSheet } from './sheets/RenameWorkoutSheet';
import { RestTimerPickerSheet } from './sheets/RestTimerPickerSheet';
import { SetTypePickerSheet } from './sheets/SetTypePickerSheet';
import { SupersetPickerSheet } from './sheets/SupersetPickerSheet';
import type { ActiveWorkoutActions } from './useActiveWorkoutActions';
import { useExerciseSheetActions } from './useExerciseSheetActions';

interface ActiveWorkoutSheetsProps {
  workout: ActiveWorkout;
  exerciseIds: string[];
  exercisesById: Map<string, ExerciseRow>;
  units: { weight: WeightUnit; distance: DistanceUnit };
  actions: ActiveWorkoutActions;
  /** Фиксированная длительность при редактировании завершённой тренировки; undefined оставляет живой таймер. */
  fixedDurationSeconds: number | undefined;
  exerciseCount: number;
  setCount: number;
}

/** Все шторки экрана тренировки. Какая открыта, решает `actions.sheet`. */
export function ActiveWorkoutSheets({
  workout,
  exerciseIds,
  exercisesById,
  units,
  actions,
  fixedDurationSeconds,
  exerciseCount,
  setCount,
}: ActiveWorkoutSheetsProps) {
  const defaultRestSeconds = useSettings((state) => state.defaultRestSeconds);
  const startRest = useRestTimer((state) => state.start);
  const { sheet, closeSheet } = actions;
  const sheetActions = useExerciseSheetActions({ workout, exercisesById, actions });
  const { currentExercise, currentExerciseIndex, currentExerciseDetails, currentRestSeconds } = sheetActions;

  const lastNoteByExerciseId = useQuery(() => {
    const lastPerformanceByExerciseId = getLastPerformances(exerciseIds);
    const notes = new Map<string, string>();
    for (const [exerciseId, performance] of lastPerformanceByExerciseId) {
      if (performance.note) notes.set(exerciseId, performance.note);
    }
    return notes;
  }, [exerciseIds.join(',')]);

  const startRestFromPen = (seconds: number | null) => {
    // В «Ручке» таймер запускается только вручную: выбранное время стартует сразу, «Выкл» останавливает.
    const restSeconds = seconds ?? defaultRestSeconds;
    closeSheet();
    if (restSeconds > 0) startRest(restSeconds);
    else useRestTimer.getState().skip();
  };

  return (
    <>
      <ExerciseMenuSheet
        visible={sheet.kind === 'menu'}
        onClose={closeSheet}
        workoutExercise={currentExercise}
        exerciseDetails={currentExerciseDetails}
        restSeconds={currentRestSeconds ?? 0}
        canMoveUp={currentExerciseIndex > 0}
        canMoveDown={currentExerciseIndex < workout.exercises.length - 1}
        onDescriptionPress={sheetActions.openDescription}
        onExtraFieldsPress={sheetActions.openExtraFields}
        onRestTimerPress={sheetActions.openRestPicker}
        onReplacePress={sheetActions.replaceCurrentExercise}
        onSupersetPress={sheetActions.toggleCurrentExerciseSuperset}
        onMoveUpPress={() => sheetActions.moveCurrentExercise(-1)}
        onMoveDownPress={() => sheetActions.moveCurrentExercise(1)}
        onRemovePress={sheetActions.removeCurrentExerciseWithUndo}
      />

      <SupersetPickerSheet
        visible={sheet.kind === 'superset'}
        onClose={closeSheet}
        partnerCandidates={workout.exercises.filter((exercise) => exercise.id !== currentExercise?.id)}
        exercisesById={exercisesById}
        onPartnerPress={sheetActions.linkCurrentExerciseWith}
      />

      <RestTimerPickerSheet
        visible={sheet.kind === 'rest'}
        onClose={closeSheet}
        selectedSeconds={currentRestSeconds}
        defaultRestSeconds={defaultRestSeconds}
        onRestSelect={sheetActions.setCurrentExerciseRest}
      />

      <SetTypePickerSheet
        visible={sheet.kind === 'setType'}
        onClose={closeSheet}
        onSetTypeSelect={sheetActions.changeSelectedSetType}
        onDeleteSetPress={sheetActions.deleteSelectedSet}
      />

      <ExerciseDescriptionSheet
        visible={sheet.kind === 'description'}
        onClose={closeSheet}
        workoutExercise={currentExercise}
        exerciseDetails={currentExerciseDetails}
      />

      <ExerciseNoteSheet
        visible={sheet.kind === 'note'}
        workoutExercise={currentExercise}
        exerciseDetails={currentExerciseDetails}
        noteDraft={actions.noteDraft}
        onNoteDraftChange={actions.setNoteDraft}
        lastNote={currentExercise ? lastNoteByExerciseId.get(currentExercise.exerciseId) : undefined}
        onSave={sheetActions.saveNoteAndClose}
      />

      <ExtraFieldsSheet
        visible={sheet.kind === 'extraFields'}
        onClose={closeSheet}
        workoutExercise={currentExercise}
        exerciseDetails={currentExerciseDetails}
        weightUnit={units.weight}
        onToggleField={sheetActions.toggleExtraFieldForCurrent}
        onRememberChange={sheetActions.setRememberExtraFields}
      />

      <RestTimerPickerSheet
        visible={sheet.kind === 'penRest'}
        onClose={closeSheet}
        selectedSeconds={null}
        defaultRestSeconds={defaultRestSeconds}
        onRestSelect={startRestFromPen}
      />

      <RenameWorkoutSheet
        visible={sheet.kind === 'name'}
        onClose={closeSheet}
        nameDraft={actions.nameDraft}
        onNameDraftChange={actions.setNameDraft}
        onSave={actions.saveName}
      />

      <FinishWorkoutSheet
        visible={sheet.kind === 'finish'}
        onClose={closeSheet}
        startedAt={workout.startedAt}
        durationSec={fixedDurationSeconds}
        exerciseCount={exerciseCount}
        setCount={setCount}
        onFinishPress={actions.finishWorkout}
      />
    </>
  );
}
