import { addDays, format } from 'date-fns';
import { Dumbbell } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { countWorkoutsByDay } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { dateLocale, toDayKey, getWeekStart } from '@/domain/dates';
import { Card, Icon, Text, spacing, useColors } from '@/ui';

/** Карточка на главном экране с семью днями текущей недели и числом тренировок за неделю. */
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
    <Card style={styles.card}>
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
          const workoutCount = workoutCountByDay.get(key) ?? 0;
          const isToday = key === toDayKey(now);
          return (
            <View key={key} style={styles.dayColumn}>
              <Text variant="label" color={isToday ? 'text' : 'faint'}>
                {format(day, 'EEEEEE', { locale: dateLocale(i18n.language) }).toUpperCase()}
              </Text>
              <View
                style={[
                  styles.dayCircle,
                  {
                    backgroundColor: workoutCount > 0 ? colors.accent : colors.surfaceAlt,
                    borderColor: isToday ? colors.text : 'transparent',
                  },
                ]}
              >
                {workoutCount > 0 ? (
                  <Icon icon={Dumbbell} size={14} color={colors.black} strokeWidth={2.5} />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: 4,
  },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayColumn: { alignItems: 'center', gap: 6 },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
