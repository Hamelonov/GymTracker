import type { LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { FastPressable } from './FastPressable';
import { playHaptic } from './haptics';
import { Icon } from './Icon';
import { easeOut, motionDuration } from './motion';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { fonts, radius, spacing } from './tokens';

export interface SegmentedProps<T extends string> {
  /** Необязательная иконка слева от подписи сегмента. */
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  /** `false` там, где сам выбор уже вибрирует, чтобы отдача не сдваивалась. */
  hasHaptic?: boolean;
  /** Только значки, сегмент шириной 44: подпись остаётся для экранного диктора. */
  compact?: boolean;
}

/** Внутренний отступ дорожки; индикатор находится внутри него. */
const TRACK_PADDING = 3;

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  hasHaptic = true,
  compact,
}: SegmentedProps<T>) {
  const colors = useColors();
  const [innerWidth, setInnerWidth] = useState(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const segmentWidth = innerWidth / Math.max(1, options.length);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(selectedIndex * segmentWidth, {
          duration: motionDuration.fast,
          easing: easeOut,
        }),
      },
    ],
    width: segmentWidth,
  }));
  const handleTrackLayout = (event: LayoutChangeEvent) =>
    setInnerWidth(event.nativeEvent.layout.width - TRACK_PADDING * 2);
  const handleSegmentPress = (nextValue: T) => {
    onChange(nextValue);
    if (hasHaptic && nextValue !== value) playHaptic('selection');
  };
  return (
    <View
      style={[styles.track, compact ? styles.trackCompact : null, { backgroundColor: colors.surfaceAlt }]}
      onLayout={handleTrackLayout}
    >
      {innerWidth > 0 ? (
        <Animated.View
          style={[styles.indicator, { backgroundColor: colors.segmentIndicator }, indicatorStyle]}
        />
      ) : null}
      {options.map((option) => {
        const isSelected = option.value === value;
        const contentColor = isSelected ? colors.text : colors.textMuted;
        return (
          <FastPressable
            key={option.value}
            onPress={() => handleSegmentPress(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              compact ? styles.segmentCompact : styles.segment,
              pressed ? styles.segmentPressed : null,
            ]}
          >
            {option.icon ? <Icon icon={option.icon} size={compact ? 20 : 16} color={contentColor} /> : null}
            {compact ? null : (
              <Text variant="caption" color={contentColor} style={isSelected ? styles.selectedLabel : null}>
                {option.label}
              </Text>
            )}
          </FastPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: TRACK_PADDING,
    height: 44,
    position: 'relative',
  },
  trackCompact: { height: 40, alignSelf: 'flex-start' },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: radius.sm,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  segmentCompact: { width: 44, alignItems: 'center', justifyContent: 'center' },
  segmentPressed: { opacity: 0.7 },
  selectedLabel: { fontFamily: fonts.semibold },
});
