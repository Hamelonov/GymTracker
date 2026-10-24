import { addDays, getDay, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { toDayKey, formatMonthYear } from '@/domain/dates';
import { IconButton, Pressable, Text, radius, spacing, useColors } from '@/ui';

interface HistoryCalendarProps {
  month: Date;
  monthEnd: Date;
  now: number;
  /** Number of workouts per day key, for the days of the shown month. */
  workoutCountByDay: Map<string, number>;
  monthWorkoutCount: number;
  selectedDay: string | null;
  hasNoWorkoutsOnSelectedDay: boolean;
  onShowPreviousMonth: () => void;
  onShowNextMonth: () => void;
  onSelectDay: (dayKey: string | null) => void;
}

/** Month grid for the History tab: days with workouts are highlighted, tapping a day filters the list. */
export function HistoryCalendar({
  month,
  monthEnd,
  now,
  workoutCountByDay,
  monthWorkoutCount,
  selectedDay,
  hasNoWorkoutsOnSelectedDay,
  onShowPreviousMonth,
  onShowNextMonth,
  onSelectDay,
}: HistoryCalendarProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();

  const calendarCells = useMemo(() => buildCalendarCells(month, monthEnd), [month, monthEnd]);

  const getDayBackgroundColor = (workoutCount: number, isSelected: boolean) => {
    if (workoutCount > 0) return colors.accent;
    if (isSelected) return colors.surfaceAlt;
    return 'transparent';
  };

  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <View style={styles.monthRow}>
        <IconButton icon={ChevronLeft} variant="filled" onPress={onShowPreviousMonth} haptic="selection" />
        <View style={{ alignItems: 'center' }}>
          <Text variant="h3">{formatMonthYear(month.getTime(), i18n.language)}</Text>
          <Text variant="caption" color="muted">
            {translate('history.workoutsInMonth', { count: monthWorkoutCount })}
          </Text>
        </View>
        <IconButton icon={ChevronRight} variant="filled" onPress={onShowNextMonth} haptic="selection" />
      </View>
      <View style={styles.dayGrid}>
        {calendarCells.map((day, index) => {
          if (!day) return <View key={`e${index}`} style={styles.dayCell} />;
          const key = toDayKey(day);
          const workoutCount = workoutCountByDay.get(key) ?? 0;
          const isToday = key === toDayKey(now);
          const isSelected = key === selectedDay;
          return (
            <Pressable
              key={key}
              style={styles.dayCell}
              onPress={() => onSelectDay(isSelected ? null : key)}
              haptic="selection"
              scaleTo={0.9}
            >
              <View
                style={[
                  styles.dayCellContent,
                  {
                    backgroundColor: getDayBackgroundColor(workoutCount, isSelected),
                    borderColor: isToday || isSelected ? colors.text : 'transparent',
                  },
                ]}
              >
                <Text variant="caption" color={workoutCount > 0 ? colors.black : colors.text} tabular>
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {hasNoWorkoutsOnSelectedDay ? (
        <Text color="faint" align="center" style={{ marginVertical: spacing.lg }}>
          {translate('history.noWorkoutsOnDay')}
        </Text>
      ) : null}
      <View style={{ height: spacing.lg }} />
    </View>
  );
}

/** Days of the month laid out in full weeks; `null` cells pad the first and last week. */
function buildCalendarCells(month: Date, monthEnd: Date): (Date | null)[] {
  const firstDayOfMonth = startOfMonth(month);
  // getDay() starts weeks on Sunday; shift so the grid starts on Monday.
  const emptyCellsBeforeFirstDay = (getDay(firstDayOfMonth) + 6) % 7;
  const cells: (Date | null)[] = Array.from({ length: emptyCellsBeforeFirstDay }, () => null);
  for (let day = firstDayOfMonth; day <= monthEnd; day = addDays(day, 1)) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  dayCellContent: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
