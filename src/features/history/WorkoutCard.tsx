import { format } from 'date-fns';
import { Clock } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { WorkoutSummary } from '@/db/repo/workouts';
import { dateLocale, weekdayName } from '@/domain/dates';
import { formatDuration } from '@/domain/units';
import { Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';
import { WorkoutName } from '@/features/workout/WorkoutName';

/**
 * Карточка тренировки в истории: слева плашка с числом и месяцем, по центру
 * название, день недели и время начала, справа длительность.
 * Упражнения и подходы показываются только на странице самой тренировки.
 */
export function WorkoutCard({ workout, onPress }: { workout: WorkoutSummary; onPress: () => void }) {
  const colors = useColors();
  const { i18n } = useTranslation();
  const locale = dateLocale(i18n.language);

  const dayOfMonth = format(workout.startedAt, 'd');
  const monthShort = format(workout.startedAt, 'LLL', { locale }).replace('.', '').toUpperCase();
  // Дата уже на плашке слева, поэтому здесь день недели и время: «Суббота, 01:04».
  const weekdayAndTime = weekdayName(workout.startedAt, i18n.language) + format(workout.startedAt, ', HH:mm');

  return (
    <Pressable onPress={onPress} scaleTo={0.985}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.dateBadge, { backgroundColor: colors.accent }]}>
          <Text variant="h3" color="onAccent" tabular>
            {dayOfMonth}
          </Text>
          <Text variant="label" color="onAccent">
            {monthShort}
          </Text>
        </View>

        <View style={styles.titleAndDate}>
          <WorkoutName variant="bodyMedium" numberOfLines={1} name={workout.name} />
          <Text variant="caption" color="muted" style={styles.weekday}>
            {weekdayAndTime}
          </Text>
        </View>

        <View style={[styles.duration, { backgroundColor: colors.surfaceAlt }]}>
          <Icon icon={Clock} size={13} color="muted" />
          <Text variant="caption" tabular>
            {formatDuration(workout.durationSec, { compact: true })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleAndDate: { flex: 1 },
  weekday: { marginTop: 2 },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    height: 28,
    borderRadius: radius.pill,
  },
});
