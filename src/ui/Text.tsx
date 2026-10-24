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

export function Text({ variant = 'body', color = 'text', align, tabular, style, ...rest }: TextProps) {
  const colors = useColors();
  const textColor = resolveThemeColor(color, colors);
  return (
    <NativeText
      {...rest}
      style={[
        typeScale[variant],
        { color: textColor, textAlign: align },
        tabular ? tabularNumbersStyle : null,
        style,
      ]}
    />
  );
}
