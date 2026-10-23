import type { LucideIcon, LucideProps } from 'lucide-react-native';
import React from 'react';
import { useColors } from './ThemeProvider';

export interface IconProps extends Omit<LucideProps, 'color' | 'size'> {
  icon: LucideIcon;
  size?: number;
  color?: 'text' | 'muted' | 'faint' | 'accent' | 'danger' | 'success' | 'onAccent' | string;
}

export function Icon({ icon: Cmp, size = 20, color = 'text', strokeWidth = 2, ...rest }: IconProps) {
  const c = useColors();
  const resolved =
    color === 'text'
      ? c.text
      : color === 'muted'
        ? c.textMuted
        : color === 'faint'
          ? c.textFaint
          : color === 'accent'
            ? c.accent
            : color === 'danger'
              ? c.danger
              : color === 'success'
                ? c.success
                : color === 'onAccent'
                  ? c.onAccent
                  : color;
  return <Cmp size={size} color={resolved} strokeWidth={strokeWidth} {...rest} />;
}
