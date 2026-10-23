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
  /** Shown as a fourth cell only when greater than zero. */
  prCount?: number;
  /** `inverse` is the black card used on the yellow summary screen. */
  variant?: 'surface' | 'inverse';
  style?: StyleProp<ViewStyle>;
}

/**
 * The one "workout at a glance" block: Time · Exercises · Sets (· PRs).
 * Used on the active workout screen, the finish sheet, the summary screen and
 * the workout detail page, so a change here applies everywhere.
 *
 * Three cells sit in one row; four cells wrap into a 2 × 2 grid so long labels
 * and big numbers always fit.
 */
export function WorkoutStats({ startedAt, durationSec, exerciseCount, setCount, prCount = 0, variant = 'surface', style }: WorkoutStatsProps) {
  const c = useColors();
  const { t } = useTranslation();
  const inverse = variant === 'inverse';
  const labelColor = inverse ? c.textFaint : c.textMuted;
  const valueColor = inverse ? c.white : c.text;
  const valueVariant = inverse ? 'h2' : 'h3';
  const grid = prCount > 0;
  const cellStyle = grid ? styles.cellHalf : styles.cellThird;

  const time =
    durationSec != null || startedAt == null ? (
      <Text variant={valueVariant} color={valueColor} tabular numberOfLines={1}>
        {formatDuration(durationSec ?? 0)}
      </Text>
    ) : (
      <ElapsedTimer startedAt={startedAt} variant={valueVariant} color={valueColor} numberOfLines={1} />
    );

  return (
    <View style={[styles.card, { backgroundColor: inverse ? c.black : c.surface }, style]}>
      <Cell label={t('workout.duration')} labelColor={labelColor} style={cellStyle}>
        {time}
      </Cell>
      <Cell label={t('history.exercisesDone')} labelColor={labelColor} style={cellStyle}>
        <Value value={exerciseCount} color={valueColor} variant={valueVariant} />
      </Cell>
      <Cell label={t('workout.setsDone')} labelColor={labelColor} style={cellStyle}>
        <Value value={setCount} color={valueColor} variant={valueVariant} />
      </Cell>
      {grid ? (
        <Cell label={t('workout.prs')} labelColor={labelColor} style={cellStyle}>
          <Value value={prCount} color={inverse ? c.accent : c.text} variant={valueVariant} />
        </Cell>
      ) : null}
    </View>
  );
}

function Cell({ label, labelColor, style, children }: { label: string; labelColor: string; style: ViewStyle; children: React.ReactNode }) {
  return (
    <View style={[styles.cell, style]}>
      <Text variant="label" color={labelColor} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Value({ value, color, variant }: { value: number; color: string; variant: 'h2' | 'h3' }) {
  return (
    <Text variant={variant} color={color} tabular numberOfLines={1}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg, borderRadius: radius.lg, padding: spacing.lg },
  cell: { gap: 4, paddingRight: spacing.sm },
  cellThird: { width: '33.333%' },
  cellHalf: { width: '50%' },
});
