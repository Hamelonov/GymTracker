import React from 'react';
import { useTranslation } from 'react-i18next';
import { exerciseName } from '@/db/repo/exercises';
import type { topExercises } from '@/db/repo/workouts';
import { push } from '@/lib/nav';
import { ListGroup, ListItem, SectionTitle, Text } from '@/ui';

type TopExercise = ReturnType<typeof topExercises>[number];

/** Раздел «Топ упражнений»: самые используемые упражнения за период и сколько раз их делали. */
export function TopExercisesCard({ exercises }: { exercises: TopExercise[] }) {
  const { t: translate, i18n } = useTranslation();
  return (
    <>
      <SectionTitle title={translate('stats.topExercises')} />
      {exercises.length === 0 ? (
        <Text color="muted">{translate('stats.noData')}</Text>
      ) : (
        <ListGroup>
          {exercises.map((exercise) => (
            <ListItem
              key={exercise.exerciseId}
              title={exerciseName(exercise, i18n.language)}
              right={
                <Text variant="caption" color="muted" tabular>
                  {exercise.count}×
                </Text>
              }
              chevron
              onPress={() => push({ pathname: '/exercise/[id]', params: { id: exercise.exerciseId } })}
            />
          ))}
        </ListGroup>
      )}
    </>
  );
}
