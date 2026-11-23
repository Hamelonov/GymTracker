import { format } from 'date-fns';
import React, { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { dateLocale, toDayKey } from '@/domain/dates';
import { Text, spacing, useColors } from '@/ui';
import { buildMonthWeeks } from './calendarGrid';
import { MonthDayCell } from './MonthDayCell';

interface MonthCalendarBlockProps {
  monthStart: Date;
  namesByDay: Map<string, string[]>;
  todayKey: string;
  onOpenDay: (dayKey: string) => void;
}

/** Один месяц календаря: заголовок и недели с понедельника, между неделями тонкие линии. */
function MonthCalendarBlockComponent({
  monthStart,
  namesByDay,
  todayKey,
  onOpenDay,
}: MonthCalendarBlockProps) {
  const colors = useColors();
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
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={[styles.weekRow, { borderTopColor: colors.border }]}>
          {week.map((day, dayIndex) => {
            const dayKey = day ? toDayKey(day) : `empty-${weekIndex}-${dayIndex}`;
            return (
              <MonthDayCell
                key={dayKey}
                day={day}
                dayKey={dayKey}
                workoutNames={namesByDay.get(dayKey) ?? NO_WORKOUT_NAMES}
                isToday={dayKey === todayKey}
                onOpenDay={onOpenDay}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

export const MonthCalendarBlock = memo(MonthCalendarBlockComponent);

/** Одна и та же пустая ссылка, чтобы мемоизированные ячейки дней без тренировок не перерисовывались зря. */
const NO_WORKOUT_NAMES: string[] = [];

const styles = StyleSheet.create({
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
