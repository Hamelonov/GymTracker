import { router, useFocusEffect } from 'expo-router';
import { push } from '@/lib/nav';
import { Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { ensureNotificationPermission } from '@/lib/notifications';
import { getExercisesByIds, getLastPerformances } from '@/db/repo/exercises';
import { getRoutine, routineInputFromWorkout, updateRoutine } from '@/db/repo/routines';
import { saveWorkout } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import type { ActiveExercise, SetType } from '@/domain/types';
import { countWorkingSets } from '@/domain/volume';
import { formatDateTime } from '@/domain/dates';
import { ActiveWorkoutHeader } from '@/features/workout/ActiveWorkoutHeader';
import { ExerciseCard } from '@/features/workout/ExerciseCard';
import { exerciseDisplayDescription } from '@/features/workout/exerciseDisplayName';
import { RestTimerBar } from '@/features/workout/RestTimerBar';
import { WorkoutStats } from '@/features/workout/WorkoutStats';
import { ExerciseDescriptionSheet } from '@/features/workout/sheets/ExerciseDescriptionSheet';
import { ExerciseMenuSheet } from '@/features/workout/sheets/ExerciseMenuSheet';
import { ExerciseNoteSheet } from '@/features/workout/sheets/ExerciseNoteSheet';
import { FinishWorkoutSheet } from '@/features/workout/sheets/FinishWorkoutSheet';
import { RenameWorkoutSheet } from '@/features/workout/sheets/RenameWorkoutSheet';
import { RestTimerPickerSheet } from '@/features/workout/sheets/RestTimerPickerSheet';
import { SetTypePickerSheet } from '@/features/workout/sheets/SetTypePickerSheet';
import { SupersetPickerSheet } from '@/features/workout/sheets/SupersetPickerSheet';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useLastSave } from '@/store/lastSave';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settings';
import { Button, Icon, confirm, spacing, toast, useColors } from '@/ui';

const SUPERSET_COLORS = ['#F5A524', '#3E63DD', '#30A46C', '#E5484D', '#8E4EC6', '#12A594'];

/** Each superset group gets its own color; groups beyond the palette reuse colors from the start. */
function supersetColorForGroup(group: number | null): string | null {
  if (group == null) return null;
  return SUPERSET_COLORS[(group - 1) % SUPERSET_COLORS.length] ?? null;
}

type SetPatch = Parameters<ReturnType<typeof useActiveWorkout.getState>['updateSet']>[2];

/** Which bottom sheet is open, and for which exercise or set. */
type SheetState =
  | { kind: 'none' }
  | { kind: 'menu'; workoutExerciseId: string }
  | { kind: 'rest'; workoutExerciseId: string }
  | { kind: 'setType'; workoutExerciseId: string; setId: string }
  | { kind: 'superset'; workoutExerciseId: string }
  | { kind: 'description'; workoutExerciseId: string }
  | { kind: 'note'; workoutExerciseId: string }
  | { kind: 'finish' }
  | { kind: 'name' };

