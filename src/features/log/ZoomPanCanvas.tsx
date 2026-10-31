import React, { useEffect } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';

const MAX_SCALE = 3;

interface ZoomPanCanvasProps {
  /** Ширина содержимого при масштабе 1. Задаётся явно: таблица шире экрана, а измерение упёрлось бы в ширину экрана. */
  contentWidth: number;
  /** Сколько снизу закрыто плавающей панелью: содержимое можно поднять настолько выше нижнего края. */
  bottomInset?: number;
  children: React.ReactNode;
}

/**
 * Холст: одним пальцем свободно двигается во все стороны (с инерцией), двумя — масштабируется
 * к точке между пальцами. Края не отходят от краёв экрана: при отдалении масштаб не меньше того,
 * при котором содержимое ровно по ширине экрана, а сдвиг не открывает пустоту.
 * Холст не должен лежать внутри ScrollView: на Android прокрутка перехватывает касание и отменяет жесты.
 */
export function ZoomPanCanvas({ contentWidth, bottomInset = 0, children }: ZoomPanCanvasProps) {
  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const contentWidthValue = useSharedValue(contentWidth);
  const contentHeight = useSharedValue(0);
  const bottomInsetValue = useSharedValue(bottomInset);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isPinching = useSharedValue(false);
  // Был ли щипок в текущем касании: тогда оставшийся палец уже не двигает холст до полного отпускания.
  const hasPinchedThisTouch = useSharedValue(false);
  const lastFocalX = useSharedValue(0);
  const lastFocalY = useSharedValue(0);

  useEffect(() => {
    contentWidthValue.set(contentWidth);
  }, [contentWidth, contentWidthValue]);
  useEffect(() => {
    bottomInsetValue.set(bottomInset);
  }, [bottomInset, bottomInsetValue]);

  // Масштаб, при котором содержимое ровно по ширине экрана; меньше — появились бы пустые поля.
  const minScaleWorklet = () => {
    'worklet';
    if (contentWidthValue.value <= 0 || viewportWidth.value <= 0) return 1;
    return Math.min(1, viewportWidth.value / contentWidthValue.value);
  };

  const minTranslateXWorklet = (currentScale: number) => {
    'worklet';
    return Math.min(0, viewportWidth.value - contentWidthValue.value * currentScale);
  };

  const minTranslateYWorklet = (currentScale: number) => {
    'worklet';
    const visibleHeight = viewportHeight.value - bottomInsetValue.value;
    return Math.min(0, visibleHeight - contentHeight.value * currentScale);
  };

  // Смещение отрицательное: 0 — край содержимого у края экрана, меньше — содержимое уехало влево/вверх.
  const clampTranslateWorklet = (value: number, lowerLimit: number) => {
    'worklet';
    return Math.min(0, Math.max(lowerLimit, value));
  };

  const stopInertiaWorklet = () => {
    'worklet';
    cancelAnimation(translateX);
    cancelAnimation(translateY);
  };

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      isPinching.value = true;
      hasPinchedThisTouch.value = true;
      stopInertiaWorklet();
      lastFocalX.value = event.focalX;
      lastFocalY.value = event.focalY;
    })
    .onChange((event) => {
      // Когда один палец уже поднят, середина между пальцами прыгает на оставшийся палец — это не движение.
      if (event.numberOfPointers < 2) return;
      const nextScale = Math.min(MAX_SCALE, Math.max(minScaleWorklet(), scale.value * event.scaleChange));
      const ratio = nextScale / scale.value;
      // Точка содержимого под пальцами остаётся под ними, даже если пальцы при этом ещё и сдвинулись.
      const nextTranslateX = event.focalX - (lastFocalX.value - translateX.value) * ratio;
      const nextTranslateY = event.focalY - (lastFocalY.value - translateY.value) * ratio;
      scale.value = nextScale;
      translateX.value = clampTranslateWorklet(nextTranslateX, minTranslateXWorklet(nextScale));
      translateY.value = clampTranslateWorklet(nextTranslateY, minTranslateYWorklet(nextScale));
      lastFocalX.value = event.focalX;
      lastFocalY.value = event.focalY;
    })
    .onFinalize(() => {
      isPinching.value = false;
    });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Касание останавливает инерцию, как у обычной прокрутки.
      stopInertiaWorklet();
    })
    .onChange((event) => {
      // После щипка пальцы отпускают не одновременно: оставшийся палец дёрнул бы холст на полрасстояния между пальцами.
      if (isPinching.value || hasPinchedThisTouch.value) return;
      translateX.value = clampTranslateWorklet(
        translateX.value + event.changeX,
        minTranslateXWorklet(scale.value),
      );
      translateY.value = clampTranslateWorklet(
        translateY.value + event.changeY,
        minTranslateYWorklet(scale.value),
      );
    })
    .onEnd((event) => {
      // По той же причине после щипка нет инерции: скорость в момент отпускания — это скачок, а не бросок.
      if (isPinching.value || hasPinchedThisTouch.value) return;
      translateX.value = withDecay({
        velocity: event.velocityX,
        clamp: [minTranslateXWorklet(scale.value), 0],
      });
      translateY.value = withDecay({
        velocity: event.velocityY,
        clamp: [minTranslateYWorklet(scale.value), 0],
      });
    })
    .onFinalize(() => {
      // Касание закончилось целиком: следующее начинается с чистого листа.
      hasPinchedThisTouch.value = false;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // RN масштабирует вокруг центра элемента; поправка делает так, будто масштаб идёт от левого верхнего угла.
  const animatedStyle = useAnimatedStyle(() => {
    const widthGrowth = (contentWidthValue.value * (scale.value - 1)) / 2;
    const heightGrowth = (contentHeight.value * (scale.value - 1)) / 2;
    return {
      transform: [
        { translateX: translateX.value + widthGrowth },
        { translateY: translateY.value + heightGrowth },
        { scale: scale.value },
      ],
    };
  });

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    viewportWidth.set(event.nativeEvent.layout.width);
    viewportHeight.set(event.nativeEvent.layout.height);
  };
  const handleContentLayout = (event: LayoutChangeEvent) => {
    contentHeight.set(event.nativeEvent.layout.height);
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <View collapsable={false} style={styles.viewport} onLayout={handleViewportLayout}>
        <Animated.View
          collapsable={false}
          onLayout={handleContentLayout}
          style={[styles.content, { width: contentWidth }, animatedStyle]}
        >
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
  // Абсолютное положение: высота содержимого не ужимается под высоту экрана.
  content: { position: 'absolute', left: 0, top: 0 },
});
