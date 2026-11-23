import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable, Text, useColors } from '@/ui';
import { GRID_LINE_WIDTH } from './gridLine';

const CIRCLE_SIZE = 40;
const CELL_HEIGHT = 54;

interface MonthDayCellProps {
  day: Date | null;
  dayKey: string;
  hasWorkout: boolean;
  isToday: boolean;
  /** Справа от дня нет соседней ячейки, поэтому правую линию рисует сам день. */
  hasRightLine: boolean;
  /** Под днём нет соседней ячейки, поэтому нижнюю линию рисует сам день. */
  hasBottomLine: boolean;
  onOpenDay: (dayKey: string) => void;
}

/**
 * День календаря в клетке с тонкими линиями решётки. Верхняя и левая линии есть у каждого дня,
 * правая и нижняя — только на краю месяца: так линии между соседними днями не удваиваются.
 */
function MonthDayCellComponent({
  day,
  dayKey,
  hasWorkout,
  isToday,
  hasRightLine,
  hasBottomLine,
  onOpenDay,
}: MonthDayCellProps) {
  const colors = useColors();
  if (!day) return <View style={styles.cell} />;

  const lineStyle = {
    borderColor: colors.border,
    borderTopWidth: GRID_LINE_WIDTH,
    borderLeftWidth: GRID_LINE_WIDTH,
    borderRightWidth: hasRightLine ? GRID_LINE_WIDTH : 0,
    borderBottomWidth: hasBottomLine ? GRID_LINE_WIDTH : 0,
  };
  return (
    <Pressable
      style={[styles.cell, lineStyle]}
      onPress={() => onOpenDay(dayKey)}
      disabled={!hasWorkout}
      haptic="selection"
      scaleTo={0.96}
    >
      <View
        style={[
          styles.circle,
          {
            backgroundColor: hasWorkout ? colors.accent : 'transparent',
            borderColor: isToday ? colors.text : 'transparent',
          },
        ]}
      >
        <Text variant="bodyMedium" color={hasWorkout ? colors.black : colors.text} tabular>
          {day.getDate()}
        </Text>
      </View>
    </Pressable>
  );
}

export const MonthDayCell = memo(MonthDayCellComponent);

const styles = StyleSheet.create({
  cell: { flex: 1, height: CELL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
