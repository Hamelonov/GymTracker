import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ExerciseRow } from '@/db/schema';
import { Card, Text, spacing } from '@/ui';
import { MuscleMap } from './MuscleMap';

const FIGURE_HEIGHT = 220;

/** Карточка на экране упражнения: силуэт спереди и сзади с подсветкой рабочих мышц. */
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
    </Card>
  );
}

const styles = StyleSheet.create({
  figures: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
  figure: { alignItems: 'center', gap: spacing.sm },
});
