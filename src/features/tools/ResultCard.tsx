import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, radius, spacing, useColors } from '@/ui';

interface ResultCardProps {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
}

/** Результат калькулятора: крупное число маркерного цвета на тёмной поверхности. */
export function ResultCard({ label, value, unit, caption }: ResultCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.inverseSurface }]}>
      <Text variant="label" color="inverseMuted">
        {label.toUpperCase()}
      </Text>
      <Text variant="numberHero" color="accent" tabular>
        {value}
        {unit ? (
          <Text variant="h2" color="inverseMuted">
            {' '}
            {unit}
          </Text>
        ) : null}
      </Text>
      {caption ? (
        <Text variant="caption" color="inverseMuted" align="center">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xl,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
  },
});
