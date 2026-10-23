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
  const c = useColors();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: raised ? c.surfaceRaised : c.surface, borderColor: c.border },
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
