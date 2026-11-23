import { router, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { push } from '@/lib/nav';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { ensureNotificationPermission } from '@/lib/notifications';
import { getExercise, getExercisesByIds, getLastPerformances, updateExercise } from '@/db/repo/exercises';
import { getRoutine, routineInputFromWorkout, updateRoutine } from '@/db/repo/routines';
import { saveWorkout } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { toggleExtraField } from '@/domain/extraFields';
import type { ActiveExercise, ExtraField, SetType } from '@/domain/types';
import { countWorkingSets } from '@/domain/volume';
import { formatDateTime } from '@/domain/dates';
import { ActiveWorkoutHeader } from '@/features/workout/ActiveWorkoutHeader';
import { ClockSheet } from '@/features/workout/clock/ClockSheet';
import { ExerciseCard } from '@/features/workout/ExerciseCard';
import { exerciseDisplayName } from '@/features/workout/exerciseDisplayName';
import { RestTimerBar } from '@/features/workout/RestTimerBar';
import { WorkoutStats } from '@/features/workout/WorkoutStats';
import { ExerciseDescriptionSheet } from '@/features/workout/sheets/ExerciseDescriptionSheet';
import { ExtraFieldsSheet } from '@/features/workout/sheets/ExtraFieldsSheet';
import { ExerciseMenuSheet } from '@/features/workout/sheets/ExerciseMenuSheet';
import { ExerciseNoteSheet } from '@/features/workout/sheets/ExerciseNoteSheet';
import { FinishWorkoutSheet } from '@/features/workout/sheets/FinishWorkoutSheet';
import { RenameWorkoutSheet } from '@/features/workout/sheets/RenameWorkoutSheet';
import { WorkoutTimeSheet } from '@/features/workout/sheets/WorkoutTimeSheet';
import { RestTimerPickerSheet } from '@/features/workout/sheets/RestTimerPickerSheet';
import { SetTypePickerSheet } from '@/features/workout/sheets/SetTypePickerSheet';
import { SupersetPickerSheet } from '@/features/workout/sheets/SupersetPickerSheet';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useLastSave } from '@/store/lastSave';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settings';
import { Button, Icon, confirm, spacing, toast, useColors } from '@/ui';

const SUPERSET_COLORS = ['#F5A524', '#3E63DD', '#30A46C', '#E5484D', '#8E4EC6', '#12A594'];

/** У каждой группы суперсета свой цвет; группы сверх палитры используют цвета с начала. */
function supersetColorForGroup(group: number | null): string | null {
  if (group == null) return null;
  return SUPERSET_COLORS[(group - 1) % SUPERSET_COLORS.length] ?? null;
}

type SetPatch = Parameters<ReturnType<typeof useActiveWorkout.getState>['updateSet']>[2];

/** Какой нижний лист открыт и для какого упражнения или подхода. */
type SheetState =
  | { kind: 'none' }
  | { kind: 'menu'; workoutExerciseId: string }
  | { kind: 'rest'; workoutExerciseId: string }
  | { kind: 'setType'; workoutExerciseId: string; setId: string }
  | { kind: 'superset'; workoutExerciseId: string }
  | { kind: 'description'; workoutExerciseId: string }
  | { kind: 'note'; workoutExerciseId: string }
  | { kind: 'finish' }
  | { kind: 'name' }
  | { kind: 'time' }
  | { kind: 'clock' }
  | { kind: 'extraFields'; workoutExerciseId: string };

