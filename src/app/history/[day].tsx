import { addDays, parseISO } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { Ellipsis } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { getWorkout, listWorkouts, type WorkoutDetail } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatFullDate, formatTime } from '@/domain/dates';
import { WorkoutActionsSheet } from '@/features/history/WorkoutActionsSheet';
import { WorkoutDetailsBody } from '@/features/history/WorkoutDetailsBody';
import { IconButton, Screen, Text, spacing, useColors } from '@/ui';

/** Тренировки дня по порядку: утренняя первой. */
function loadDayWorkouts(dayStart: Date): WorkoutDetail[] {
  const daySummaries = listWorkouts({ from: dayStart.getTime(), to: addDays(dayStart, 1).getTime() });
  return daySummaries
    .map((summary) => getWorkout(summary.id))
    .filter((workout): workout is WorkoutDetail => workout != null)
    .sort((left, right) => left.startedAt - right.startedAt);
}

/** День из календаря истории: в шапке дата, ниже все тренировки этого дня одна за другой. */
export default function HistoryDayScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const { i18n } = useTranslation();
  const colors = useColors();
  const [menuWorkoutId, setMenuWorkoutId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dayStart = parseISO(day);
  const dayWorkouts = useQuery(() => loadDayWorkouts(dayStart), [day]);
  const menuWorkout = dayWorkouts.find((workout) => workout.id === menuWorkoutId);

  // Удалили последнюю тренировку дня — показывать больше нечего.
  const handleWorkoutDeleted = () => {
    if (dayWorkouts.length <= 1) router.back();
  };

  return (
    <Screen header={{ backButton: true, title: formatFullDate(dayStart.getTime(), i18n.language) }}>
      {dayWorkouts.map((workout, index) => (
        <View
          key={workout.id}
          style={[
            styles.workoutSection,
            index > 0 ? [styles.workoutDivider, { borderTopColor: colors.border }] : null,
          ]}
        >
          <View style={styles.workoutTitleRow}>
            <View style={styles.workoutTitleColumn}>
              <Text variant="h3">{workout.name}</Text>
              <Text variant="caption" color="muted" tabular>
                {formatTime(workout.startedAt)}
              </Text>
            </View>
            <IconButton
              icon={Ellipsis}
              variant="filled"
              onPress={() => {
                setMenuWorkoutId(workout.id);
                setIsMenuOpen(true);
              }}
              haptic="selection"
            />
          </View>
          <WorkoutDetailsBody workout={workout} />
        </View>
      ))}
      {menuWorkout ? (
        <WorkoutActionsSheet
          workout={menuWorkout}
          visible={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onDeleted={handleWorkoutDeleted}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  workoutSection: { paddingBottom: spacing.md },
  workoutDivider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.lg },
  workoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  workoutTitleColumn: { flex: 1, gap: 2 },
});
