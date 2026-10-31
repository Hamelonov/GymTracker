import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getWorkout } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatFullDate } from '@/domain/dates';
import { WorkoutSection } from '@/features/history/WorkoutSection';
import { Screen } from '@/ui';

/** Одна тренировка из списка истории: выглядит так же, как день из календаря. */
export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { i18n } = useTranslation();
  const workout = useQuery(() => (id ? getWorkout(id) : undefined), [id]);

  if (!workout) {
    return <Screen header={{ backButton: true }} />;
  }

  return (
    <Screen header={{ backButton: true, title: formatFullDate(workout.startedAt, i18n.language) }}>
      <WorkoutSection workout={workout} onDeleted={() => router.back()} />
    </Screen>
  );
}
