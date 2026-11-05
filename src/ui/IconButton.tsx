import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { Icon, type IconProps } from './Icon';
import { Pressable, type AnimatedPressableProps } from './Pressable';
import { useColors } from './ThemeProvider';
import { radius } from './tokens';

type IconButtonVariant = 'plain' | 'filled' | 'accent';

export interface IconButtonProps extends Omit<AnimatedPressableProps, 'children' | 'style'> {
  icon: LucideIcon;
  /** Размер значка, а не кнопки: рисунок всегда 40×40. */
  size?: number;
  color?: IconProps['color'];
  variant?: IconButtonVariant;
  /** Подпись для экранного диктора: текста на кнопке нет. */
  label: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  size = 20,
  color = 'text',
  variant = 'plain',
  label,
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
      // Вместе с рисунком 40×40 это даёт цель нажатия 48×48.
      hitSlop={4}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...rest}
      style={[styles.button, { backgroundColor: backgroundColorByVariant[variant] }, style]}
    >
      <Icon icon={icon} size={size} color={variant === 'accent' ? 'onAccent' : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
