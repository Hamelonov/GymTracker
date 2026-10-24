import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatNumberWithoutTrailingZeros } from '@/domain/units';
import { Text, radius, spacing, useColors } from '@/ui';

interface BarbellDiagramProps {
  /** Plates for one side of the bar, heaviest first. */
  plates: number[];
  /** Heaviest available plate; it gets the tallest drawing. */
  heaviestPlate: number;
}

const MIN_PLATE_HEIGHT = 48;
const EXTRA_HEIGHT_FOR_HEAVIEST_PLATE = 72;

/** Draws one side of a loaded barbell: the bar end followed by its plates. */
export function BarbellDiagram({ plates, heaviestPlate }: BarbellDiagramProps) {
  const colors = useColors();
  return (
    <View style={styles.barbell}>
      <View style={[styles.barEnd, { backgroundColor: colors.borderStrong }]} />
      {plates.map((plate, index) => {
        const plateHeight = MIN_PLATE_HEIGHT + (plate / heaviestPlate) * EXTRA_HEIGHT_FOR_HEAVIEST_PLATE;
        // Alternate dark and yellow plates so neighbours are easy to tell apart.
        const isDarkPlate = index % 2 === 0;
        return (
          <View
            key={index}
            style={[
              styles.plate,
              { height: plateHeight, backgroundColor: isDarkPlate ? colors.text : colors.accent },
            ]}
          >
            <Text variant="label" color={isDarkPlate ? colors.background : colors.onAccent}>
              {formatNumberWithoutTrailingZeros(plate)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barbell: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 140, paddingLeft: spacing.lg },
  barEnd: { width: 40, height: 10, borderRadius: 5 },
  plate: { width: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
