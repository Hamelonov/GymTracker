import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, spacing } from '@/ui';

// The summary cards are always white on the yellow screen, in light and dark theme alike,
// so their secondary colors are fixed instead of coming from the theme.
export const SUMMARY_MUTED_TEXT_COLOR = '#6A6A66';
export const SUMMARY_DIVIDER_COLOR = '#E6E6E2';

/** Icon and title above each card on the summary screen. */
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

export const summaryStyles = StyleSheet.create({
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: SUMMARY_DIVIDER_COLOR },
});

const styles = StyleSheet.create({
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
});
