import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { MuscleGroup } from '@/domain/types';
import { radius, useColors } from '@/ui';
import { sideForMuscle } from './bodyHighlighterSlugs';
import { basePathForSide, pathForMuscles, viewBoxForSide } from './muscleGlyphPaths';

interface MuscleThumbnailProps {
  primary: MuscleGroup;
  secondary: readonly MuscleGroup[];
  /** Сторона плитки; силуэт внутри занимает почти всю высоту. */
  size: number;
}

const FIGURE_HEIGHT_RATIO = 0.82;

/** Плитка с силуэтом для списков: три контура вместо целого тела, поэтому дёшево рисуется. */
export const MuscleThumbnail = memo(function MuscleThumbnail({
  primary,
  secondary,
  size,
}: MuscleThumbnailProps) {
  const colors = useColors();
  const side = sideForMuscle(primary);
  const figureHeight = size * FIGURE_HEIGHT_RATIO;

  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: colors.surfaceAlt }]}>
      <Svg viewBox={viewBoxForSide(side)} width={figureHeight / 2} height={figureHeight}>
        <Path d={basePathForSide(side)} fill={colors.muscleBase} />
        <Path d={pathForMuscles(side, secondary)} fill={colors.muscleSecondary} />
        <Path d={pathForMuscles(side, [primary])} fill={colors.accent} />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.sm },
});
