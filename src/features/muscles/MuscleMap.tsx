import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Body from 'react-native-body-highlighter';
import type { MuscleGroup } from '@/domain/types';
import { spacing, useColors } from '@/ui';
import { buildHighlightedParts } from './bodyHighlighterSlugs';

/** Базовый размер рисунка тела в библиотеке при scale = 1. */
const BASE_BODY_HEIGHT = 400;

export type BodySide = 'front' | 'back';

interface MuscleMapProps {
  primary: MuscleGroup;
  secondary: readonly MuscleGroup[];
  /** Какую сторону показать; «both» — обе рядом. */
  side: BodySide | 'both';
  height: number;
}

/** Схема мышц: рисованное тело, основная группа жёлтым, вспомогательные приглушённым цветом. */
export const MuscleMap = memo(function MuscleMap({ primary, secondary, side, height }: MuscleMapProps) {
  const colors = useColors();
  const parts = useMemo(() => buildHighlightedParts(primary, secondary), [primary, secondary]);
  const scale = height / BASE_BODY_HEIGHT;
  const highlightColors = [colors.accent, colors.muscleSecondary];

  if (side !== 'both') {
    return (
      <Body
        data={parts}
        side={side}
        gender="male"
        scale={scale}
        colors={highlightColors}
        border="none"
        defaultFill={colors.muscleBase}
      />
    );
  }
  return (
    <View style={styles.pair}>
      <Body
        data={parts}
        side="front"
        gender="male"
        scale={scale}
        colors={highlightColors}
        border="none"
        defaultFill={colors.muscleBase}
      />
      <Body
        data={parts}
        side="back"
        gender="male"
        scale={scale}
        colors={highlightColors}
        border="none"
        defaultFill={colors.muscleBase}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
});
