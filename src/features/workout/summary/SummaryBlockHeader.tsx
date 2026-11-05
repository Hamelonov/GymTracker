import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, spacing } from '@/ui';

/** Иконка и заголовок над каждой карточкой на экране итогов. */
export function SummaryBlockHeader({ icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <View style={styles.blockHeader}>
      <Icon icon={icon} size={18} color="onAccent" />
      <Text variant="h3" color="onAccent">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
});
