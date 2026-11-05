import React from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { spacing, type TextVariant } from './tokens';

type StatSize = 'compact' | 'regular' | 'hero';

export interface StatProps {
  label: string;
  value?: string;
  /** Вместо `value`, когда число обновляет себя само, как `ElapsedTimer`. */
  children?: React.ReactNode;
  size?: StatSize;
  tone?: 'theme' | 'inverse';
  style?: StyleProp<ViewStyle>;
}

const valueVariantBySize: Record<StatSize, TextVariant> = {
  compact: 'statCompact',
  regular: 'stat',
  hero: 'h1',
};

// Полоса статистики задана по ширине: без предела системный шрифт её разорвёт.
const COMPACT_MAX_FONT_SCALE = 1.2;

/** Число и подпись под ним. */
export function Stat({ label, value, children, size = 'regular', tone = 'theme', style }: StatProps) {
  const isInverse = tone === 'inverse';
  const maxFontScale = size === 'compact' ? COMPACT_MAX_FONT_SCALE : undefined;
  return (
    <View style={[styles.stat, style]}>
      {children ?? (
        <Text
          variant={valueVariantBySize[size]}
          color={isInverse ? 'inverseText' : 'text'}
          maxFontSizeMultiplier={maxFontScale}
          tabular
        >
          {value}
        </Text>
      )}
      <Text variant="label" color={isInverse ? 'inverseMuted' : 'muted'} maxFontSizeMultiplier={maxFontScale}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { gap: spacing.xxs },
});
