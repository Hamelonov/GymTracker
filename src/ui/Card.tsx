import React from 'react';
import { type StyleProp, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { useColors, useTheme } from './ThemeProvider';
import { radius, shadows, spacing } from './tokens';

export interface CardProps extends ViewProps {
  padded?: boolean;
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ padded = true, raised, style, ...rest }: CardProps) {
  const colors = useColors();
  // В тёмной теме тени нет: глубину даёт surface на background.
  const { isDark } = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: raised ? colors.surfaceRaised : colors.surface },
        isDark ? null : shadows.card,
        padded ? styles.padded : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg },
  padded: { padding: spacing.lg },
});
