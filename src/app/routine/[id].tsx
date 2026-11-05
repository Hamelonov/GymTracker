import { useLocalSearchParams } from 'expo-router';
import { push } from '@/lib/nav';
import { Pencil, Play } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName, getExercisesByIds } from '@/db/repo/exercises';
import { getRoutine } from '@/db/repo/routines';
import { useQuery } from '@/db/version';
import { formatRelativeDay } from '@/domain/dates';
import { getSetFieldsForExerciseType } from '@/domain/types';
import { formatSetValues } from '@/features/workout/format';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settings';
import { Button, FastPressable, Icon, IconButton, Screen, Text, confirm, spacing, useColors } from '@/ui';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t: translate, i18n } = useTranslation();
  const colors = useColors();
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  const routine = useQuery(() => (id ? getRoutine(id) : undefined), [id]);
  const exerciseIds = useMemo(
    () => routine?.exercises.map((routineExercise) => routineExercise.exerciseId) ?? [],
    [routine],
  );
  const exercisesById = useQuery(() => getExercisesByIds(exerciseIds), [exerciseIds.join(',')]);
  const activeWorkout = useActiveWorkout((state) => state.workout);
  const units = { weight: weightUnit, distance: distanceUnit } as const;

  if (!routine) return <Screen header={{ backButton: true }} />;

  const startRoutine = async () => {
    if (activeWorkout) {
      const isConfirmed = await confirm({
        title: translate('home.inProgress'),
        message: translate('workout.discardConfirm'),
        destructive: true,
        confirmLabel: translate('common.discard'),
      });
      if (!isConfirmed) return;
      useRestTimer.getState().skip();
      useActiveWorkout.getState().clear();
    }
    useActiveWorkout.getState().startFromRoutine(routine);
    push('/workout/active');
  };

  const lastPerformedLabel = routine.lastPerformedAt
    ? translate('home.lastPerformed', {
        date: formatRelativeDay(routine.lastPerformedAt, i18n.language, translate),
      })
    : translate('home.neverPerformed');

  return (
    <Screen
      header={{
        backButton: true,
        title: routine.name,
        subtitle: lastPerformedLabel,
        right: (
          <IconButton
            icon={Pencil}
            label={translate('common.edit')}
            onPress={() => push({ pathname: '/routine/edit', params: { id: routine.id } })}
          />
        ),
      }}
      footer={
        <Button
          title={translate('home.startRoutine')}
          size="lg"
          fullWidth
          icon={<Icon icon={Play} size={20} color="onAccent" strokeWidth={2.5} />}
          onPress={startRoutine}
        />
      }
    >
      {routine.notes ? (
        <Text color="muted" style={styles.notes}>
          {routine.notes}
        </Text>
      ) : null}
      {routine.exercises.map((routineExercise, exerciseIndex) => {
        const exercise = exercisesById.get(routineExercise.exerciseId);
        const fields = getSetFieldsForExerciseType(exercise?.type ?? 'weight_reps');
        return (
          <FastPressable
            key={routineExercise.id}
            onPress={() => push({ pathname: '/exercise/[id]', params: { id: routineExercise.exerciseId } })}
            style={[
              styles.exerciseBlock,
              exerciseIndex > 0 ? styles.blockDivider : null,
              exerciseIndex > 0 ? { borderTopColor: colors.border } : null,
            ]}
          >
            <View>
              <Text variant="h3">{exercise ? exerciseName(exercise, i18n.language) : '…'}</Text>
              {routineExercise.supersetGroup != null ? (
                <Text variant="label" color="muted">
                  {translate('workout.superset').toUpperCase()} {routineExercise.supersetGroup}
                </Text>
              ) : null}
              {routineExercise.note ? (
                <Text variant="caption" color="muted" style={styles.exerciseNote}>
                  {routineExercise.note}
                </Text>
              ) : null}
              <View style={styles.setsColumn}>
                {routineExercise.sets.map((routineSet, index) => (
                  <View key={routineSet.id} style={styles.setRow}>
                    <Text variant="caption" color="faint" style={styles.setNumber} tabular>
                      {routineSet.type === 'normal'
                        ? index + 1
                        : translate(`workout.setTypeShort.${routineSet.type}`)}
                    </Text>
                    <Text variant="caption" tabular>
                      {formatSetValues({ ...routineSet, rir: null }, fields, units)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </FastPressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notes: { marginBottom: spacing.lg },
  exerciseBlock: { paddingVertical: spacing.lg },
  blockDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  exerciseNote: { marginTop: spacing.xs },
  setsColumn: { marginTop: spacing.sm, gap: spacing.xs },
  setNumber: { width: 20 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
