import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ExerciseRow } from '@/db/schema';
import { Card, Chip, Text, spacing } from '@/ui';
import { MuscleMap } from './MuscleMap';

const FIGURE_HEIGHT = 220;

/** Карточка на экране упражнения: силуэт спереди и сзади с подсветкой и подписи мышц под ним. */
export function MuscleMapCard({ exercise }: { exercise: ExerciseRow }) {
  const { t: translate } = useTranslation();
  return (
    <Card>
      <View style={styles.figures}>
        <View style={styles.figure}>
          <MuscleMap
            primary={exercise.muscleGroup}
            secondary={exercise.secondaryMuscles}
            side="front"
            height={FIGURE_HEIGHT}
          />
          <Text variant="label" color="faint">
            {translate('exercise.bodyFront').toUpperCase()}
          </Text>
        </View>
        <View style={styles.figure}>
          <MuscleMap
            primary={exercise.muscleGroup}
            secondary={exercise.secondaryMuscles}
            side="back"
            height={FIGURE_HEIGHT}
          />
          <Text variant="label" color="faint">
            {translate('exercise.bodyBack').toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.legend}>
        <Chip label={translate(`muscles.${exercise.muscleGroup}`)} selected small />
        {exercise.secondaryMuscles.map((muscle) => (
          <Chip key={muscle} label={translate(`muscles.${muscle}`)} small />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  figures: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
  figure: { alignItems: 'center', gap: spacing.sm },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
