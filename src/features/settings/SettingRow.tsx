import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, spacing } from '@/ui';

interface SettingRowProps {
  label: string;
  /** В строку для двух вариантов, в столбик для трёх и больше. */
  layout: 'inline' | 'stacked';
  /** Мелкая подсказка под контролом. */
  hint?: string;
  children: React.ReactNode;
}

// Переключатель из двух вариантов не растягивается на весь ряд.
const INLINE_CONTROL_WIDTH = 132;

/** Строка настройки: подпись и контрол, поля как у остальных строк списка. */
export function SettingRow({ label, layout, hint, children }: SettingRowProps) {
  const isInline = layout === 'inline';
  return (
    <View style={[styles.row, isInline ? styles.inlineRow : styles.stackedRow]}>
      <Text variant="bodyMedium" style={isInline ? styles.inlineLabel : null}>
        {label}
      </Text>
      <View style={isInline ? styles.inlineControl : null}>{children}</View>
      {hint ? (
        <Text variant="caption" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  stackedRow: { gap: spacing.sm },
  inlineLabel: { flex: 1 },
  inlineControl: { width: INLINE_CONTROL_WIDTH },
});
