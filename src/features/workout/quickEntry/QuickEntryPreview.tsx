import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, spacing, useColors } from '@/ui';
import type { PreviewLine } from './useQuickEntry';

/** Что приложение поняло из каждой строки: упражнение и подходы, либо подсказка об ошибке. */
export function QuickEntryPreview({ lines }: { lines: PreviewLine[] }) {
  const colors = useColors();
  if (lines.length === 0) return null;

  return (
    <View style={styles.list}>
      {lines.map((line) => (
        <View key={line.lineIndex} style={styles.line}>
          <Text
            variant="bodyMedium"
            color={line.status === 'error' ? 'muted' : colors.text}
            numberOfLines={1}
          >
            {line.title}
          </Text>
          {line.errorText ? (
            <Text variant="caption" color="danger">
              {line.errorText}
            </Text>
          ) : null}
          {line.setsText ? (
            <Text variant="caption" color="muted" tabular>
              {line.setsText}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: spacing.md, gap: spacing.sm },
  line: { gap: 2 },
});
