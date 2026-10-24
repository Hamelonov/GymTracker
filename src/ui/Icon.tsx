import type { LucideIcon, LucideProps } from 'lucide-react-native';
import React from 'react';
import { resolveThemeColor, type ThemeColorName } from './themeColor';
import { useColors } from './ThemeProvider';

export interface IconProps extends Omit<LucideProps, 'color' | 'size'> {
  icon: LucideIcon;
  size?: number;
  color?: ThemeColorName | string;
}

export function Icon({
  icon: IconComponent,
  size = 20,
  color = 'text',
  strokeWidth = 2,
  ...rest
}: IconProps) {
  const colors = useColors();
  const iconColor = resolveThemeColor(color, colors);
  return <IconComponent size={size} color={iconColor} strokeWidth={strokeWidth} {...rest} />;
}
