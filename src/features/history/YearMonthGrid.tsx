import { format } from 'date-fns';
import React, { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { dateLocale, toDayKey } from '@/domain/dates';
import { Text, useColors } from '@/ui';
import { buildMonthWeeks } from './calendarGrid';

const SQUARE_GAP = 3;
const SQUARES_IN_WEEK = 7;

interface YearMonthGridProps {
  monthStart: Date;
  /** Ключи дней, в которые были тренировки. */
  workoutDayKeys: Set<string>;
  todayKey: string;
  width: number;
}

/** Месяц в виде маленьких квадратов: серый — день без тренировки, цветной — с тренировкой. */
function YearMonthGridComponent({ monthStart, workoutDayKeys, todayKey, width }: YearMonthGridProps) {
  const colors = useColors();
  const { i18n } = useTranslation();
  const weeks = useMemo(() => buildMonthWeeks(monthStart), [monthStart]);
  const squareSize = (width - SQUARE_GAP * (SQUARES_IN_WEEK - 1)) / SQUARES_IN_WEEK;
  const monthLabel = format(monthStart, 'LLL', { locale: dateLocale(i18n.language) });

  return (
    <View style={{ width }}>
      <Text variant="bodyMedium" style={styles.monthLabel}>
        {monthLabel}
      </Text>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day, dayIndex) => {
            const squareStyle = { width: squareSize, height: squareSize };
            if (!day) return <View key={dayIndex} style={squareStyle} />;
            const dayKey = toDayKey(day);
            const hasWorkout = workoutDayKeys.has(dayKey);
            return (
              <View
                key={dayIndex}
                style={[
                  squareStyle,
                  styles.square,
                  {
                    backgroundColor: hasWorkout ? colors.accent : colors.surfaceAlt,
                    borderColor: dayKey === todayKey ? colors.text : 'transparent',
                  },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

export const YearMonthGrid = memo(YearMonthGridComponent);

const styles = StyleSheet.create({
  monthLabel: { marginBottom: 6 },
  weekRow: { flexDirection: 'row', gap: SQUARE_GAP, marginBottom: SQUARE_GAP },
  square: { borderRadius: 3, borderWidth: 1.5 },
});
