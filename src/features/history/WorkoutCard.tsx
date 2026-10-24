import { Clock, Trophy, Weight } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { WorkoutSummary } from '@/db/repo/workouts';
import type { SetRow } from '@/db/schema';
import { formatDateTime } from '@/domain/dates';
import type { WeightUnit } from '@/domain/types';
import { formatDuration, formatWeight } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { Card, Icon, Pressable, Text, spacing, useColors } from '@/ui';

const MAX_EXERCISES_SHOWN = 5;

/** Short text for the best set: "80 × 5" for weighted sets, otherwise reps or time. */
function formatBestSet(bestSet: SetRow, weightUnit: WeightUnit): string {
  if (bestSet.weightKg != null)
    return `${formatWeight(bestSet.weightKg, weightUnit, false)} × ${bestSet.reps ?? '—'}`;
  if (bestSet.reps != null) return `${bestSet.reps}`;
  if (bestSet.durationSec != null) return formatDuration(bestSet.durationSec);
  return '';
}

export function WorkoutCard({ workout, onPress }: { workout: WorkoutSummary; onPress: () => void }) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const hiddenExerciseCount = workout.exercises.length - MAX_EXERCISES_SHOWN;

  return (
    <Pressable onPress={onPress} scaleTo={0.985}>
      <Card raised style={styles.card}>
        <Text variant="h3" numberOfLines={1}>
          {workout.name}
        </Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
          {formatDateTime(workout.startedAt, i18n.language)}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Icon icon={Clock} size={14} color="muted" />
            <Text variant="caption" tabular>
              {formatDuration(workout.durationSec, { compact: true })}
            </Text>
          </View>
          <View style={styles.stat}>
            <Icon icon={Weight} size={14} color="muted" />
            <Text variant="caption" tabular>
              {formatWeight(workout.volumeKg, weightUnit)}
            </Text>
          </View>
          {workout.prCount > 0 ? (
            <View style={[styles.stat, styles.recordBadge, { backgroundColor: colors.accent }]}>
              <Icon icon={Trophy} size={12} color="onAccent" />
              <Text variant="label" color="onAccent">
                {workout.prCount} {translate('pr.badge')}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {workout.exercises.slice(0, MAX_EXERCISES_SHOWN).map((exercise, index) => (
          <View key={`${exercise.id}-${index}`} style={styles.exerciseRow}>
            <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
              {exercise.setCount} × {exerciseName(exercise, i18n.language)}
            </Text>
            {exercise.bestSet ? (
              <Text variant="caption" color="muted" tabular>
                {formatBestSet(exercise.bestSet, weightUnit)}
              </Text>
            ) : null}
          </View>
        ))}
        {hiddenExerciseCount > 0 ? (
          <Text variant="caption" color="faint" style={{ marginTop: 4 }}>
            +{hiddenExerciseCount}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, alignItems: 'center' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recordBadge: { paddingHorizontal: spacing.sm, height: 22, borderRadius: 11 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 3 },
});
