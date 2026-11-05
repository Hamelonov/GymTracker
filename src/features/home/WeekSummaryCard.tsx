import { addDays, format } from 'date-fns';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { countWorkoutsByDay } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { dateLocale, toDayKey, getWeekStart } from '@/domain/dates';
import { Text, fonts, radius, spacing, useColors } from '@/ui';

/** Неделя на главном экране: семь дней, день с тренировкой закрашен маркером, как в календаре истории. */
export function WeekSummaryCard({ now }: { now: number }) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const currentWeekStart = getWeekStart(now);
  const workoutCountByDay = useQuery(
    () => countWorkoutsByDay(currentWeekStart.getTime(), addDays(currentWeekStart, 7).getTime()),
    [currentWeekStart.getTime()],
  );
  const weekWorkoutCount = [...workoutCountByDay.values()].reduce((sum, count) => sum + count, 0);

  return (
    <View>
      <View style={styles.header}>
        <Text variant="label" color="muted">
          {translate('home.weekSummary').toUpperCase()}
        </Text>
        <Text variant="caption" color="muted">
          {translate('home.workoutsThisWeek', { count: weekWorkoutCount })}
        </Text>
      </View>
      <View style={styles.daysRow}>
        {Array.from({ length: 7 }, (_, dayIndex) => {
          const day = addDays(currentWeekStart, dayIndex);
          const key = toDayKey(day);
          const hasWorkout = (workoutCountByDay.get(key) ?? 0) > 0;
          const isToday = key === toDayKey(now);
          return (
            <View key={key} style={styles.dayColumn}>
              <Text variant="label" color={isToday ? 'text' : 'faint'}>
                {format(day, 'EEEEEE', { locale: dateLocale(i18n.language) }).toUpperCase()}
              </Text>
              <View
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: hasWorkout ? colors.accent : 'transparent',
                    borderColor: isToday ? colors.text : 'transparent',
                  },
                ]}
              >
                <Text
                  variant="caption"
                  tabular
                  color={hasWorkout ? 'onAccent' : 'muted'}
                  style={hasWorkout ? styles.workoutDayNumber : null}
                >
                  {day.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  daysRow: { flexDirection: 'row' },
  dayColumn: { flex: 1, alignItems: 'center', gap: spacing.xs },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  workoutDayNumber: { fontFamily: fonts.semibold },
});
