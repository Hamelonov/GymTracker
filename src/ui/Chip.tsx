import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from './Pressable';
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

export function Chip({ label, selected, onPress, icon, small }: ChipProps) {
  const c = useColors();
  const content = (
    <View
      style={[
        styles.chip,
        small ? styles.small : null,
        {
          backgroundColor: selected ? c.text : c.surfaceAlt,
        },
      ]}
    >
      {icon}
      <Text variant={small ? 'label' : 'caption'} color={selected ? c.bg : c.text}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} haptic="selection" scaleTo={0.95}>
      {content}
    </Pressable>
  );
}

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
