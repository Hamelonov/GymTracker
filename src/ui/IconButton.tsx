import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { Icon, type IconProps } from './Icon';
import { Pressable, type ScalePressableProps } from './Pressable';
import { useColors } from './ThemeProvider';

export interface IconButtonProps extends Omit<ScalePressableProps, 'children' | 'style'> {
  icon: LucideIcon;
  size?: number;
  color?: IconProps['color'];
  variant?: 'plain' | 'filled' | 'accent';
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, size = 20, color = 'text', variant = 'plain', style, ...rest }: IconButtonProps) {
  const c = useColors();
  const bg = variant === 'filled' ? c.surfaceAlt : variant === 'accent' ? c.accent : 'transparent';
  return (
    <Pressable
      hitSlop={8}
      scaleTo={0.9}
      {...rest}
      style={[styles.btn, { backgroundColor: bg }, style]}
    >
      <Icon icon={icon} size={size} color={variant === 'accent' ? 'onAccent' : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
