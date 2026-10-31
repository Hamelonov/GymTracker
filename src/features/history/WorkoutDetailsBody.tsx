import { push } from '@/lib/nav';
import { Trophy } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { WorkoutDetail } from '@/db/repo/workouts';
import { MuscleThumbnail } from '@/features/muscles/MuscleThumbnail';
import { formatSetLineWithExtras } from '@/features/workout/format';
import { WorkoutStats } from '@/features/workout/WorkoutStats';
import { useSettings } from '@/store/settings';
import { Card, Icon, Pressable, Text, spacing, useColors } from '@/ui';

/** Итоги, заметка и упражнения с подходами одной завершённой тренировки. */
export function WorkoutDetailsBody({ workout }: { workout: WorkoutDetail }) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  const units = useMemo(() => ({ weight: weightUnit, distance: distanceUnit }), [weightUnit, distanceUnit]);

  return (
    <View>
      <WorkoutStats
        durationSec={workout.durationSec}
        exerciseCount={workout.exercises.length}
        setCount={workout.setCount}
        style={{ marginBottom: spacing.lg }}
      />
      {workout.notes ? (
        <Text color="muted" style={{ marginBottom: spacing.lg }}>
          {workout.notes}
        </Text>
      ) : null}

      {workout.exercises.map((workoutExercise) => (
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
                    {formatSetLineWithExtras(set, workoutExercise.exercise.type, units, i18n.language)}
                  </Text>
                  <View style={styles.recordBadges}>
                    {set.prTypes.map((recordType) => (
                      <View key={recordType} style={[styles.recordBadge, { backgroundColor: colors.accent }]}>
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
      ))}
    </View>
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