export default function ActiveWorkoutScreen() {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const workout = useActiveWorkout((state) => state.workout);
  const session = useActiveWorkout((state) => state.session);
  // Читает хранилище в момент вызова, поэтому обработчики ниже никогда не работают с устаревшим состоянием.
  const getWorkoutStore = useActiveWorkout.getState;
  const settings = useSettings();
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });
  const [nameDraft, setNameDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const startRest = useRestTimer((state) => state.start);
  useEffect(() => {
    if (settings.restNotifications) void ensureNotificationPermission();
  }, [settings.restNotifications]);
  // Плавающая панель «тренировка идёт» показывается только пока этот экран не в фокусе.
  useFocusEffect(
    useCallback(() => {
      getWorkoutStore().setMinimized(false);
      return () => getWorkoutStore().setMinimized(true);
    }, [getWorkoutStore]),
  );

  const exerciseIds = useMemo(
    () => workout?.exercises.map((workoutExercise) => workoutExercise.exerciseId) ?? [],
    [workout?.exercises],
  );
  const exercisesById = useQuery(() => getExercisesByIds(exerciseIds), [exerciseIds.join(',')]);
  const lastNoteByExerciseId = useQuery(() => {
    const lastPerformanceByExerciseId = getLastPerformances(exerciseIds);
    const notes = new Map<string, string>();
    for (const [exerciseId, performance] of lastPerformanceByExerciseId) {
      if (performance.note) notes.set(exerciseId, performance.note);
    }
    return notes;
  }, [exerciseIds.join(',')]);

  const units = useMemo(
    () => ({ weight: settings.weightUnit, distance: settings.distanceUnit }),
    [settings.weightUnit, settings.distanceUnit],
  );
  // Отдых, заданный для этого упражнения в тренировке, иначе для самого упражнения, иначе значение по умолчанию в приложении.
  // Читает стор напрямую: карточка, только что добавленная, ещё не попала в отрендеренный workout.
  const restSecondsFor = useCallback(
    (workoutExerciseId: string) => {
      const workoutExercise = getWorkoutStore().workout?.exercises.find(
        (exercise) => exercise.id === workoutExerciseId,
      );
      if (!workoutExercise) return settings.defaultRestSeconds;
      if (workoutExercise.restSeconds != null) return workoutExercise.restSeconds;
      const exerciseDetails =
        exercisesById.get(workoutExercise.exerciseId) ?? getExercise(workoutExercise.exerciseId);
      return exerciseDetails?.restSeconds ?? settings.defaultRestSeconds;
    },
    [getWorkoutStore, exercisesById, settings.defaultRestSeconds],
  );

  // Последние значения для стабильных обработчиков ниже. Обработчики не меняют идентичность,
  // поэтому мемоизированные карточки и строки подходов перерисовываются только при изменении их собственных данных.
  const latestValuesRef = useRef({
    restSecondsFor,
    autoStartRest: settings.autoStartRest,
    mode: session.mode,
    translate,
  });
  useEffect(() => {
    latestValuesRef.current = {
      restSecondsFor,
      autoStartRest: settings.autoStartRest,
      mode: session.mode,
      translate,
    };
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
  const openDescription = useCallback(
    (workoutExerciseId: string) => setSheet({ kind: 'description', workoutExerciseId }),
    [],
  );
  const openRestPickerFor = useCallback(
    (workoutExerciseId: string) => setSheet({ kind: 'rest', workoutExerciseId }),
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

  const openExtraFields = useCallback(
    (workoutExerciseId: string) => setSheet({ kind: 'extraFields', workoutExerciseId }),
    [],
  );

  const closeSheet = () => setSheet({ kind: 'none' });

  const removeExerciseWithUndo = (workoutExerciseId: string) => {
    const index = workout?.exercises.findIndex((exercise) => exercise.id === workoutExerciseId) ?? -1;
    const removed = getWorkoutStore().removeExercise(workoutExerciseId);
    closeSheet();
    if (removed)
      toast(translate('common.deleted'), {
        actionLabel: translate('common.undo'),
        onAction: () => getWorkoutStore().restoreExercise(removed, index),
      });
  };

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
      saveWorkout(
        workout,
        session.finishedAt,
        session.isNewEntry ? { isBackdated: true } : { existingId: session.workoutId },
      );
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

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <Button title={translate('common.close')} variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const completedSets = workout.exercises.flatMap((exercise) => exercise.sets.filter((set) => set.completed));
  const workingSetCount = countWorkingSets(completedSets);
  const exerciseCount = workout.exercises.length;
  const canFinish = completedSets.length > 0;

  // Правка завершённой тренировки сохраняется сразу: шторка завершения нужна только новой тренировке.
  const handleFinishPress = () => {
    if (session.mode === 'edit') void finishWorkout();
    else setSheet({ kind: 'finish' });
  };
  // При редактировании завершённой тренировки показывается сохранённая длительность вместо живого таймера.
  const fixedDurationSeconds =
    session.mode === 'new' ? undefined : Math.round((session.finishedAt - workout.startedAt) / 1000);
  const hasNoExercises = workout.exercises.length === 0;

  const currentExercise =
    sheet.kind !== 'none' && 'workoutExerciseId' in sheet
      ? workout.exercises.find((exercise) => exercise.id === sheet.workoutExerciseId)
      : undefined;
  const currentExerciseIndex = currentExercise ? workout.exercises.indexOf(currentExercise) : -1;
  const currentExerciseDetails = currentExercise ? exercisesById.get(currentExercise.exerciseId) : undefined;
  const currentRestSeconds = currentExercise ? restSecondsFor(currentExercise.id) : null;

  const openRename = () => {
    setNameDraft(workout.name);
    setSheet({ kind: 'name' });
  };

  const saveName = () => {
    getWorkoutStore().rename(nameDraft.trim());
    closeSheet();
  };

  const openRestPicker = () => {
    if (currentExercise) setSheet({ kind: 'rest', workoutExerciseId: currentExercise.id });
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ActiveWorkoutHeader
        workoutName={workout.name}
        dateText={session.mode === 'edit' ? formatDateTime(workout.startedAt, i18n.language) : null}
        isEditing={session.mode === 'edit'}
        finishButtonTitle={session.mode === 'new' ? translate('workout.finish') : translate('common.save')}
        canFinish={canFinish}
        onMinimizePress={() => router.back()}
        onNamePress={openRename}
        onClockPress={() => setSheet({ kind: 'clock' })}
        onFinishPress={handleFinishPress}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
          showsVerticalScrollIndicator={false}
        >
          <WorkoutStats
            variant="plain"
            startedAt={workout.startedAt}
            durationSec={fixedDurationSeconds}
            exerciseCount={exerciseCount}
            setCount={workingSetCount}
            // Время правится только у записи задним числом: у живой тренировки его считает таймер.
            onDurationPress={
              session.mode === 'edit' && session.isNewEntry ? () => setSheet({ kind: 'time' }) : undefined
            }
          />

          {workout.exercises.map((workoutExercise) => {
            const exerciseDetails = exercisesById.get(workoutExercise.exerciseId);
            return (
              <ExerciseCard
                key={workoutExercise.id}
                workoutExercise={workoutExercise}
                exerciseDetails={exerciseDetails}
                units={units}
                supersetColor={supersetColorForGroup(workoutExercise.supersetGroup)}
                restSeconds={restSecondsFor(workoutExercise.id)}
                onMenu={openExerciseMenu}
                onNotePress={openNote}
                onDescriptionPress={openDescription}
                onRestPress={openRestPickerFor}
                onAddSet={addSet}
                onSetChange={changeSet}
                onSetToggle={toggleSet}
                onSetTypePress={openSetTypePicker}
              />
            );
          })}

          <View style={styles.footerButtons}>
            <Button
              title={translate('workout.addExercise')}
              size="lg"
              fullWidth
              variant={hasNoExercises ? 'primary' : 'secondary'}
              icon={
                <Icon icon={Plus} size={20} color={hasNoExercises ? 'onAccent' : 'text'} strokeWidth={2.5} />
              }
              onPress={() => push({ pathname: '/exercise/picker', params: { mode: 'workout' } })}
            />
            {session.mode === 'new' ? (
              <Button
                title={translate('workout.discard')}
                variant="ghost"
                textColor={colors.danger}
                fullWidth
                onPress={discardWorkout}
                style={{ marginTop: spacing.sm }}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {settings.keepAwake ? <KeepScreenAwake /> : null}
      <View
        style={[styles.restTimerWrapper, { bottom: insets.bottom + spacing.md }]}
        pointerEvents="box-none"
      >
        <RestTimerBar />
      </View>

      <ExerciseMenuSheet
        visible={sheet.kind === 'menu'}
        onClose={closeSheet}
        workoutExercise={currentExercise}
        exerciseDetails={currentExerciseDetails}
        restSeconds={currentRestSeconds ?? 0}
        canMoveUp={currentExerciseIndex > 0}
        canMoveDown={currentExerciseIndex < workout.exercises.length - 1}
        onDescriptionPress={() => {
          if (currentExercise) openDescription(currentExercise.id);
        }}
        onExtraFieldsPress={() => {
          if (currentExercise) openExtraFields(currentExercise.id);
        }}
        onRestTimerPress={openRestPicker}
        onReplacePress={replaceCurrentExercise}
        onSupersetPress={toggleCurrentExerciseSuperset}
        onMoveUpPress={() => moveCurrentExercise(-1)}
        onMoveDownPress={() => moveCurrentExercise(1)}
        onRemovePress={() => {
          if (currentExercise) removeExerciseWithUndo(currentExercise.id);
        }}
      />

      <SupersetPickerSheet
        visible={sheet.kind === 'superset'}
        onClose={closeSheet}
        partnerCandidates={workout.exercises.filter((exercise) => exercise.id !== currentExercise?.id)}
        exercisesById={exercisesById}
        onPartnerPress={linkCurrentExerciseWith}
      />

      <RestTimerPickerSheet
        visible={sheet.kind === 'rest'}
        onClose={closeSheet}
        exerciseName={exerciseDisplayName(currentExerciseDetails, i18n.language)}
        selectedSeconds={currentRestSeconds}
        defaultRestSeconds={settings.defaultRestSeconds}
        onRestSelect={setCurrentExerciseRest}
      />

      <SetTypePickerSheet
        visible={sheet.kind === 'setType'}
        onClose={closeSheet}
        onSetTypeSelect={changeSelectedSetType}
        onDeleteSetPress={deleteSelectedSet}
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
        noteDraft={noteDraft}
        onNoteDraftChange={setNoteDraft}
        lastNote={currentExercise ? lastNoteByExerciseId.get(currentExercise.exerciseId) : undefined}
        onSave={saveNoteAndClose}
      />

      <ExtraFieldsSheet
        visible={sheet.kind === 'extraFields'}
        onClose={closeSheet}
        workoutExercise={currentExercise}
        exerciseDetails={currentExerciseDetails}
        weightUnit={units.weight}
        onToggleField={toggleExtraFieldForCurrent}
        onRememberChange={setRememberExtraFields}
      />

      <RenameWorkoutSheet
        visible={sheet.kind === 'name'}
        onClose={closeSheet}
        nameDraft={nameDraft}
        onNameDraftChange={setNameDraft}
        onSave={saveName}
      />

      <ClockSheet visible={sheet.kind === 'clock'} onClose={closeSheet} />

      <WorkoutTimeSheet
        visible={sheet.kind === 'time'}
        onClose={closeSheet}
        startedAt={workout.startedAt}
        durationSec={fixedDurationSeconds ?? 0}
        onStartedAtChange={(startedAt) => getWorkoutStore().setSessionStartedAt(startedAt)}
        onDurationChange={(durationSec) => getWorkoutStore().setSessionDuration(durationSec)}
      />

      <FinishWorkoutSheet
        visible={sheet.kind === 'finish'}
        onClose={closeSheet}
        startedAt={workout.startedAt}
        durationSec={fixedDurationSeconds}
        exerciseCount={exerciseCount}
        setCount={workingSetCount}
        onFinishPress={finishWorkout}
      />
    </View>
  );
}

function KeepScreenAwake() {
  useKeepAwake('workout');
  return null;
}

const styles = StyleSheet.create({
  // У списка нет боковых отступов: упражнения и статистика идут на всю ширину и отступают сами.
  footerButtons: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  restTimerWrapper: { position: 'absolute', left: spacing.lg, right: spacing.lg },
});
