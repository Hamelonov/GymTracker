import { FlashList } from '@shopify/flash-list';
import { addDays, format } from 'date-fns';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { WorkoutSummary } from '@/db/repo/workouts';
import { dateLocale, toDayKey } from '@/domain/dates';
import { calculateWeekStreak } from '@/features/stats/weekStreak';
import { Text, spacing } from '@/ui';
import { buildNamesByDay, countRestDays, listMonthsNewestFirst } from './calendarGrid';
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
 * Календарь по месяцам, как в Hevy: сверху серии, потом дни недели, ниже месяцы от нового к старому.
 * Серии и дни недели лежат в самой прокрутке и уезжают вместе с ней, чтобы не занимать место.
 */
export function MonthCalendarView({ workouts, now, onOpenDay }: MonthCalendarViewProps) {
  const { t: translate, i18n } = useTranslation();
  const todayKey = toDayKey(now);

  const namesByDay = useMemo(() => buildNamesByDay(workouts), [workouts]);
  const startTimes = useMemo(() => workouts.map((workout) => workout.startedAt), [workouts]);
  const latestWorkoutAt = startTimes.length > 0 ? Math.max(...startTimes) : null;
  const earliestWorkoutAt = startTimes.length > 0 ? Math.min(...startTimes) : null;
  const months = useMemo(
    () => listMonthsNewestFirst(now, earliestWorkoutAt, latestWorkoutAt),
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
        namesByDay={namesByDay}
        todayKey={todayKey}
        onOpenDay={onOpenDay}
      />
    ),
    [namesByDay, todayKey, onOpenDay],
  );

  const listHeader = (
    <View>
      <HistoryStreaks
        weeklyStreakLabel={translate('history.weeklyStreak', { count: weeklyStreak })}
        restDaysLabel={translate('history.restDays', { count: restDays })}
      />
      <View style={styles.weekdayRow}>
        {weekdayLabels.map((label) => (
          <Text key={label} variant="caption" color="muted" align="center" style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );

  return (
    <FlashList
      data={months}
      keyExtractor={(month) => toDayKey(month)}
      extraData={namesByDay}
      ListHeaderComponent={listHeader}
      renderItem={renderMonth}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 140 },
  weekdayRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  weekdayLabel: { flex: 1 },
});
