import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MuscleGroup } from '@/domain/types';
import { useColors } from '@/ui';
import { MuscleMap } from './MuscleMap';
import { sideForMuscle } from './bodyHighlighterSlugs';

interface MuscleThumbnailProps {
  primary: MuscleGroup;
  secondary: readonly MuscleGroup[];
  /** Диаметр кружка; силуэт внутри занимает почти всю высоту. */
  size: number;
}

/** Маленький кружок с силуэтом для списков и карточек: показывает ту сторону, где видна основная мышца. */
export const MuscleThumbnail = memo(function MuscleThumbnail({
  primary,
  secondary,
  size,
}: MuscleThumbnailProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt },
      ]}
    >
      <MuscleMap primary={primary} secondary={secondary} side={sideForMuscle(primary)} height={size * 0.82} />
    </View>
  );
});

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
