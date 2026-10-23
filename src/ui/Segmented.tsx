import React, { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius } from './tokens';

export interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segW = width / Math.max(1, options.length);
  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(index * segW, { damping: 24, stiffness: 300 }) }],
    width: segW,
  }));
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - 6);
  return (
    <View style={[styles.track, { backgroundColor: c.surfaceAlt }]} onLayout={onLayout}>
      {width > 0 ? (
        <Animated.View style={[styles.indicator, { backgroundColor: c.bg }, indicator]} />
      ) : null}
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} haptic="selection" scaleTo={1} style={styles.seg}>
          <Text variant="caption" color={o.value === value ? c.text : c.textMuted}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.md, padding: 3, height: 40, position: 'relative' },
  indicator: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: radius.sm },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
