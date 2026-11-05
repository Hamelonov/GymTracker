import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { Icon, type IconProps } from './Icon';
import { Pressable, type AnimatedPressableProps } from './Pressable';
import { useColors } from './ThemeProvider';

type IconButtonVariant = 'plain' | 'filled' | 'accent';

export interface IconButtonProps extends Omit<AnimatedPressableProps, 'children' | 'style'> {
  icon: LucideIcon;
  size?: number;
  color?: IconProps['color'];
  variant?: IconButtonVariant;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  size = 20,
  color = 'text',
  variant = 'plain',
  style,
  ...rest
}: IconButtonProps) {
  const colors = useColors();
  const backgroundColorByVariant: Record<IconButtonVariant, string> = {
    plain: 'transparent',
    filled: colors.surfaceAlt,
    accent: colors.accent,
  };
  return (
    <Pressable
      hitSlop={8}
      scaleTo={0.9}
      {...rest}
      style={[styles.button, { backgroundColor: backgroundColorByVariant[variant] }, style]}
    >
      <Icon icon={icon} size={size} color={variant === 'accent' ? 'onAccent' : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
