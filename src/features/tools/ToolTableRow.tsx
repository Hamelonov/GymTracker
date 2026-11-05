import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, spacing } from '@/ui';

interface ToolTableRowProps {
  label: string;
  value: string;
  /** Мелкая подпись справа, например проценты или повторы. */
  extra?: string;
  labelWidth: number;
  isLabelMuted?: boolean;
  isValueBold?: boolean;
}

/** Строка таблицы калькулятора внутри `ListGroup`: подпись слева, значение, мелкая подпись справа. */
export function ToolTableRow({
  label,
  value,
  extra,
  labelWidth,
  isLabelMuted = false,
  isValueBold = false,
}: ToolTableRowProps) {
  return (
    <View style={styles.row}>
      <Text
        variant="bodyMedium"
        color={isLabelMuted ? 'muted' : 'text'}
        tabular
        style={{ width: labelWidth }}
      >
        {label}
      </Text>
      <Text variant={isValueBold ? 'h3' : 'bodyMedium'} tabular style={styles.value}>
        {value}
      </Text>
      {extra ? (
        <Text variant="caption" color="muted" tabular>
          {extra}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  value: { flex: 1 },
});
