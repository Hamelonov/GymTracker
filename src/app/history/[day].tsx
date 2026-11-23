import { addDays, parseISO } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { getWorkout, listWorkouts, type WorkoutDetail } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatFullDate } from '@/domain/dates';
import { EmptyDay } from '@/features/history/EmptyDay';
import { logWorkoutOnDay } from '@/features/history/logWorkoutOnDay';
import { WorkoutSection } from '@/features/history/WorkoutSection';
import { Icon, Pressable, Screen, spacing, useColors } from '@/ui';

/** Тренировки дня по порядку: утренняя первой. */
function loadDayWorkouts(dayStart: Date): WorkoutDetail[] {
  const daySummaries = listWorkouts({ from: dayStart.getTime(), to: addDays(dayStart, 1).getTime() });
  return daySummaries
    .map((summary) => getWorkout(summary.id))
    .filter((workout): workout is WorkoutDetail => workout != null)
    .sort((left, right) => left.startedAt - right.startedAt);
}

/**
 * День из календаря истории: в шапке дата и «+», ниже тренировки этого дня одна за другой.
 * Если тренировок не было, вместо них пустой вид с кнопкой записать тренировку.
 */
export default function HistoryDayScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const { t: translate, i18n } = useTranslation();
  const colors = useColors();
  const dayStart = parseISO(day);
  const dayWorkouts = useQuery(() => loadDayWorkouts(dayStart), [day]);

  const logWorkout = () => void logWorkoutOnDay(dayStart, translate);

  return (
    <Screen
      header={{
        backButton: true,
        title: formatFullDate(dayStart.getTime(), i18n.language),
        right: (
          <Pressable onPress={logWorkout} hitSlop={12} style={styles.addButton} haptic="light">
            <Icon icon={Plus} size={28} />
          </Pressable>
        ),
      }}
    >
      {dayWorkouts.length === 0 ? <EmptyDay onLogWorkout={logWorkout} /> : null}
      {dayWorkouts.map((workout, index) => (
        <View
          key={workout.id}
          style={[
            styles.workoutSection,
            index > 0 ? [styles.workoutDivider, { borderTopColor: colors.border }] : null,
          ]}
        >
          <WorkoutSection workout={workout} />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  workoutSection: { paddingBottom: spacing.md },
  workoutDivider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.lg },
});
