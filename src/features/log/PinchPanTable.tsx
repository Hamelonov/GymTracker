import React from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const MAX_SCALE = 3;
// Ниже этого палец уже не щипок, а случайное дрожание; защищает от резких скачков масштаба.
const PAN_ACTIVATION_DISTANCE = 10;

interface PinchPanTableProps {
  children: React.ReactNode;
}

/**
 * Таблица шире экрана, поэтому вместо обычной прокрутки — свободное перетаскивание одним
 * пальцем и масштаб сведением/разведением двух, как на канвасе. При отдалении масштаб не
 * уходит ниже того, что умещает таблицу по ширине экрана: края не отрываются от экрана
 * и не оставляют пустых полей. Вертикальный свайп отдаётся странице (`failOffsetY`),
 * иначе было бы невозможно прокрутить экран, начав жест над таблицей.
 */
export function PinchPanTable({ children }: PinchPanTableProps) {
  const containerWidth = useSharedValue(0);
  const contentWidth = useSharedValue(0);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);

  // Масштаб, при котором ширина таблицы ровно совпадает с шириной экрана; меньше него — только пустота по краям.
  const minScaleWorklet = () => {
    'worklet';
    if (contentWidth.value <= 0 || containerWidth.value <= 0) return 1;
    return Math.min(1, containerWidth.value / contentWidth.value);
  };

  const maxTranslateXWorklet = (currentScale: number) => {
    'worklet';
    return Math.max(0, (contentWidth.value * currentScale - containerWidth.value) / 2);
  };

  const clampWorklet = (value: number, limit: number) => {
    'worklet';
    return Math.min(limit, Math.max(-limit, value));
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(minScaleWorklet(), savedScale.value * event.scale));
      scale.value = nextScale;
      // Таблица сжалась — старое смещение могло стать больше нового предела и обнажить пустоту сбоку.
      translateX.value = clampWorklet(translateX.value, maxTranslateXWorklet(nextScale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
    });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-PAN_ACTIVATION_DISTANCE, PAN_ACTIVATION_DISTANCE])
    .failOffsetY([-PAN_ACTIVATION_DISTANCE, PAN_ACTIVATION_DISTANCE])
    .onUpdate((event) => {
      const limit = maxTranslateXWorklet(scale.value);
      translateX.value = clampWorklet(savedTranslateX.value + event.translationX, limit);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    containerWidth.value = event.nativeEvent.layout.width;
  };
  const handleContentLayout = (event: LayoutChangeEvent) => {
    // onLayout отдаёт размер без учёта transform, поэтому масштаб не портит дальнейшие расчёты.
    contentWidth.value = event.nativeEvent.layout.width;
  };

  return (
    <View style={styles.viewport} onLayout={handleContainerLayout}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          collapsable={false}
          onLayout={handleContentLayout}
          style={[styles.content, animatedStyle]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { overflow: 'hidden' },
  content: { alignSelf: 'flex-start' },
});
