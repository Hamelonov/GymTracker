import React from 'react';
import { useTranslation } from 'react-i18next';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { formatDuration } from '@/domain/units';
import { Pencil } from 'lucide-react-native';
import { Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';
import { ElapsedTimer } from './ElapsedTimer';

export interface WorkoutStatsProps {
  /** Живой таймер от этого времени начала. Игнорируется, если задан `durationSec`. */
  startedAt?: number;
  /** Фиксированная длительность для завершённых или редактируемых тренировок. */
  durationSec?: number;
  exerciseCount: number;
  setCount: number;
  /**
   * `inverse` — чёрная карточка, используемая на жёлтом экране итогов;
   * `plain` — без фона, прямо на странице, только тонкая линия снизу (экран активной тренировки).
   */
  variant?: 'surface' | 'inverse' | 'plain';
  style?: StyleProp<ViewStyle>;
  /** Если задано, длительность нажимается и показывает карандаш: так задаётся длительность записи задним числом. */
  onDurationPress?: () => void;
}

/**
 * Единый блок «тренировка с первого взгляда»: Время · Упражнения · Подходы.
 * Используется на экране активной тренировки, в листе завершения, на экране итогов и
 * на странице тренировки, поэтому изменение здесь действует везде.
 * Счётчика рекордов нет: в большинстве тренировок он показывал бы ноль; новые рекорды
 * перечислены отдельным блоком на экране итогов.
 */
export function WorkoutStats({
  startedAt,
  durationSec,
  exerciseCount,
  setCount,
  variant = 'surface',
  style,
  onDurationPress,
}: WorkoutStatsProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const isInverse = variant === 'inverse';
  const labelColor = isInverse ? colors.textFaint : colors.textMuted;
  const valueColor = isInverse ? colors.white : colors.text;
  const valueVariant = isInverse ? 'h2' : 'h3';
  const hasFixedDuration = durationSec != null || startedAt == null;

  const durationValue = hasFixedDuration ? (
    <Text variant={valueVariant} color={valueColor} tabular numberOfLines={1}>
      {formatDuration(durationSec ?? 0)}
    </Text>
  ) : (
    <ElapsedTimer startedAt={startedAt} variant={valueVariant} color={valueColor} numberOfLines={1} />
  );

  return (
    <View style={[styles.card, getVariantStyle(variant, colors), style]}>
      <StatCell label={translate('workout.duration')} labelColor={labelColor} onPress={onDurationPress}>
        {durationValue}
      </StatCell>
      <StatCell label={translate('history.exercisesDone')} labelColor={labelColor}>
        <StatValue value={exerciseCount} color={valueColor} variant={valueVariant} />
      </StatCell>
      <StatCell label={translate('workout.setsDone')} labelColor={labelColor}>
        <StatValue value={setCount} color={valueColor} variant={valueVariant} />
      </StatCell>
    </View>
  );
}

/** Фон блока по варианту; у `plain` фона нет, а линия снизу отделяет статистику от упражнений. */
function getVariantStyle(
  variant: WorkoutStatsProps['variant'],
  colors: ReturnType<typeof useColors>,
): StyleProp<ViewStyle> {
  if (variant === 'inverse') return { backgroundColor: colors.black };
  if (variant === 'plain') return [styles.plainCard, { borderBottomColor: colors.border }];
  return { backgroundColor: colors.surface };
}

function StatCell({
  label,
  labelColor,
  children,
  onPress,
}: {
  label: string;
  labelColor: string;
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const labelRow = (
    <View style={styles.labelRow}>
      <Text variant="label" color={labelColor} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      {onPress ? <Icon icon={Pencil} size={12} color={labelColor} /> : null}
    </View>
  );
  if (!onPress) {
    return (
      <View style={styles.cell}>
        {labelRow}
        {children}
      </View>
    );
  }
  return (
    <Pressable style={styles.cell} onPress={onPress} haptic="selection" hitSlop={8}>
      {labelRow}
      {children}
    </Pressable>
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
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  plainCard: {
    borderRadius: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: { width: '33.333%', gap: 4, paddingRight: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
