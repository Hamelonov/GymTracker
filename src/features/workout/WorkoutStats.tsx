import React from 'react';
import { useTranslation } from 'react-i18next';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { formatDuration } from '@/domain/units';
import { Stat, radius, spacing, useColors } from '@/ui';
import { ElapsedTimer } from './ElapsedTimer';

export interface WorkoutStatsProps {
  /** Живой таймер от этого времени начала. Игнорируется, если задан `durationSec`. */
  startedAt?: number;
  /** Фиксированная длительность для завершённых или редактируемых тренировок. */
  durationSec?: number;
  exerciseCount: number;
  setCount: number;
  /**
   * `surface` — плитка с тремя равными колонками, `inverse` — чёрная карточка на жёлтом
   * экране итогов, `strip` — полоса под шапкой активной тренировки.
   */
  variant?: 'surface' | 'inverse' | 'strip';
  /** Правая часть полосы `strip`: переключатель режима записи. */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Полоса статистики задана по ширине: без предела системный шрифт её разорвёт.
const STRIP_MAX_FONT_SCALE = 1.2;
const STRIP_HEIGHT = 56;

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
  trailing,
  style,
}: WorkoutStatsProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const isStrip = variant === 'strip';
  const isInverse = variant === 'inverse';
  const statSize = isStrip ? 'compact' : 'regular';
  const statTone = isInverse ? 'inverse' : 'theme';
  const columnStyle = isStrip ? null : styles.equalColumn;
  const hasFixedDuration = durationSec != null || startedAt == null;
  const statsBackground = isInverse ? colors.onAccent : colors.surface;

  const stats = (
    <>
      {hasFixedDuration ? (
        <Stat
          label={translate('workout.duration')}
          value={formatDuration(durationSec ?? 0)}
          size={statSize}
          tone={statTone}
          style={columnStyle}
        />
      ) : (
        // Живой таймер обновляет только себя, поэтому экран не перерисовывается каждую секунду.
        <Stat label={translate('workout.duration')} size={statSize} tone={statTone} style={columnStyle}>
          <ElapsedTimer
            startedAt={startedAt}
            variant={isStrip ? 'statCompact' : 'stat'}
            color={isInverse ? 'inverseText' : 'text'}
            maxFontSizeMultiplier={isStrip ? STRIP_MAX_FONT_SCALE : undefined}
          />
        </Stat>
      )}
      <Stat
        label={translate('history.exercisesDone')}
        value={String(exerciseCount)}
        size={statSize}
        tone={statTone}
        style={columnStyle}
      />
      <Stat
        label={translate('workout.setsDone')}
        value={String(setCount)}
        size={statSize}
        tone={statTone}
        style={columnStyle}
      />
    </>
  );

  if (isStrip) {
    return (
      <View style={[styles.strip, { borderBottomColor: colors.border }, style]}>
        <View style={styles.stripStats}>{stats}</View>
        {trailing}
      </View>
    );
  }

  return <View style={[styles.card, { backgroundColor: statsBackground }, style]}>{stats}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  equalColumn: { flex: 1 },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: STRIP_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stripStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});
