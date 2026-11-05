import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { MeasurementType } from '@/domain/types';
import { Stat, Text, spacing } from '@/ui';
import type { ThemeColorName } from '@/ui/themeColor';
import { formatMeasurement, type MeasurementUnits } from './measurementUnits';

interface MeasurementSummaryTilesProps {
  type: MeasurementType;
  latestValue: number | null;
  /** Последнее значение минус первое или null, если записей меньше двух. */
  change: number | null;
  units: MeasurementUnits;
}

function getChangeColor(change: number | null): ThemeColorName {
  if (change == null) return 'faint';
  if (change > 0) return 'success';
  if (change < 0) return 'danger';
  return 'text';
}

function formatChange(type: MeasurementType, change: number | null, units: MeasurementUnits): string {
  if (change == null) return '—';
  const sign = change > 0 ? '+' : '';
  return `${sign}${formatMeasurement(type, change, units)}`;
}

/** Два числа вверху экрана замера: последнее значение и изменение с первой записи. */
export function MeasurementSummaryTiles({ type, latestValue, change, units }: MeasurementSummaryTilesProps) {
  const { t: translate } = useTranslation();
  return (
    <View style={styles.stats}>
      <Stat
        style={styles.stat}
        label={translate('measurements.latest')}
        value={latestValue != null ? formatMeasurement(type, latestValue, units) : '—'}
      />
      <Stat style={styles.stat} label={translate('measurements.change')}>
        <Text variant="stat" tabular color={getChangeColor(change)}>
          {formatChange(type, change, units)}
        </Text>
      </Stat>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
  stat: { flex: 1 },
});
