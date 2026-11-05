import { Trash2 } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { MeasurementRow } from '@/db/schema';
import { formatDateTime } from '@/domain/dates';
import type { MeasurementType } from '@/domain/types';
import { IconButton, Text, spacing, useColors } from '@/ui';
import { formatMeasurement, type MeasurementUnits } from './measurementUnits';

interface MeasurementHistoryRowProps {
  type: MeasurementType;
  measurement: MeasurementRow;
  units: MeasurementUnits;
  onDelete: (measurementId: string) => void;
}

/** Одно записанное значение замера: число, дата и заметка, справа удаление. */
export const MeasurementHistoryRow = memo(function MeasurementHistoryRow({
  type,
  measurement,
  units,
  onDelete,
}: MeasurementHistoryRowProps) {
  const { t: translate, i18n } = useTranslation();
  const colors = useColors();
  const dateText = formatDateTime(measurement.measuredAt, i18n.language);
  const noteText = measurement.note ? ` · ${measurement.note}` : '';

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.textColumn}>
        <Text variant="bodyMedium" tabular>
          {formatMeasurement(type, measurement.value, units)}
        </Text>
        <Text variant="caption" color="muted">
          {`${dateText}${noteText}`}
        </Text>
      </View>
      <IconButton
        icon={Trash2}
        size={18}
        color="muted"
        label={translate('common.delete')}
        onPress={() => onDelete(measurement.id)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textColumn: { flex: 1 },
});
