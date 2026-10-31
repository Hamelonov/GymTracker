import React from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.5;

interface PinchZoomScrollViewProps {
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Горизонтальная прокрутка, которую можно ещё и смасштабировать двумя пальцами.
 * Жест вешается на саму прокрутку (а не на содержимое внутри неё): на Android вложенный
 * жест внутри ScrollView почти никогда не распознаётся, прокрутка перехватывает касание раньше.
 * `collapsable={false}` не даёт Android схлопнуть обёртку с масштабом в оптимизации вёрстки,
 * иначе жест цепляется не за тот нативный элемент.
 */
export function PinchZoomScrollView({ contentContainerStyle, children }: PinchZoomScrollViewProps) {
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
      >
        <Animated.View collapsable={false} style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </ScrollView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'flex-start' },
});
