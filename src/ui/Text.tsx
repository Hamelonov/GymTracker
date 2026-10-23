import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useColors } from './ThemeProvider';
import { typeScale, type TypeVariant } from './tokens';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: 'text' | 'muted' | 'faint' | 'accent' | 'danger' | 'success' | 'onAccent' | string;
  align?: TextStyle['textAlign'];
  tabular?: boolean;
}

export function Text({ variant = 'body', color = 'text', align, tabular, style, ...rest }: TextProps) {
  const colors = useColors();
  const resolved =
    color === 'text'
      ? colors.text
      : color === 'muted'
        ? colors.textMuted
        : color === 'faint'
          ? colors.textFaint
          : color === 'accent'
            ? colors.accent
            : color === 'danger'
              ? colors.danger
              : color === 'success'
                ? colors.success
                : color === 'onAccent'
                  ? colors.onAccent
                  : color;
  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        { color: resolved, textAlign: align },
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
