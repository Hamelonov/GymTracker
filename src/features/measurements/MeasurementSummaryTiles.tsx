import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { MeasurementType } from '@/domain/types';
import { Text, spacing, useColors } from '@/ui';
import { formatMeasurement, type MeasurementUnits } from './measurementUnits';

interface MeasurementSummaryTilesProps {
  type: MeasurementType;
  latestValue: number | null;
  /** Latest minus first value, or null when there are fewer than two entries. */
  change: number | null;
  units: MeasurementUnits;
}

function getChangeColor(change: number | null): string {
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

/** Two tiles at the top of a measurement screen: the latest value and the change since the first entry. */
export function MeasurementSummaryTiles({ type, latestValue, change, units }: MeasurementSummaryTilesProps) {
  const { t: translate } = useTranslation();
  const colors = useColors();
  return (
    <View style={styles.tiles}>
      <View style={[styles.tile, { backgroundColor: colors.surface }]}>
        <Text variant="label" color="muted">
          {translate('measurements.latest').toUpperCase()}
        </Text>
        <Text variant="h2" tabular>
          {latestValue != null ? formatMeasurement(type, latestValue, units) : '—'}
        </Text>
      </View>
      <View style={[styles.tile, { backgroundColor: colors.surface }]}>
        <Text variant="label" color="muted">
          {translate('measurements.change').toUpperCase()}
        </Text>
        <Text variant="h2" tabular color={getChangeColor(change)}>
          {formatChange(type, change, units)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  tile: { flex: 1, padding: spacing.lg, borderRadius: 16, gap: 4 },
});
