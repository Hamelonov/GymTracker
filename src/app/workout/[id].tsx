import { router, useLocalSearchParams } from 'expo-router';
import { Ellipsis } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { getWorkout } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatFullDate, formatTime } from '@/domain/dates';
import { WorkoutActionsSheet } from '@/features/history/WorkoutActionsSheet';
import { WorkoutDetailsBody } from '@/features/history/WorkoutDetailsBody';
import { IconButton, Screen, Text, spacing } from '@/ui';

/**
 * Одна тренировка из списка истории. В отличие от дня в календаре тренировка тут одна,
 * поэтому время и меню «⋯» стоят в шапке, а не над тренировкой.
 */
export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t: translate, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const workout = useQuery(() => (id ? getWorkout(id) : undefined), [id]);

  if (!workout) {
    return <Screen header={{ backButton: true }} />;
  }

  return (
    <Screen
      header={{
        backButton: true,
        title: `${formatFullDate(workout.startedAt, i18n.language)}, ${formatTime(workout.startedAt)}`,
        right: (
          <IconButton
            icon={Ellipsis}
            label={translate('common.menu')}
            onPress={() => setIsMenuOpen(true)}
            haptic="selection"
          />
        ),
      }}
    >
      <Text variant="h2" style={styles.workoutName}>
        {workout.name}
      </Text>
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

const styles = StyleSheet.create({
  workoutName: { marginBottom: spacing.md },
});
