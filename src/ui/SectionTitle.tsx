import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { spacing } from './tokens';

export function SectionTitle({ title, right, first }: { title: string; right?: React.ReactNode; first?: boolean }) {
  return (
    <View style={[styles.row, first ? styles.first : null]}>
      <Text variant="label" color="muted">
        {title.toUpperCase()}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  first: { marginTop: spacing.sm },
});
