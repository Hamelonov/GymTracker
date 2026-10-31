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
  /** Количество тренировок по ключу дня для дней показанного месяца. */
  workoutCountByDay: Map<string, number>;
  monthWorkoutCount: number;
  onShowPreviousMonth: () => void;
  onShowNextMonth: () => void;
  /** Вызывается только для дней, в которые были тренировки. */
  onOpenDay: (dayKey: string) => void;
}

/** Сетка месяца для вкладки «История»: дни с тренировками выделены, нажатие открывает этот день. */
export function HistoryCalendar({
  month,
  monthEnd,
  now,
  workoutCountByDay,
  monthWorkoutCount,
  onShowPreviousMonth,
  onShowNextMonth,
  onOpenDay,
}: HistoryCalendarProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();

  const calendarCells = useMemo(() => buildCalendarCells(month, monthEnd), [month, monthEnd]);

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
          const hasWorkouts = workoutCount > 0;
          return (
            <Pressable
              key={key}
              style={styles.dayCell}
              onPress={() => onOpenDay(key)}
              disabled={!hasWorkouts}
              haptic="selection"
              scaleTo={0.9}
            >
              <View
                style={[
                  styles.dayCellContent,
                  {
                    backgroundColor: hasWorkouts ? colors.accent : 'transparent',
                    borderColor: isToday ? colors.text : 'transparent',
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
      <View style={{ height: spacing.lg }} />
    </View>
  );
}

/** Дни месяца, разложенные по полным неделям; ячейки `null` дополняют первую и последнюю неделю. */
function buildCalendarCells(month: Date, monthEnd: Date): (Date | null)[] {
  const firstDayOfMonth = startOfMonth(month);
  // getDay() начинает неделю с воскресенья; сдвигаем, чтобы сетка начиналась с понедельника.
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
