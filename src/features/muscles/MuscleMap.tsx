import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { MuscleGroup } from '@/domain/types';
import { spacing, useColors } from '@/ui';
import { BODY_OUTLINE, BODY_VIEWBOX, shapesForSide } from './muscleMapShapes';
import { buildRegionEmphasis, type BodySide, type MuscleRegion, type RegionEmphasis } from './muscleRegions';

interface BodyFigureProps {
  side: BodySide;
  emphasisByRegion: Map<MuscleRegion, RegionEmphasis>;
  height: number;
}

/** Один силуэт: контур тела и подсвеченные зоны поверх него. */
const BodyFigure = memo(function BodyFigure({ side, emphasisByRegion, height }: BodyFigureProps) {
  const colors = useColors();
  const shapes = shapesForSide(side);
  const regions = Object.keys(shapes) as MuscleRegion[];
  return (
    <Svg width={height / 2} height={height} viewBox={BODY_VIEWBOX}>
      {BODY_OUTLINE.map((path, index) => (
        <Path key={index} d={path} fill={colors.surfaceAlt} stroke={colors.borderStrong} strokeWidth={1} />
      ))}
      {regions.map((region) => {
        const emphasis = emphasisByRegion.get(region);
        if (!emphasis) return null;
        // Вспомогательные мышцы — тот же жёлтый, но полупрозрачный, чтобы основная читалась с первого взгляда.
        const opacity = emphasis === 'primary' ? 1 : 0.4;
        return (shapes[region] ?? []).map((path, index) => (
          <Path key={`${region}-${index}`} d={path} fill={colors.accent} opacity={opacity} />
        ));
      })}
    </Svg>
  );
});

interface MuscleMapProps {
  primary: MuscleGroup;
  secondary: readonly MuscleGroup[];
  /** Какую сторону показать; «both» — обе рядом. */
  side: BodySide | 'both';
  height: number;
}

/** Схема мышц: основная группа жёлтым, вспомогательные — полупрозрачным жёлтым. */
export const MuscleMap = memo(function MuscleMap({ primary, secondary, side, height }: MuscleMapProps) {
  const emphasisByRegion = buildRegionEmphasis(primary, secondary);
  if (side !== 'both') return <BodyFigure side={side} emphasisByRegion={emphasisByRegion} height={height} />;
  return (
    <View style={styles.pair}>
      <BodyFigure side="front" emphasisByRegion={emphasisByRegion} height={height} />
      <BodyFigure side="back" emphasisByRegion={emphasisByRegion} height={height} />
    </View>
  );
});

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
});
