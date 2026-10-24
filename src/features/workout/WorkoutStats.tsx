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
export function WorkoutStats({
  startedAt,
  durationSec,
  exerciseCount,
  setCount,
  prCount = 0,
  variant = 'surface',
  style,
}: WorkoutStatsProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const isInverse = variant === 'inverse';
  const labelColor = isInverse ? colors.textFaint : colors.textMuted;
  const valueColor = isInverse ? colors.white : colors.text;
  const valueVariant = isInverse ? 'h2' : 'h3';
  const showsRecordCell = prCount > 0;
  const cellWidthStyle = showsRecordCell ? styles.cellHalf : styles.cellThird;
  const hasFixedDuration = durationSec != null || startedAt == null;

  const durationValue = hasFixedDuration ? (
    <Text variant={valueVariant} color={valueColor} tabular numberOfLines={1}>
      {formatDuration(durationSec ?? 0)}
    </Text>
  ) : (
    <ElapsedTimer startedAt={startedAt} variant={valueVariant} color={valueColor} numberOfLines={1} />
  );

  return (
    <View style={[styles.card, { backgroundColor: isInverse ? colors.black : colors.surface }, style]}>
      <StatCell label={translate('workout.duration')} labelColor={labelColor} style={cellWidthStyle}>
        {durationValue}
      </StatCell>
      <StatCell label={translate('history.exercisesDone')} labelColor={labelColor} style={cellWidthStyle}>
        <StatValue value={exerciseCount} color={valueColor} variant={valueVariant} />
      </StatCell>
      <StatCell label={translate('workout.setsDone')} labelColor={labelColor} style={cellWidthStyle}>
        <StatValue value={setCount} color={valueColor} variant={valueVariant} />
      </StatCell>
      {showsRecordCell ? (
        <StatCell label={translate('workout.prs')} labelColor={labelColor} style={cellWidthStyle}>
          <StatValue value={prCount} color={isInverse ? colors.accent : colors.text} variant={valueVariant} />
        </StatCell>
      ) : null}
    </View>
  );
}

function StatCell({
  label,
  labelColor,
  style,
  children,
}: {
  label: string;
  labelColor: string;
  style: ViewStyle;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.cell, style]}>
      <Text variant="label" color={labelColor} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function StatValue({ value, color, variant }: { value: number; color: string; variant: 'h2' | 'h3' }) {
  return (
    <Text variant={variant} color={color} tabular numberOfLines={1}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cell: { gap: 4, paddingRight: spacing.sm },
  cellThird: { width: '33.333%' },
  cellHalf: { width: '50%' },
});
