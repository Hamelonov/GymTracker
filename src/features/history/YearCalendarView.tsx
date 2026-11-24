import React, { useMemo, useRef } from 'react';
import { ScrollView, type ScrollViewInstance, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { WorkoutSummary } from '@/db/repo/workouts';
import { toDayKey } from '@/domain/dates';
import { Text, spacing } from '@/ui';
import { buildWorkoutDayKeys, listYearsOldestFirst } from './calendarGrid';
import { YearMonthGrid } from './YearMonthGrid';

const MONTHS_IN_ROW = 3;
const MONTHS_IN_YEAR = 12;
const COLUMN_GAP = spacing.lg;

interface YearCalendarViewProps {
  workouts: WorkoutSummary[];
  now: number;
}

/** Год целиком: 12 мини-месяцев по три в ряд. Годы идут сверху вниз от старого к новому. */
export function YearCalendarView({ workouts, now }: YearCalendarViewProps) {
  const { width: screenWidth } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  // Открываем на текущем годе один раз; дальше пользователь прокручивает сам.
  const hasScrolledToCurrentYear = useRef(false);
  const currentYear = new Date(now).getFullYear();
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
    return listYearsOldestFirst(now, earliestWorkoutAt, latestWorkoutAt);
  }, [workouts, now]);

  // Прокручиваем к началу года, а не в самый конец: иначе заголовок года уезжает за верхний край.
  function scrollToCurrentYear(currentYearTop: number) {
    if (hasScrolledToCurrentYear.current) return;
    hasScrolledToCurrentYear.current = true;
    scrollViewRef.current?.scrollTo({ y: currentYearTop, animated: false });
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {years.map((year) => (
        <View
          key={year}
          onLayout={
            year === currentYear ? (event) => scrollToCurrentYear(event.nativeEvent.layout.y) : undefined
          }
        >
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
