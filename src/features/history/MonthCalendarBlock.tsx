import { format } from 'date-fns';
import React, { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { dateLocale, toDayKey } from '@/domain/dates';
import { Text, spacing } from '@/ui';
import { buildMonthWeeks } from './calendarGrid';
import { MonthDayCell } from './MonthDayCell';

interface MonthCalendarBlockProps {
  monthStart: Date;
  workoutDayKeys: Set<string>;
  todayKey: string;
  onOpenDay: (dayKey: string) => void;
}

/** Один месяц календаря: заголовок и решётка дней по неделям, начиная с понедельника. */
function MonthCalendarBlockComponent({
  monthStart,
  workoutDayKeys,
  todayKey,
  onOpenDay,
}: MonthCalendarBlockProps) {
  const { t: translate, i18n } = useTranslation();
  const weeks = useMemo(() => buildMonthWeeks(monthStart), [monthStart]);

  const monthName = format(monthStart, 'LLLL', { locale: dateLocale(i18n.language) });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const title = translate('history.monthTitle', {
    month: capitalizedMonthName,
    year: monthStart.getFullYear(),
  });

  return (
    <View>
      <Text variant="h2" style={styles.title}>
        {title}
      </Text>
      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              const dayKey = day ? toDayKey(day) : `empty-${weekIndex}-${dayIndex}`;
              const hasDayToTheRight = Boolean(week[dayIndex + 1]);
              const hasDayBelow = Boolean(weeks[weekIndex + 1]?.[dayIndex]);
              return (
                <MonthDayCell
                  key={dayKey}
                  day={day}
                  dayKey={dayKey}
                  hasWorkout={workoutDayKeys.has(dayKey)}
                  isToday={dayKey === todayKey}
                  hasRightLine={!hasDayToTheRight}
                  hasBottomLine={!hasDayBelow}
                  onOpenDay={onOpenDay}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export const MonthCalendarBlock = memo(MonthCalendarBlockComponent);

const styles = StyleSheet.create({
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  grid: { paddingHorizontal: spacing.sm },
  weekRow: { flexDirection: 'row' },
});
