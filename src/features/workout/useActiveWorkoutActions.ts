import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getExercise } from '@/db/repo/exercises';
import { getRoutine, routineInputFromWorkout, updateRoutine } from '@/db/repo/routines';
import { saveWorkout } from '@/db/repo/workouts';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveWorkout } from '@/domain/types';
import { useActiveWorkout, type EditSession } from '@/store/activeWorkout';
import { useLastSave } from '@/store/lastSave';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settings';
import { confirm, toast } from '@/ui';

type SetPatch = Parameters<ReturnType<typeof useActiveWorkout.getState>['updateSet']>[2];

/** Какой нижний лист открыт и для какого упражнения или подхода. */
export type SheetState =
  | { kind: 'none' }
  | { kind: 'menu'; workoutExerciseId: string }
  | { kind: 'rest'; workoutExerciseId: string }
  | { kind: 'setType'; workoutExerciseId: string; setId: string }
  | { kind: 'superset'; workoutExerciseId: string }
  | { kind: 'description'; workoutExerciseId: string }
  | { kind: 'note'; workoutExerciseId: string }
  | { kind: 'finish' }
  | { kind: 'name' }
  | { kind: 'penRest' }
  | { kind: 'extraFields'; workoutExerciseId: string };

interface UseActiveWorkoutActionsOptions {
  workout: ActiveWorkout | null;
  session: EditSession;
  exercisesById: Map<string, ExerciseRow>;
  isPenMode: boolean;
  applyPenNow: () => Promise<boolean>;
}

export type ActiveWorkoutActions = ReturnType<typeof useActiveWorkoutActions>;

