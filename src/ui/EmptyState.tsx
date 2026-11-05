import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { spacing } from './tokens';

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.wrapper}>
      <View style={[styles.markerStroke, { backgroundColor: colors.accent }]} />
      <Text variant="h3" align="center">
        {title}
      </Text>
      {hint ? (
        <Text color="muted" align="center" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
  markerStroke: { width: 40, height: 8, borderRadius: 2, marginBottom: spacing.lg },
  hint: { marginTop: spacing.sm, maxWidth: 300 },
  action: { marginTop: spacing.xl },
});
