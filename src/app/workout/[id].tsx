import { router, useLocalSearchParams } from 'expo-router';
import { Ellipsis } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getWorkout } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatDateTime } from '@/domain/dates';
import { WorkoutActionsSheet } from '@/features/history/WorkoutActionsSheet';
import { WorkoutDetailsBody } from '@/features/history/WorkoutDetailsBody';
import { IconButton, Screen } from '@/ui';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const workout = useQuery(() => (id ? getWorkout(id) : undefined), [id]);

  if (!workout) {
    return <Screen header={{ backButton: true }} />;
  }

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
      <WorkoutDetailsBody workout={workout} />
      <WorkoutActionsSheet
        workout={workout}
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onDeleted={() => router.back()}
      />
    </Screen>
  );
}
