import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { WorkoutDetail } from '@/db/repo/workouts';
import { WorkoutStats } from '@/features/workout/WorkoutStats';
import { Text, spacing, useColors } from '@/ui';
import { WorkoutExerciseBlock } from './WorkoutExerciseBlock';

/** Итоги, заметка и упражнения с подходами одной завершённой тренировки. */
export function WorkoutDetailsBody({ workout }: { workout: WorkoutDetail }) {
  const colors = useColors();

  return (
    <View>
      <WorkoutStats
        variant="surface"
        durationSec={workout.durationSec}
        exerciseCount={workout.exercises.length}
        setCount={workout.setCount}
      />
      {workout.notes ? (
        <Text color="muted" style={styles.notes}>
          {workout.notes}
        </Text>
      ) : null}
      {workout.exercises.map((workoutExercise, exerciseIndex) => (
        <View
          key={workoutExercise.id}
          style={exerciseIndex > 0 ? [styles.divider, { borderTopColor: colors.border }] : null}
        >
          <WorkoutExerciseBlock workoutExercise={workoutExercise} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  notes: { marginTop: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
});
