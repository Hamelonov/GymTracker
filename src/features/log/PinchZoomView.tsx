import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.5;

interface PinchZoomViewProps {
  children: React.ReactNode;
}

/**
 * Сжатие и разведение двух пальцев масштабирует содержимое. Масштаб не трогает раскладку:
 * при увеличении край таблицы может выйти за пределы прокрутки, зато жест не конфликтует
 * с обычной прокруткой одним пальцем у родительского ScrollView.
 */
export function PinchZoomView({ children }: PinchZoomViewProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <GestureDetector gesture={pinchGesture}>
      <Animated.View style={[styles.content, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'flex-start' },
});
