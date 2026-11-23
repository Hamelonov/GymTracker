import { Flame, Moon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, spacing, useColors } from '@/ui';

interface StreakHalfProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
}

function StreakHalf({ icon, iconColor, label }: StreakHalfProps) {
  return (
    <View style={styles.half}>
      <Icon icon={icon} size={20} color={iconColor} />
      <Text variant="bodyMedium" numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

interface HistoryStreaksProps {
  weeklyStreakLabel: string;
  restDaysLabel: string;
}

/** Полоса над календарём: недельная серия слева, дни отдыха справа. Прокручивается вместе с календарём. */
export function HistoryStreaks({ weeklyStreakLabel, restDaysLabel }: HistoryStreaksProps) {
  const colors = useColors();
  return (
    <View style={[styles.bar, { borderColor: colors.border }]}>
      <StreakHalf icon={Flame} iconColor={colors.accent} label={weeklyStreakLabel} />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <StreakHalf icon={Moon} iconColor={colors.info} label={restDaysLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  half: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  label: { flexShrink: 1 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
});
