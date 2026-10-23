import React from 'react';
import { useTranslation } from 'react-i18next';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { formatDuration } from '@/domain/units';
import { Text, radius, spacing, useColors } from '@/ui';
import { ElapsedTimer } from './ElapsedTimer';

export interface WorkoutStatsProps {
  /** Live timer from this start time. Ignored when `durationSec` is given. */
  startedAt?: number;
  /** Fixed duration for finished or edited workouts. */
  durationSec?: number;
  exerciseCount: number;
  setCount: number;
  /** Shown as a fourth column only when greater than zero. */
  prCount?: number;
  /** `inverse` is the black card used on the yellow summary screen. */
  variant?: 'surface' | 'inverse';
  style?: StyleProp<ViewStyle>;
}

/**
 * The one "workout at a glance" block: Time · Exercises · Sets (· PRs).
 * Used on the active workout screen, the finish sheet, the summary screen and
 * the workout detail page, so a change here applies everywhere.
 */
export function WorkoutStats({ startedAt, durationSec, exerciseCount, setCount, prCount = 0, variant = 'surface', style }: WorkoutStatsProps) {
  const c = useColors();
  const { t } = useTranslation();
  const inverse = variant === 'inverse';
  const labelColor = inverse ? c.textFaint : c.textMuted;
  const valueColor = inverse ? c.white : c.text;
  const valueVariant = inverse ? 'h2' : 'h3';

  return (
    <View style={[styles.card, { backgroundColor: inverse ? c.black : c.surface }, style]}>
      <View style={styles.stat}>
        <Text variant="label" color={labelColor}>
          {t('workout.duration').toUpperCase()}
        </Text>
        {durationSec != null || startedAt == null ? (
          <Text variant={valueVariant} color={valueColor} tabular>
            {formatDuration(durationSec ?? 0)}
          </Text>
        ) : (
          <ElapsedTimer startedAt={startedAt} variant={valueVariant} color={valueColor} />
        )}
      </View>
      <Stat label={t('history.exercisesDone')} value={String(exerciseCount)} labelColor={labelColor} valueColor={valueColor} variant={valueVariant} />
      <Stat label={t('workout.setsDone')} value={String(setCount)} labelColor={labelColor} valueColor={valueColor} variant={valueVariant} />
      {prCount > 0 ? <Stat label={t('workout.prs')} value={String(prCount)} labelColor={labelColor} valueColor={inverse ? c.accent : c.text} variant={valueVariant} /> : null}
    </View>
  );
}

function Stat({ label, value, labelColor, valueColor, variant }: { label: string; value: string; labelColor: string; valueColor: string; variant: 'h2' | 'h3' }) {
  return (
    <View style={styles.stat}>
      <Text variant="label" color={labelColor}>
        {label.toUpperCase()}
      </Text>
      <Text variant={variant} color={valueColor} tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: radius.lg, padding: spacing.lg },
  stat: { flex: 1, gap: 4 },
});
