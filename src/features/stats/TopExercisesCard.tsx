import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { topExercises } from '@/db/repo/workouts';
import { push } from '@/lib/nav';
import { Card, ListItem, SectionTitle, Text, spacing } from '@/ui';

type TopExercise = ReturnType<typeof topExercises>[number];

/** "Top exercises" section: the most used exercises in the period with how often they were done. */
export function TopExercisesCard({ exercises }: { exercises: TopExercise[] }) {
  const { t: translate, i18n } = useTranslation();
  return (
    <>
      <SectionTitle title={translate('stats.topExercises')} />
      <Card padded={false}>
        {exercises.length === 0 ? (
          <Text color="faint" style={styles.emptyText}>
            {translate('stats.noData')}
          </Text>
        ) : (
          exercises.map((exercise) => (
            <ListItem
              key={exercise.exerciseId}
              title={exerciseName(exercise, i18n.language)}
              right={
                <Text variant="caption" color="muted">
                  {exercise.count}×
                </Text>
              }
              chevron
              onPress={() => push({ pathname: '/exercise/[id]', params: { id: exercise.exerciseId } })}
              style={styles.listItem}
            />
          ))
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  emptyText: { padding: spacing.lg },
  listItem: { paddingHorizontal: spacing.lg },
});
