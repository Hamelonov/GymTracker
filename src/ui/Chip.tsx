import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { FastPressable } from './FastPressable';
import { playHaptic } from './haptics';
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

// Рисунок чипа ниже цели нажатия 48 dp, недостающее добирается отступом касания.
const REGULAR_CHIP_HIT_SLOP = { top: 4, bottom: 4 };
const SMALL_CHIP_HIT_SLOP = { top: 8, bottom: 8 };

/**
 * Лёгкий чип: обычный RN `Pressable` с изменением прозрачности при нажатии. На экранах
 * таких чипов десятки одновременно, поэтому анимаций на каждый чип нет.
 */
export const Chip = memo(function Chip({ label, selected, onPress, icon, small }: ChipProps) {
  const colors = useColors();

  const renderChip = (isPressed: boolean) => (
    <View
      style={[
        styles.chip,
        small ? styles.small : null,
        { backgroundColor: selected ? colors.text : colors.surfaceAlt, opacity: isPressed ? 0.7 : 1 },
      ]}
    >
      {icon}
      <Text variant="caption" color={selected ? colors.background : colors.text}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return renderChip(false);

  const handlePress = () => {
    onPress();
    playHaptic('selection');
  };

  return (
    <FastPressable
      onPress={handlePress}
      hitSlop={small ? SMALL_CHIP_HIT_SLOP : REGULAR_CHIP_HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
    >
      {({ pressed }) => renderChip(pressed)}
    </FastPressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.pill,
  },
  small: { height: 32, paddingHorizontal: 10 },
});