export default function ActiveWorkoutScreen() {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const workout = useActiveWorkout((state) => state.workout);
  const session = useActiveWorkout((state) => state.session);
  // Reads the store at call time, so the handlers below never act on stale state.
  const getWorkoutStore = useActiveWorkout.getState;
  const settings = useSettings();
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });
  const [nameDraft, setNameDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const startRest = useRestTimer((state) => state.start);
  useEffect(() => {
    if (settings.restNotifications) void ensureNotificationPermission();
  }, [settings.restNotifications]);
  // The floating "workout in progress" bar is shown only while this screen is not focused.
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
  // Rest set on this exercise in the workout, else on the exercise itself, else the app default.
  const restSecondsFor = useCallback(
    (workoutExerciseId: string) => {
      const workoutExercise = workout?.exercises.find((exercise) => exercise.id === workoutExerciseId);
      if (!workoutExercise) return settings.defaultRestSeconds;
      if (workoutExercise.restSeconds != null) return workoutExercise.restSeconds;
      const exerciseDetails = exercisesById.get(workoutExercise.exerciseId);
      return exerciseDetails?.restSeconds ?? settings.defaultRestSeconds;
    },
    [workout?.exercises, exercisesById, settings.defaultRestSeconds],
  );

  // Latest values for the stable handlers below. Handlers never change identity,
  // so memoized cards and set rows re-render only when their own data changes.
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

  const toggleSet = useCallback(
    (workoutExerciseId: string, setId: string) => {
      const toggleResult = getWorkoutStore().toggleSet(workoutExerciseId, setId);
      const latestValues = latestValuesRef.current;
      if (toggleResult?.completed && latestValues.mode === 'new' && latestValues.autoStartRest) {
        const restSeconds = latestValues.restSecondsFor(workoutExerciseId);
        // Start the rest timer after this frame so the tick paints first.
        if (restSeconds > 0) requestAnimationFrame(() => startRest(restSeconds));
      }
    },
    [getWorkoutStore, startRest],
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

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <Button title={translate('common.close')} variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const completedSets = workout.exercises.flatMap((exercise) => exercise.sets.filter((set) => set.completed));
  const workingSetCount = countWorkingSets(completedSets);
  // Editing a finished workout shows its saved duration instead of a live timer.
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

  const setCurrentExerciseRest = (seconds: number | null) => {
    if (currentExercise) getWorkoutStore().setExerciseRest(currentExercise.id, seconds);
    closeSheet();
  };

  const replaceCurrentExercise = () => {
    if (!currentExercise) return;
    closeSheet();
    push({ pathname: '/exercise/picker', params: { mode: 'replace', target: currentExercise.id } });
  };

  // In a superset: leave it. Not in one: pick a partner to create it with.
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
    // Join the partner's superset, or -1 to start a new one.
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
        finishButtonTitle={session.mode === 'new' ? translate('workout.finish') : translate('common.save')}
        canFinish={completedSets.length > 0}
        onMinimizePress={() => router.back()}
        onNamePress={openRename}
        onFinishPress={() => setSheet({ kind: 'finish' })}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
          showsVerticalScrollIndicator={false}
        >
          <WorkoutStats
            startedAt={workout.startedAt}
            durationSec={fixedDurationSeconds}
            exerciseCount={workout.exercises.length}
            setCount={workingSetCount}
            style={{ marginBottom: spacing.md }}
          />

          {workout.exercises.map((workoutExercise) => {
            const exerciseDetails = exercisesById.get(workoutExercise.exerciseId);
            return (
              <ExerciseCard
                key={workoutExercise.id}
                workoutExercise={workoutExercise}
                exerciseDetails={exerciseDetails}
                units={units}
                showRpe={settings.showRpe}
                hasDescription={exerciseDisplayDescription(exerciseDetails, i18n.language).length > 0}
                supersetColor={supersetColorForGroup(workoutExercise.supersetGroup)}
                onMenu={openExerciseMenu}
                onDescriptionPress={openDescription}
                onNotePress={openNote}
                onAddSet={addSet}
                onSetChange={changeSet}
                onSetToggle={toggleSet}
                onSetDelete={deleteSetWithUndo}
                onSetTypePress={openSetTypePicker}
              />
            );
          })}

          <Button
            title={translate('workout.addExercise')}
            size="lg"
            fullWidth
            variant={hasNoExercises ? 'primary' : 'secondary'}
            icon={
              <Icon icon={Plus} size={20} color={hasNoExercises ? 'onAccent' : 'text'} strokeWidth={2.5} />
            }
            onPress={() => push({ pathname: '/exercise/picker', params: { mode: 'workout' } })}
            style={{ marginTop: spacing.sm }}
          />
          {session.mode === 'new' ? (
            <Button
              title={translate('workout.discard')}
              variant="ghost"
              fullWidth
              onPress={discardWorkout}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
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

      <RenameWorkoutSheet
        visible={sheet.kind === 'name'}
        onClose={closeSheet}
        nameDraft={nameDraft}
        onNameDraftChange={setNameDraft}
        onSave={saveName}
      />

      <FinishWorkoutSheet
        visible={sheet.kind === 'finish'}
        onClose={closeSheet}
        startedAt={workout.startedAt}
        durationSec={fixedDurationSeconds}
        exerciseCount={workout.exercises.length}
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
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  restTimerWrapper: { position: 'absolute', left: spacing.lg, right: spacing.lg },
});
