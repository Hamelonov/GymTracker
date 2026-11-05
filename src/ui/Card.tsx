import React from 'react';
import { type StyleProp, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { useColors } from './ThemeProvider';
import { radius, spacing } from './tokens';

export interface CardProps extends ViewProps {
  padded?: boolean;
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ padded = true, raised, style, ...rest }: CardProps) {
  const colors = useColors();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: raised ? colors.surfaceRaised : colors.surface, borderColor: colors.border },
        raised ? styles.raised : null,
        padded ? styles.padded : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: 'hidden' },
  raised: { borderWidth: StyleSheet.hairlineWidth },
  padded: { padding: spacing.lg },
});
