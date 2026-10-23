import * as Haptics from 'expo-haptics';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { FastPressable } from './FastPressable';
import { useSettings } from '@/store/settings';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius, spacing } from './tokens';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  small?: boolean;
}

/**
 * Lightweight chip: plain RN Pressable with an opacity press state. Screens
 * render dozens of these at once, so no per-chip animation machinery.
 */
export const Chip = memo(function Chip({ label, selected, onPress, icon, small }: ChipProps) {
  const c = useColors();
  const hapticsOn = useSettings((s) => s.haptics);
  const content = (pressed: boolean) => (
    <View style={[styles.chip, small ? styles.small : null, { backgroundColor: selected ? c.text : c.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}>
      {icon}
      <Text variant={small ? 'label' : 'caption'} color={selected ? c.bg : c.text}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return content(false);
  return (
    <FastPressable
     
      onPress={() => {
        if (hapticsOn) void Haptics.selectionAsync();
        onPress();
      }}
    >
      {({ pressed }) => content(pressed)}
    </FastPressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
  },
  small: { height: 26, paddingHorizontal: spacing.sm },
});
