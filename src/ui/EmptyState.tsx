import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconCircle } from './IconCircle';
import { Text } from './Text';
import { spacing } from './tokens';

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconCircle}>
        <IconCircle icon={icon} size={64} />
      </View>
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
  wrapper: { alignItems: 'center', paddingVertical: spacing.xxl * 1.5, paddingHorizontal: spacing.xl },
  iconCircle: { marginBottom: spacing.lg },
  hint: { marginTop: spacing.sm, maxWidth: 300 },
  action: { marginTop: spacing.xl },
});
