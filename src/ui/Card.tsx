import React from 'react';
import { type StyleProp, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { useColors } from './ThemeProvider';
import { radius, spacing } from './tokens';

export interface CardProps extends ViewProps {
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ padded = true, style, ...rest }: CardProps) {
  const colors = useColors();
  return (
    <View
      {...rest}
      style={[styles.card, { backgroundColor: colors.surface }, padded ? styles.padded : null, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: 'hidden' },
  padded: { padding: spacing.lg },
});
