import { addDays, parseISO } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { getWorkout, listWorkouts, type WorkoutDetail } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatFullDate } from '@/domain/dates';
import { WorkoutSection } from '@/features/history/WorkoutSection';
import { Screen, spacing, useColors } from '@/ui';

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
  const dayStart = parseISO(day);
  const dayWorkouts = useQuery(() => loadDayWorkouts(dayStart), [day]);

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
          <WorkoutSection workout={workout} onDeleted={handleWorkoutDeleted} />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  workoutSection: { paddingBottom: spacing.md },
  workoutDivider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.lg },
});