/** Состояние шторок и обработчики экрана тренировки: строк подходов, шапки и завершения. */
export function useActiveWorkoutActions({
  workout,
  session,
  exercisesById,
  isPenMode,
  applyPenNow,
}: UseActiveWorkoutActionsOptions) {
  const { t: translate } = useTranslation();
  // Читает хранилище в момент вызова, поэтому обработчики ниже никогда не работают с устаревшим состоянием.
  const getWorkoutStore = useActiveWorkout.getState;
  const defaultRestSeconds = useSettings((state) => state.defaultRestSeconds);
  const autoStartRest = useSettings((state) => state.autoStartRest);
  const startRest = useRestTimer((state) => state.start);
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });
  const [nameDraft, setNameDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  // Отдых, заданный для этого упражнения в тренировке, иначе для самого упражнения, иначе значение по умолчанию в приложении.
  // Читает стор напрямую: карточка, только что добавленная, ещё не попала в отрендеренный workout.
  const restSecondsFor = useCallback(
    (workoutExerciseId: string) => {
      const workoutExercise = getWorkoutStore().workout?.exercises.find(
        (exercise) => exercise.id === workoutExerciseId,
      );
      if (!workoutExercise) return defaultRestSeconds;
      if (workoutExercise.restSeconds != null) return workoutExercise.restSeconds;
      const exerciseDetails =
        exercisesById.get(workoutExercise.exerciseId) ?? getExercise(workoutExercise.exerciseId);
      return exerciseDetails?.restSeconds ?? defaultRestSeconds;
    },
    [getWorkoutStore, exercisesById, defaultRestSeconds],
  );

  // Последние значения для стабильных обработчиков ниже. Обработчики не меняют идентичность,
  // поэтому мемоизированные карточки и строки подходов перерисовываются только при изменении их собственных данных.
  const latestValuesRef = useRef({ restSecondsFor, autoStartRest, mode: session.mode, translate });
  useEffect(() => {
    latestValuesRef.current = { restSecondsFor, autoStartRest, mode: session.mode, translate };
  });

  // Отдых стартует только в новой тренировке и при включённом автозапуске.
  const startRestAfterCompletedSet = useCallback(
    (workoutExerciseId: string) => {
      const latestValues = latestValuesRef.current;
      if (latestValues.mode !== 'new' || !latestValues.autoStartRest) return;
      const restSeconds = latestValues.restSecondsFor(workoutExerciseId);
      // Запускаем таймер отдыха после этого кадра, чтобы сначала отрисовался тик.
      if (restSeconds > 0) requestAnimationFrame(() => startRest(restSeconds));
    },
    [startRest],
  );

  const toggleSet = useCallback(
    (workoutExerciseId: string, setId: string) => {
      const toggleResult = getWorkoutStore().toggleSet(workoutExerciseId, setId);
      if (toggleResult?.completed) startRestAfterCompletedSet(workoutExerciseId);
    },
    [getWorkoutStore, startRestAfterCompletedSet],
  );

  const deleteSetWithUndo = useCallback(
    (workoutExerciseId: string, setId: string) => {
      const removed = getWorkoutStore().removeSet(workoutExerciseId, setId);
      const latestTranslate = latestValuesRef.current.translate;
      if (removed)
        toast(latestTranslate('common.deleted'), {
          actionLabel: latestTranslate('common.undo'),
          onAction: () => getWorkoutStore().restoreSet(workoutExerciseId, removed.set, removed.index),
        });
    },
    [getWorkoutStore],
  );

  const openExerciseMenu = useCallback(
    (workoutExerciseId: string) => setSheet({ kind: 'menu', workoutExerciseId }),
    [],
  );
  const openNote = useCallback(
    (workoutExerciseId: string) => {
      const workoutExercise = getWorkoutStore().workout?.exercises.find(
        (exercise) => exercise.id === workoutExerciseId,
      );
      setNoteDraft(workoutExercise?.note ?? '');
      setSheet({ kind: 'note', workoutExerciseId });
    },
    [getWorkoutStore],
  );
  const addSet = useCallback(
    (workoutExerciseId: string) => getWorkoutStore().addSet(workoutExerciseId),
    [getWorkoutStore],
  );
  const changeSet = useCallback(
    (workoutExerciseId: string, setId: string, patch: SetPatch) =>
      getWorkoutStore().updateSet(workoutExerciseId, setId, patch),
    [getWorkoutStore],
  );
  const openSetTypePicker = useCallback(
    (workoutExerciseId: string, setId: string) => setSheet({ kind: 'setType', workoutExerciseId, setId }),
    [],
  );
  const closeSheet = useCallback(() => setSheet({ kind: 'none' }), []);

  const discardWorkout = async () => {
    const confirmed = await confirm({
      title: translate('workout.discard'),
      message: translate('workout.discardConfirm'),
      destructive: true,
      confirmLabel: translate('common.discard'),
    });
    if (!confirmed) return;
    useRestTimer.getState().skip();
    getWorkoutStore().clear();
    router.back();
  };

  const finishWorkout = async () => {
    if (!workout) return;
    const hasCompletedSets = workout.exercises.some((exercise) => exercise.sets.some((set) => set.completed));
    if (!hasCompletedSets) return;
    closeSheet();
    useRestTimer.getState().skip();
    if (session.mode === 'edit') {
      saveWorkout(workout, session.finishedAt, { existingId: session.workoutId });
      getWorkoutStore().clear();
      toast(translate('workout.saved'));
      router.back();
      return;
    }
    const saveResult = saveWorkout(workout, Date.now());
    useLastSave.getState().setResult(saveResult);
    const routine = workout.routineId ? getRoutine(workout.routineId) : undefined;
    getWorkoutStore().clear();
    if (routine) {
      const doneExerciseCount = workout.exercises.filter((exercise) =>
        exercise.sets.some((set) => set.completed),
      ).length;
      const routineChanged =
        routine.exercises.length !== doneExerciseCount ||
        routine.exercises.some(
          (routineExercise, index) => workout.exercises[index]?.exerciseId !== routineExercise.exerciseId,
        );
      if (
        routineChanged &&
        (await confirm({
          title: translate('workout.updateRoutine'),
          message: translate('workout.updateRoutineHint', { name: routine.name }),
          confirmLabel: translate('workout.updateRoutine'),
          cancelLabel: translate('workout.keepRoutine'),
        }))
      ) {
        updateRoutine(routine.id, routineInputFromWorkout(workout, routine));
      }
    }
    router.replace('/workout/summary');
  };

  const openFinishSheet = async () => {
    // Из «Ручки» сначала применяем текст: шторка завершения считает статистику по карточкам.
    if (isPenMode && !(await applyPenNow())) return;
    setSheet({ kind: 'finish' });
  };

  // Правка завершённой тренировки сохраняется сразу: шторка завершения нужна только новой тренировке.
  const handleFinishPress = () => {
    if (session.mode === 'edit') void finishWorkout();
    else void openFinishSheet();
  };

  const openRename = () => {
    setNameDraft(workout?.name ?? '');
    setSheet({ kind: 'name' });
  };

  const saveName = () => {
    getWorkoutStore().rename(nameDraft.trim());
    closeSheet();
  };

  const openPenRestPicker = () => setSheet({ kind: 'penRest' });

  return {
    sheet,
    setSheet,
    closeSheet,
    nameDraft,
    setNameDraft,
    noteDraft,
    setNoteDraft,
    restSecondsFor,
    toggleSet,
    deleteSetWithUndo,
    openExerciseMenu,
    openNote,
    addSet,
    changeSet,
    openSetTypePicker,
    discardWorkout,
    finishWorkout,
    handleFinishPress,
    openRename,
    saveName,
    openPenRestPicker,
  };
}
