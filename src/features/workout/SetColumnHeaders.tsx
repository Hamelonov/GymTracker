import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ExtraField, SetFields } from '@/domain/types';
import { Text, spacing } from '@/ui';
import { NARROW_COLUMN_FLEX, PREVIOUS_COLUMN_FLEX, SET_COLUMN_WIDTHS, getSetColumnGap } from './setRowLayout';

interface SetColumnHeadersProps {
  fields: SetFields;
  extraFields: ExtraField[];
  /** Подпись колонки веса со знаком: «−» у упражнений с помощью, «+» у дополнительного веса. */
  weightColumnLabel: string;
  distanceColumnLabel: string;
  isDense: boolean;
  hasCheckColumn: boolean;
}

const COLUMN_HEADERS_HEIGHT = 24;

/** Подписи над строками подходов: те же ширины и зазоры, что у `SetRow`. */
export function SetColumnHeaders({
  fields,
  extraFields,
  weightColumnLabel,
  distanceColumnLabel,
  isDense,
  hasCheckColumn,
}: SetColumnHeadersProps) {
  const { t: translate } = useTranslation();
  const showsWeightColumn = fields.weight || extraFields.includes('weight');
  return (
    <View style={[styles.row, { gap: getSetColumnGap(isDense) }]}>
      <Text variant="label" color="muted" style={styles.setNumberColumn}>
        {translate('workout.setShort').toUpperCase()}
      </Text>
      <Text variant="label" color="muted" numberOfLines={1} style={styles.previousColumn}>
        {translate('workout.previous').toUpperCase()}
      </Text>
      {showsWeightColumn ? (
        <Text variant="label" color="muted" numberOfLines={1} style={styles.valueColumn}>
          {weightColumnLabel}
        </Text>
      ) : null}
      {fields.reps ? (
        <Text variant="label" color="muted" numberOfLines={1} style={styles.valueColumn}>
          {translate('workout.reps').toUpperCase()}
        </Text>
      ) : null}
      {fields.distance ? (
        <Text variant="label" color="muted" numberOfLines={1} style={styles.valueColumn}>
          {distanceColumnLabel}
        </Text>
      ) : null}
      {fields.duration ? (
        <Text variant="label" color="muted" numberOfLines={1} style={styles.valueColumn}>
          {translate('workout.time').toUpperCase()}
        </Text>
      ) : null}
      {extraFields.includes('rir') ? (
        <Text variant="label" color="muted" numberOfLines={1} style={styles.narrowColumn}>
          {translate('workout.rir')}
        </Text>
      ) : null}
      {extraFields.includes('rpe') ? (
        <Text variant="label" color="muted" numberOfLines={1} style={styles.narrowColumn}>
          {translate('workout.rpe')}
        </Text>
      ) : null}
      {hasCheckColumn ? <View style={styles.checkColumn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: COLUMN_HEADERS_HEIGHT,
    paddingHorizontal: spacing.lg,
  },
  setNumberColumn: { width: SET_COLUMN_WIDTHS.setNumber, textAlign: 'center' },
  previousColumn: { flex: PREVIOUS_COLUMN_FLEX },
  valueColumn: { flex: 1, textAlign: 'center' },
  narrowColumn: { flex: NARROW_COLUMN_FLEX, textAlign: 'center' },
  checkColumn: { width: SET_COLUMN_WIDTHS.checkButton },
});
