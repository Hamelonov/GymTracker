import { Clock, Trophy, Weight } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { WorkoutSummary } from '@/db/repo/workouts';
import { formatDateTime } from '@/domain/dates';
import { formatDuration, formatWeight } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { Card, Icon, Pressable, Text, spacing, useColors } from '@/ui';

export function WorkoutCard({ workout, onPress }: { workout: WorkoutSummary; onPress: () => void }) {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const unit = useSettings((s) => s.weightUnit);
  return (
    <Pressable onPress={onPress} scaleTo={0.985}>
      <Card raised style={styles.card}>
        <Text variant="h3" numberOfLines={1}>
          {workout.name}
        </Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
          {formatDateTime(workout.startedAt, i18n.language)}
        </Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Icon icon={Clock} size={14} color="muted" />
            <Text variant="caption" tabular>
              {formatDuration(workout.durationSec, { compact: true })}
            </Text>
          </View>
          <View style={styles.stat}>
            <Icon icon={Weight} size={14} color="muted" />
            <Text variant="caption" tabular>
              {formatWeight(workout.volumeKg, unit)}
            </Text>
          </View>
          {workout.prCount > 0 ? (
            <View style={[styles.stat, styles.pr, { backgroundColor: c.accent }]}>
              <Icon icon={Trophy} size={12} color="onAccent" />
              <Text variant="label" color="onAccent">
                {workout.prCount} {t('pr.badge')}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        {workout.exerciseNames.slice(0, 5).map((e, i) => (
          <View key={`${e.id}-${i}`} style={styles.exRow}>
            <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
              {e.setCount} × {exerciseName(e, i18n.language)}
            </Text>
            {e.bestSet ? (
              <Text variant="caption" color="muted" tabular>
                {e.bestSet.weightKg != null ? `${formatWeight(e.bestSet.weightKg, unit, false)} × ${e.bestSet.reps ?? '—'}` : e.bestSet.reps != null ? `${e.bestSet.reps}` : e.bestSet.durationSec != null ? formatDuration(e.bestSet.durationSec) : ''}
              </Text>
            ) : null}
          </View>
        ))}
        {workout.exerciseNames.length > 5 ? (
          <Text variant="caption" color="faint" style={{ marginTop: 4 }}>
            +{workout.exerciseNames.length - 5}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, alignItems: 'center' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pr: { paddingHorizontal: spacing.sm, height: 22, borderRadius: 11 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 3 },
});
