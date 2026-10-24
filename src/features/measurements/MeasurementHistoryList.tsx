import { Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { deleteMeasurement } from '@/db/repo/measurements';
import type { MeasurementRow } from '@/db/schema';
import { formatDateTime } from '@/domain/dates';
import type { MeasurementType } from '@/domain/types';
import { Card, IconButton, ListItem, confirm, spacing, useColors } from '@/ui';
import { formatMeasurement, type MeasurementUnits } from './measurementUnits';

interface MeasurementHistoryListProps {
  type: MeasurementType;
  measurements: MeasurementRow[];
  units: MeasurementUnits;
}

/** Все записанные значения одного типа замеров, от новых к старым, у каждого кнопка удаления. */
export function MeasurementHistoryList({ type, measurements, units }: MeasurementHistoryListProps) {
  const { t: translate, i18n } = useTranslation();
  const colors = useColors();

  const confirmAndDelete = async (measurementId: string) => {
    const isConfirmed = await confirm({
      title: translate('measurements.deleteConfirm'),
      destructive: true,
      confirmLabel: translate('common.delete'),
    });
    if (isConfirmed) deleteMeasurement(measurementId);
  };

  return (
    <Card padded={false}>
      {measurements.map((measurement, index) => {
        const dateText = formatDateTime(measurement.measuredAt, i18n.language);
        const noteText = measurement.note ? ` · ${measurement.note}` : '';
        return (
          <View
            key={measurement.id}
            style={index > 0 ? [styles.divider, { borderTopColor: colors.border }] : null}
          >
            <ListItem
              title={formatMeasurement(type, measurement.value, units)}
              subtitle={`${dateText}${noteText}`}
              right={
                <IconButton
                  icon={Trash2}
                  size={18}
                  color="muted"
                  onPress={() => void confirmAndDelete(measurement.id)}
                />
              }
              style={styles.listItem}
            />
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  listItem: { paddingHorizontal: spacing.lg },
});
