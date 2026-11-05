import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatNumberWithoutTrailingZeros } from '@/domain/units';
import { Text, radius, spacing, useColors } from '@/ui';

interface BarbellDiagramProps {
  /** Блины для одной стороны грифа, от самого тяжёлого. */
  plates: number[];
  /** Самый тяжёлый доступный блин; он рисуется самым высоким. */
  heaviestPlate: number;
}

const MIN_PLATE_HEIGHT = 48;
const EXTRA_HEIGHT_FOR_HEAVIEST_PLATE = 72;

/** Рисует одну сторону нагруженной штанги: конец грифа и следующие за ним блины. */
export function BarbellDiagram({ plates, heaviestPlate }: BarbellDiagramProps) {
  const colors = useColors();
  return (
    <View style={styles.barbell}>
      <View style={[styles.barEnd, { backgroundColor: colors.borderStrong }]} />
      {plates.map((plate, index) => {
        const plateHeight = MIN_PLATE_HEIGHT + (plate / heaviestPlate) * EXTRA_HEIGHT_FOR_HEAVIEST_PLATE;
        // Чередуем тёмные и жёлтые блины, чтобы соседние легко различались.
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
  barbell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 140,
    paddingLeft: spacing.lg,
  },
  barEnd: { width: 40, height: 10, borderRadius: radius.xs },
  plate: { width: 30, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
});
