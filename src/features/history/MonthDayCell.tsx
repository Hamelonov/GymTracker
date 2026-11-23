import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable, Text, useColors } from '@/ui';

const CIRCLE_SIZE = 40;

interface MonthDayCellProps {
  day: Date | null;
  dayKey: string;
  /** Названия тренировок этого дня; пусто — день без тренировок. */
  workoutNames: string[];
  isToday: boolean;
  onOpenDay: (dayKey: string) => void;
}

/** День месяца: число в кружке (залитом, если была тренировка) и название тренировки под ним. */
function MonthDayCellComponent({ day, dayKey, workoutNames, isToday, onOpenDay }: MonthDayCellProps) {
  const colors = useColors();
  if (!day) return <View style={styles.cell} />;

  const hasWorkout = workoutNames.length > 0;
  return (
    <Pressable
      style={styles.cell}
      onPress={() => onOpenDay(dayKey)}
      disabled={!hasWorkout}
      haptic="selection"
      scaleTo={0.92}
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
      {hasWorkout ? (
        <Text variant="label" color="muted" numberOfLines={1} style={styles.workoutName}>
          {workoutNames[0]}
        </Text>
      ) : null}
    </Pressable>
  );
}

export const MonthDayCell = memo(MonthDayCellComponent);

const styles = StyleSheet.create({
  cell: { flex: 1, height: 68, alignItems: 'center', paddingTop: 6, paddingHorizontal: 2 },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutName: { marginTop: 2, maxWidth: '100%' },
});
