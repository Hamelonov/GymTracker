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
 * Лёгкий чип: обычный RN `Pressable` с изменением прозрачности при нажатии. На экранах
 * таких чипов десятки одновременно, поэтому анимаций на каждый чип нет.
 */
export const Chip = memo(function Chip({ label, selected, onPress, icon, small }: ChipProps) {
  const colors = useColors();
  const areHapticsEnabled = useSettings((state) => state.haptics);

  const renderChip = (isPressed: boolean) => (
    <View
      style={[
        styles.chip,
        small ? styles.small : null,
        { backgroundColor: selected ? colors.text : colors.surfaceAlt, opacity: isPressed ? 0.7 : 1 },
      ]}
    >
      {icon}
      <Text variant={small ? 'label' : 'caption'} color={selected ? colors.background : colors.text}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return renderChip(false);

  const handlePress = () => {
    if (areHapticsEnabled) void Haptics.selectionAsync();
    onPress();
  };

  return <FastPressable onPress={handlePress}>{({ pressed }) => renderChip(pressed)}</FastPressable>;
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
