import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { WorkoutSummary } from '@/db/repo/workouts';
import { toDayKey } from '@/domain/dates';
import { Text, spacing } from '@/ui';
import { buildWorkoutDayKeys, listYearsNewestFirst } from './calendarGrid';
import { YearMonthGrid } from './YearMonthGrid';

const MONTHS_IN_ROW = 3;
const MONTHS_IN_YEAR = 12;
const COLUMN_GAP = spacing.lg;

interface YearCalendarViewProps {
  workouts: WorkoutSummary[];
  now: number;
}

/** Год целиком, как в Hevy: 12 мини-месяцев по три в ряд. Годы идут от нового к старому. */
export function YearCalendarView({ workouts, now }: YearCalendarViewProps) {
  const { width: screenWidth } = useWindowDimensions();
  const todayKey = toDayKey(now);
  // Округляем вниз: при дробной ширине третий месяц не помещался в ряд и переносился вниз.
  const monthWidth = Math.floor(
    (screenWidth - spacing.lg * 2 - COLUMN_GAP * (MONTHS_IN_ROW - 1)) / MONTHS_IN_ROW,
  );

  const workoutDayKeys = useMemo(
    () => buildWorkoutDayKeys(workouts.map((workout) => workout.startedAt)),
    [workouts],
  );
  const years = useMemo(() => {
    const startTimes = workouts.map((workout) => workout.startedAt);
    const earliestWorkoutAt = startTimes.length > 0 ? Math.min(...startTimes) : null;
    const latestWorkoutAt = startTimes.length > 0 ? Math.max(...startTimes) : null;
    return listYearsNewestFirst(now, earliestWorkoutAt, latestWorkoutAt);
  }, [workouts, now]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {years.map((year) => (
        <View key={year}>
          <Text variant="h1" style={styles.yearTitle}>
            {year}
          </Text>
          <View style={styles.months}>
            {Array.from({ length: MONTHS_IN_YEAR }, (_, monthIndex) => (
              <YearMonthGrid
                key={monthIndex}
                monthStart={new Date(year, monthIndex, 1)}
                workoutDayKeys={workoutDayKeys}
                todayKey={todayKey}
                width={monthWidth}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  yearTitle: { paddingVertical: spacing.md },
  months: { flexDirection: 'row', flexWrap: 'wrap', columnGap: COLUMN_GAP, rowGap: spacing.xl },
});
