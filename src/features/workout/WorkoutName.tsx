import React from 'react';
import { Text as NativeText } from 'react-native';
import { resolveThemeColor, type ThemeColorName } from '@/ui/themeColor';
import { Text, useColors, type TextProps } from '@/ui';

// «Тренировка №14», «Workout #14»: текст, знак номера и сам номер.
const NUMBERED_NAME = /^(.*\S)\s*(№|#)\s*(\d+)$/;

interface WorkoutNameProps extends TextProps {
  name: string;
  /** Цвет знака «№». По умолчанию приглушённый, чтобы взгляд цеплялся за сам номер. */
  signColor?: ThemeColorName | string;
}

/**
 * Название тренировки. В названиях с номером знак «№» рисуется приглушённым,
 * чтобы взгляд цеплялся за сам номер: «Тренировка №14».
 * Остальные названия показываются как есть.
 */
export function WorkoutName({ name, signColor = 'muted', ...textProps }: WorkoutNameProps) {
  const colors = useColors();
  const numberedName = NUMBERED_NAME.exec(name);
  if (!numberedName) return <Text {...textProps}>{name}</Text>;

  const [, title, sign, number] = numberedName;
  return (
    <Text {...textProps}>
      {`${title} `}
      <NativeText style={{ color: resolveThemeColor(signColor, colors) }}>{sign}</NativeText>
      {number}
    </Text>
  );
}
