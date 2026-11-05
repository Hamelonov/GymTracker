import { router, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { push } from '@/lib/nav';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { ensureNotificationPermission } from '@/lib/notifications';
import { getExercisesByIds } from '@/db/repo/exercises';
import { useQuery } from '@/db/version';
import { countWorkingSets } from '@/domain/volume';
import { formatDateTime } from '@/domain/dates';
import { ActiveWorkoutHeader } from '@/features/workout/ActiveWorkoutHeader';
import { ActiveWorkoutSheets } from '@/features/workout/ActiveWorkoutSheets';
import { EntryModeTabs } from '@/features/workout/EntryModeTabs';
import { useEntryMode } from '@/features/workout/pen/useEntryMode';
import { PenEditor } from '@/features/workout/pen/PenEditor';
import { PenToolbar } from '@/features/workout/pen/PenToolbar';
import { usePenText } from '@/features/workout/pen/usePenText';
import { ExerciseCard } from '@/features/workout/ExerciseCard';
import { RestTimerBar } from '@/features/workout/RestTimerBar';
import { useActiveWorkoutActions } from '@/features/workout/useActiveWorkoutActions';
import { WorkoutStats } from '@/features/workout/WorkoutStats';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useSettings } from '@/store/settings';
import { Button, EmptyState, Icon, layout, spacing, useColors } from '@/ui';

export default function ActiveWorkoutScreen() {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const workout = useActiveWorkout((state) => state.workout);
  const session = useActiveWorkout((state) => state.session);
  const entryMode = useActiveWorkout((state) => state.entryMode);
  const penText = useActiveWorkout((state) => state.penText);
  const getWorkoutStore = useActiveWorkout.getState;
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  const hasRestNotifications = useSettings((state) => state.restNotifications);
  const shouldKeepAwake = useSettings((state) => state.keepAwake);
  useEffect(() => {
    if (hasRestNotifications) void ensureNotificationPermission();
  }, [hasRestNotifications]);
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
  const penState = usePenText(penText, exerciseIds);
  const units = useMemo(() => ({ weight: weightUnit, distance: distanceUnit }), [weightUnit, distanceUnit]);
  const { applyPenNow, switchEntryMode } = useEntryMode({ workout, penText, penState, units, exercisesById });
  // При редактировании сохранённой тренировки «Ручки» нет, даже если режим остался в хранилище.
  const isPenMode = entryMode === 'pen' && session.mode === 'new';
  const actions = useActiveWorkoutActions({ workout, session, exercisesById, isPenMode, applyPenNow });

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <Button title={translate('common.close')} variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const completedSets = workout.exercises.flatMap((exercise) => exercise.sets.filter((set) => set.completed));
  // В «Ручке» текст ещё не применён, поэтому счётчики и доступность «Завершить» берутся из разобранных строк.
  const workingSetCount = isPenMode ? penState.setCount : countWorkingSets(completedSets);
  const exerciseCount = isPenMode ? penState.exerciseCount : workout.exercises.length;
  // В «Ручке» завершать можно только то, что записано в тексте: карточки при применении будут заменены.
  const canFinish = isPenMode ? penState.setCount > 0 : completedSets.length > 0;
  // При редактировании завершённой тренировки показывается сохранённая длительность вместо живого таймера.
  const fixedDurationSeconds =
    session.mode === 'new' ? undefined : Math.round((session.finishedAt - workout.startedAt) / 1000);
  const hasNoExercises = workout.exercises.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ActiveWorkoutHeader
        workoutName={workout.name}
        dateText={session.mode === 'edit' ? formatDateTime(workout.startedAt, i18n.language) : null}
        isEditing={session.mode === 'edit'}
        finishButtonTitle={session.mode === 'new' ? translate('workout.finish') : translate('common.save')}
        canFinish={canFinish}
        onMinimizePress={() => router.back()}
        onNamePress={actions.openRename}
        onFinishPress={actions.handleFinishPress}
      />

      <WorkoutStats
        variant="strip"
        startedAt={workout.startedAt}
        durationSec={fixedDurationSeconds}
        exerciseCount={exerciseCount}
        setCount={workingSetCount}
        trailing={
          session.mode === 'new' ? (
            <EntryModeTabs value={entryMode} onChange={(mode) => void switchEntryMode(mode)} />
          ) : null
        }
      />

      {isPenMode ? <PenToolbar penState={penState} onRestTimerPress={actions.openPenRestPicker} /> : null}

      {/* Отступ считается от положения клавиатуры: если система сама сжала окно, он равен нулю. */}
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView
          style={styles.fill}
          keyboardShouldPersistTaps="handled"
          // Запас под плашку отдыха есть всегда, иначе при её появлении экран прыгал бы.
          contentContainerStyle={{ paddingBottom: insets.bottom + layout.restDockHeight + spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {isPenMode ? (
            <PenEditor
              text={penText}
              onTextChange={(text) => getWorkoutStore().setPenText(text)}
              penState={penState}
            />
          ) : null}

          {!isPenMode &&
            workout.exercises.map((workoutExercise, index) => {
              const exerciseDetails = exercisesById.get(workoutExercise.exerciseId);
              return (
                <ExerciseCard
                  key={workoutExercise.id}
                  workoutExercise={workoutExercise}
                  exerciseDetails={exerciseDetails}
                  units={units}
                  isFirst={index === 0}
                  onMenu={actions.openExerciseMenu}
                  onNotePress={actions.openNote}
                  onAddSet={actions.addSet}
                  onSetChange={actions.changeSet}
                  onSetToggle={actions.toggleSet}
                  onSetDelete={actions.deleteSetWithUndo}
                  onSetTypePress={actions.openSetTypePicker}
                />
              );
            })}

          {!isPenMode && hasNoExercises ? (
            <EmptyState
              title={translate('workout.noExercises')}
              hint={translate('workout.noExercisesHint')}
            />
          ) : null}

          <View style={styles.pageActions}>
            {!isPenMode ? (
              <Button
                title={translate('workout.addExercise')}
                size="lg"
                fullWidth
                variant={hasNoExercises ? 'primary' : 'secondary'}
                icon={
                  <Icon
                    icon={Plus}
                    size={20}
                    color={hasNoExercises ? 'onAccent' : 'text'}
                    strokeWidth={2.5}
                  />
                }
                onPress={() => push({ pathname: '/exercise/picker', params: { mode: 'workout' } })}
              />
            ) : null}
            {session.mode === 'new' ? (
              <Button
                title={translate('workout.discard')}
                variant="ghost"
                tone="danger"
                fullWidth
                onPress={actions.discardWorkout}
              />
            ) : null}
          </View>
        </ScrollView>
        <RestTimerBar />
      </KeyboardAvoidingView>

      {shouldKeepAwake ? <KeepScreenAwake /> : null}

      <ActiveWorkoutSheets
        workout={workout}
        exerciseIds={exerciseIds}
        exercisesById={exercisesById}
        units={units}
        actions={actions}
        fixedDurationSeconds={fixedDurationSeconds}
        exerciseCount={exerciseCount}
        setCount={workingSetCount}
      />
    </View>
  );
}

function KeepScreenAwake() {
  useKeepAwake('workout');
  return null;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pageActions: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.sm },
});
