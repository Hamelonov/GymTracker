import { format } from 'date-fns';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { WorkoutSummary } from '@/db/repo/workouts';
import { dateLocale, weekdayName } from '@/domain/dates';
import { formatDuration } from '@/domain/units';
import { WorkoutName } from '@/features/workout/WorkoutName';
import { FastPressable, Text, spacing, useColors } from '@/ui';

interface WorkoutRowProps {
  workout: WorkoutSummary;
  onPress: (workoutId: string) => void;
}

const DATE_COLUMN_WIDTH = 44;
const HISTORY_ROW_MIN_HEIGHT = 68;

/**
 * Строка тренировки в истории: слева число и месяц, по центру название, день недели
 * и время начала, справа длительность. Упражнения показываются только на странице тренировки.
 */
function WorkoutRowComponent({ workout, onPress }: WorkoutRowProps) {
  const colors = useColors();
  const { i18n } = useTranslation();
  const locale = dateLocale(i18n.language);

  const dayOfMonth = format(workout.startedAt, 'd');
  const monthShort = format(workout.startedAt, 'LLL', { locale }).replace('.', '').toUpperCase();
  const weekdayAndTime = weekdayName(workout.startedAt, i18n.language) + format(workout.startedAt, ', HH:mm');

  return (
    <FastPressable
      onPress={() => onPress(workout.id)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        pressed ? { backgroundColor: colors.pressed } : null,
      ]}
    >
      <View style={styles.dateColumn}>
        <Text variant="stat" tabular>
          {dayOfMonth}
        </Text>
        <Text variant="label" color="muted">
          {monthShort}
        </Text>
      </View>
      <View style={styles.titleColumn}>
        <WorkoutName variant="bodyMedium" numberOfLines={1} name={workout.name} />
        <Text variant="caption" color="muted">
          {weekdayAndTime}
        </Text>
      </View>
      <Text variant="bodyMedium" color="muted" tabular>
        {formatDuration(workout.durationSec, { compact: true })}
      </Text>
    </FastPressable>
  );
}

export const WorkoutRow = memo(WorkoutRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: HISTORY_ROW_MIN_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateColumn: { width: DATE_COLUMN_WIDTH, alignItems: 'center' },
  titleColumn: { flex: 1 },
});
