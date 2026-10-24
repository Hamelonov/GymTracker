import { Clock } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { WorkoutSummary } from '@/db/repo/workouts';
import { formatDateTime } from '@/domain/dates';
import { formatDuration } from '@/domain/units';
import { Card, Icon, Pressable, Text, spacing } from '@/ui';

/**
 * Компактная карточка тренировки в истории: слева название и дата, справа длительность.
 * Упражнения и подходы показываются только на странице самой тренировки.
 */
export function WorkoutCard({ workout, onPress }: { workout: WorkoutSummary; onPress: () => void }) {
  const { i18n } = useTranslation();

  return (
    <Pressable onPress={onPress} scaleTo={0.985}>
      <Card raised style={styles.card}>
        <View style={styles.titleAndDate}>
          <Text variant="h3" numberOfLines={1}>
            {workout.name}
          </Text>
          <Text variant="caption" color="muted" style={styles.date}>
            {formatDateTime(workout.startedAt, i18n.language)}
          </Text>
        </View>
        <View style={styles.duration}>
          <Icon icon={Clock} size={14} color="muted" />
          <Text variant="caption" tabular>
            {formatDuration(workout.durationSec, { compact: true })}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleAndDate: { flex: 1 },
  date: { marginTop: 2 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
