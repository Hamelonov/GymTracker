import React from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius, spacing } from './tokens';

export interface MarkerProps {
  /** Короткий текст под штрихом. Без него штрих держит только значок. */
  children?: React.ReactNode;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Штрих маркера под коротким текстом: прибавка рекорда, значок рекорда. */
export function Marker({ children, icon, style }: MarkerProps) {
  const colors = useColors();
  return (
    <View style={[styles.marker, { backgroundColor: colors.accent }, style]}>
      {icon}
      {children != null ? (
        <Text variant="caption" color="onAccent" tabular>
          {children}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
});
