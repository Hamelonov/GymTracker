import React from 'react';
import { Text as NativeText, type TextProps as NativeTextProps, type TextStyle } from 'react-native';
import { resolveThemeColor, type ThemeColorName } from './themeColor';
import { useColors } from './ThemeProvider';
import { typeScale, type TextVariant } from './tokens';

export interface TextProps extends NativeTextProps {
  variant?: TextVariant;
  color?: ThemeColorName | string;
  align?: TextStyle['textAlign'];
  tabular?: boolean;
}

const tabularNumbersStyle: TextStyle = { fontVariant: ['tabular-nums'] };

// Цифры Inter по умолчанию разной ширины: без этого числа прыгают при смене значения и в колонках.
const NUMERIC_VARIANTS = new Set<TextVariant>([
  'numberHero',
  'timer',
  'stat',
  'statCompact',
  'setValue',
  'setValueDense',
]);

export function Text({ variant = 'body', color = 'text', align, tabular, style, ...rest }: TextProps) {
  const colors = useColors();
  const textColor = resolveThemeColor(color, colors);
  const hasTabularNumbers = tabular || NUMERIC_VARIANTS.has(variant);
  return (
    <NativeText
      {...rest}
      style={[
        typeScale[variant],
        { color: textColor, textAlign: align },
        hasTabularNumbers ? tabularNumbersStyle : null,
        style,
      ]}
    />
  );
}
