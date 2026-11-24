import { FlashList } from '@shopify/flash-list';
import { addDays, format } from 'date-fns';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { WorkoutSummary } from '@/db/repo/workouts';
import { dateLocale, toDayKey } from '@/domain/dates';
import { calculateWeekStreak } from '@/features/stats/weekStreak';
import { Text, spacing, useColors } from '@/ui';
import { buildWorkoutDayKeys, countRestDays, listMonthsOldestFirst } from './calendarGrid';
import { GRID_LINE_WIDTH } from './gridLine';
import { HistoryStreaks } from './HistoryStreaks';
import { MonthCalendarBlock } from './MonthCalendarBlock';

// Любой понедельник: от него берём подписи дней недели в порядке сетки.
const SOME_MONDAY = new Date(2024, 0, 1);

interface MonthCalendarViewProps {
  workouts: WorkoutSummary[];
  now: number;
  onOpenDay: (dayKey: string) => void;
}

/**
 * Календарь по месяцам: под шапкой закреплены серии и дни недели,
 * ниже прокручиваются месяцы сверху вниз от старого к новому. Открывается на текущем месяце внизу.
 */
export function MonthCalendarView({ workouts, now, onOpenDay }: MonthCalendarViewProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const todayKey = toDayKey(now);

  const startTimes = useMemo(() => workouts.map((workout) => workout.startedAt), [workouts]);
  const workoutDayKeys = useMemo(() => buildWorkoutDayKeys(startTimes), [startTimes]);
  const latestWorkoutAt = startTimes.length > 0 ? Math.max(...startTimes) : null;
  const earliestWorkoutAt = startTimes.length > 0 ? Math.min(...startTimes) : null;
  const months = useMemo(
    () => listMonthsOldestFirst(now, earliestWorkoutAt, latestWorkoutAt),
    [now, earliestWorkoutAt, latestWorkoutAt],
  );

  const weeklyStreak = calculateWeekStreak(startTimes, now).current;
  const restDays = countRestDays(latestWorkoutAt, now);

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const name = format(addDays(SOME_MONDAY, dayIndex), 'EEE', { locale: dateLocale(i18n.language) });
        return name.charAt(0).toUpperCase() + name.slice(1);
      }),
    [i18n.language],
  );

  const renderMonth = useCallback(
    ({ item }: { item: Date }) => (
      <MonthCalendarBlock
        monthStart={item}
        workoutDayKeys={workoutDayKeys}
        todayKey={todayKey}
        onOpenDay={onOpenDay}
      />
    ),
    [workoutDayKeys, todayKey, onOpenDay],
  );

  return (
    <View style={styles.container}>
      <HistoryStreaks
        weeklyStreakLabel={translate('history.weeklyStreak', { count: weeklyStreak })}
        restDaysLabel={translate('history.restDays', { count: restDays })}
      />
      {/* Клетки дней недели стоят над колонками сетки и продолжают её линии. */}
      <View style={styles.weekdayRow}>
        {weekdayLabels.map((label, labelIndex) => (
          <View
            key={label}
            style={[
              styles.weekdayCell,
              {
                borderColor: colors.border,
                borderRightWidth: labelIndex === weekdayLabels.length - 1 ? GRID_LINE_WIDTH : 0,
              },
            ]}
          >
            <Text variant="caption" color="muted" align="center">
              {label}
            </Text>
          </View>
        ))}
      </View>
      <FlashList
        data={months}
        keyExtractor={(month) => toDayKey(month)}
        extraData={workoutDayKeys}
        renderItem={renderMonth}
        // Самый новый месяц стоит внизу, поэтому список сразу открывается на нём, а не на самом старом.
        maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 140 },
  weekdayRow: { flexDirection: 'row', paddingHorizontal: spacing.sm },
  weekdayCell: {
    flex: 1,
    paddingVertical: spacing.md,
    borderLeftWidth: GRID_LINE_WIDTH,
    borderBottomWidth: GRID_LINE_WIDTH,
  },
});
