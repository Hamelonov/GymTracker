import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
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
  const colors = useColors();
  return (
    <View style={styles.wrapper}>
      <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
        <Icon icon={icon} size={28} color={colors.text} />
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  hint: { marginTop: spacing.sm, maxWidth: 300 },
  action: { marginTop: spacing.xl },
});
