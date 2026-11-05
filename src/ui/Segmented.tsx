import type { LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { type LayoutChangeEvent, Pressable as NativePressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Icon } from './Icon';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius } from './tokens';

export interface SegmentedProps<T extends string> {
  /** Необязательная иконка слева от подписи сегмента. */
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
}

/** Внутренний отступ дорожки; индикатор находится внутри него. */
const TRACK_PADDING = 3;

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
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
          duration: 120,
          easing: Easing.out(Easing.cubic),
        }),
      },
    ],
    width: segmentWidth,
  }));
  const handleTrackLayout = (event: LayoutChangeEvent) =>
    setInnerWidth(event.nativeEvent.layout.width - TRACK_PADDING * 2);
  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]} onLayout={handleTrackLayout}>
      {innerWidth > 0 ? (
        <Animated.View style={[styles.indicator, { backgroundColor: colors.background }, indicatorStyle]} />
      ) : null}
      {options.map((option) => (
        <NativePressable key={option.value} onPress={() => onChange(option.value)} style={styles.segment}>
          {option.icon ? (
            <Icon
              icon={option.icon}
              size={15}
              color={option.value === value ? colors.text : colors.textMuted}
            />
          ) : null}
          <Text variant="caption" color={option.value === value ? colors.text : colors.textMuted}>
            {option.label}
          </Text>
        </NativePressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: TRACK_PADDING,
    height: 40,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: radius.sm,
  },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
