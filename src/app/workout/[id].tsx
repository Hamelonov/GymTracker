import { router, useLocalSearchParams } from 'expo-router';
import { push } from '@/lib/nav';
import { Ellipsis, Pencil, Repeat, Save, Trash2, Trophy } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import { createRoutine, routineInputFromWorkout } from '@/db/repo/routines';
import { deleteWorkout, getWorkout, workoutToActiveWorkout } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatDateTime } from '@/domain/dates';
import { getSetFieldsForExerciseType } from '@/domain/types';
import { MuscleThumbnail } from '@/features/muscles/MuscleThumbnail';
import { formatSetLineWithExtras } from '@/features/workout/format';
import { WorkoutStats } from '@/features/workout/WorkoutStats';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settings';
import {
  Card,
  Icon,
  IconButton,
  ListItem,
  Pressable,
  Screen,
  Sheet,
  Text,
  confirm,
  spacing,
  toast,
  useColors,
} from '@/ui';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const settings = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const workout = useQuery(() => (id ? getWorkout(id) : undefined), [id]);
  const units = useMemo(
    () => ({ weight: settings.weightUnit, distance: settings.distanceUnit }),
    [settings.weightUnit, settings.distanceUnit],
  );
  const activeWorkout = useActiveWorkout((state) => state.workout);
  const session = useActiveWorkout((state) => state.session);

  if (!workout) {
    return <Screen header={{ backButton: true }} />;
  }

  /** Спрашивает, отбросить ли тренировку в процессе перед началом другой. Возвращает true, когда можно продолжать. */
  const ensureNoActiveWorkout = async () => {
    if (!activeWorkout || session.mode === 'edit') return true;
    const confirmed = await confirm({
      title: translate('home.inProgress'),
      message: translate('workout.discardConfirm'),
      destructive: true,
      confirmLabel: translate('common.discard'),
    });
    if (confirmed) {
      useRestTimer.getState().skip();
      useActiveWorkout.getState().clear();
    }
    return confirmed;
  };

  const editWorkout = async () => {
    setIsMenuOpen(false);
    if (!(await ensureNoActiveWorkout())) return;
    useActiveWorkout.getState().startFromActive(workoutToActiveWorkout(workout), {
      mode: 'edit',
      workoutId: workout.id,
      finishedAt: workout.finishedAt,
    });
    push('/workout/active');
  };

  // Начать новую тренировку с теми же упражнениями; значения этой тренировки станут «предыдущими».
  const repeatWorkout = async () => {
    setIsMenuOpen(false);
    if (!(await ensureNoActiveWorkout())) return;
    const workoutCopy = workoutToActiveWorkout(workout);
    useActiveWorkout.getState().startFromActive(
      {
        ...workoutCopy,
        id: `${Date.now().toString(36)}r`,
        startedAt: Date.now(),
        notes: '',
        exercises: workoutCopy.exercises.map((exercise) => ({
          ...exercise,
          id: `${exercise.id}r`,
          note: '',
          sets: exercise.sets.map((set) => ({
            ...set,
            id: `${set.id}r`,
            completed: false,
            completedAt: null,
            prTypes: undefined,
            previous: {
              weightKg: set.weightKg,
              reps: set.reps,
              durationSec: set.durationSec,
              distanceM: set.distanceM,
              rpe: set.rpe,
              rir: set.rir,
            },
          })),
        })),
      },
      { mode: 'new' },
    );
    push('/workout/active');
  };

  const saveAsRoutine = () => {
    setIsMenuOpen(false);
    const routineId = createRoutine(routineInputFromWorkout(workoutToActiveWorkout(workout)));
    toast(translate('routine.saved'));
    push({ pathname: '/routine/[id]', params: { id: routineId } });
  };

  const deleteThisWorkout = async () => {
    setIsMenuOpen(false);
    const confirmed = await confirm({
      title: translate('history.deleteConfirm'),
      destructive: true,
      confirmLabel: translate('common.delete'),
    });
    if (!confirmed) return;
    deleteWorkout(workout.id);
    router.back();
  };

  return (
    <Screen
      header={{
        backButton: true,
        title: workout.name,
        subtitle: formatDateTime(workout.startedAt, i18n.language),
        right: (
          <IconButton
            icon={Ellipsis}
            variant="filled"
            onPress={() => setIsMenuOpen(true)}
            haptic="selection"
          />
        ),
      }}
    >
      <WorkoutStats
        durationSec={workout.durationSec}
        exerciseCount={workout.exercises.length}
        setCount={workout.setCount}
        prCount={workout.prCount}
        style={{ marginBottom: spacing.lg }}
      />
      {workout.notes ? (
        <Text color="muted" style={{ marginBottom: spacing.lg }}>
          {workout.notes}
        </Text>
      ) : null}

      {workout.exercises.map((workoutExercise) => {
        const fields = getSetFieldsForExerciseType(workoutExercise.exercise.type);
        return (
          <Card key={workoutExercise.id} raised style={{ marginBottom: spacing.md }}>
            <Pressable
              onPress={() => push({ pathname: '/exercise/[id]', params: { id: workoutExercise.exerciseId } })}
            >
              <View style={styles.exerciseTitleRow}>
                <MuscleThumbnail
                  primary={workoutExercise.exercise.muscleGroup}
                  secondary={workoutExercise.exercise.secondaryMuscles}
                  size={32}
                />
                <Text variant="h3" style={styles.exerciseTitle}>
                  {exerciseName(workoutExercise.exercise, i18n.language)}
                </Text>
              </View>
            </Pressable>
            {workoutExercise.note ? (
              <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
                {workoutExercise.note}
              </Text>
            ) : null}
            <View style={{ marginTop: spacing.md, gap: 6 }}>
              {workoutExercise.sets.map((set, index) => {
                const isNormalSet = set.type === 'normal';
                return (
                  <View key={set.id} style={styles.setRow}>
                    <View
                      style={[
                        styles.setNumberBadge,
                        { backgroundColor: isNormalSet ? colors.surfaceAlt : colors.text },
                      ]}
                    >
                      <Text variant="label" color={isNormalSet ? colors.text : colors.background}>
                        {isNormalSet ? index + 1 : translate(`workout.setTypeShort.${set.type}`)}
                      </Text>
                    </View>
                    <Text variant="bodyMedium" tabular style={{ flexShrink: 0 }}>
                      {formatSetLineWithExtras(set, fields, units)}
                    </Text>
                    <View style={styles.recordBadges}>
                      {set.prTypes.map((recordType) => (
                        <View
                          key={recordType}
                          style={[styles.recordBadge, { backgroundColor: colors.accent }]}
                        >
                          <Icon icon={Trophy} size={10} color="onAccent" />
                          <Text variant="label" color="onAccent">
                            {translate(`pr.${recordType}`).toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        );
      })}

      <Sheet visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} unpadded>
        <View style={{ paddingHorizontal: spacing.sm }}>
          <ListItem title={translate('common.edit')} left={<Icon icon={Pencil} />} onPress={editWorkout} />
          <ListItem
            title={translate('history.repeat')}
            left={<Icon icon={Repeat} />}
            onPress={repeatWorkout}
          />
          <ListItem
            title={translate('history.saveAsRoutine')}
            left={<Icon icon={Save} />}
            onPress={saveAsRoutine}
          />
          <ListItem
            title={translate('common.delete')}
            titleColor={colors.danger}
            left={<Icon icon={Trash2} color="danger" />}
            onPress={deleteThisWorkout}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  exerciseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exerciseTitle: { flex: 1 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setNumberBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  recordBadges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4 },
  recordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
  },
});
