import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  type LayoutChangeEvent,
  Modal,
  Platform,
  Pressable as NativePressable,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { easeOut, motionDuration } from './motion';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius, shadows, spacing } from './tokens';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Не добавлять отступы вокруг содержимого (например, для списков). */
  unpadded?: boolean;
}

const SLIDE_IN_TIMING = { duration: motionDuration.sheetIn, easing: easeOut };
const SLIDE_OUT_TIMING = { duration: motionDuration.sheetOut, easing: easeOut };
const SNAP_BACK_TIMING = { duration: motionDuration.base, easing: easeOut };
/** Далеко за нижним краем экрана: означает «ещё не измерено» и прячет шторку до этого момента. */
const OFFSCREEN_POSITION = 4000;
/** Шторка закрывается, если её сдвинули на такую долю высоты… */
const DISMISS_DISTANCE_RATIO = 0.25;
/** …или резко смахнули вниз (dp в секунду). */
const DISMISS_VELOCITY = 800;
/** Жест включается только при движении вниз: вверх шторка не идёт. */
const DRAG_ACTIVATION_DISTANCE = 8;

/**
 * Нижняя шторка-модалка с затемнением. Использует нативный `Modal`, поэтому перекрывает
 * навигацию. Сдвиг считается вручную по измеренной высоте шторки, поэтому
 * она проходит ровно свою длину, даже если содержимое меняет размер.
 */
export function Sheet({ visible, onClose, title, children, unpadded }: SheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(visible);
  if (visible && !isMounted) setIsMounted(true);
  // Хранить последнее показанное содержимое на время ухода вниз: родители обычно убирают
  // содержимое сразу при закрытии шторки, и она схлопнулась бы посреди анимации.
  const [displayedContent, setDisplayedContent] = useState<React.ReactNode>(children);
  if (visible && displayedContent !== children) setDisplayedContent(children);

  const translateY = useSharedValue(OFFSCREEN_POSITION);
  const backdropOpacity = useSharedValue(0);
  // Последняя измеренная высота, читается только в начале ухода и в конце жеста, поэтому
  // изменение размера из-за клавиатуры посреди анимации не перезапускает сдвиг.
  const sheetHeight = useSharedValue(0);

  // В прозрачном нативном `Modal` Android не меняет размер окна под
  // клавиатуру, поэтому отслеживаем её высоту сами и добавляем отступ шторке.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android' || !isMounted) return undefined;
    const keyboardShowListener = Keyboard.addListener('keyboardDidShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [isMounted]);

  const handleSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const measuredHeight = event.nativeEvent.layout.height;
      sheetHeight.set(measuredHeight);
      if (translateY.get() >= OFFSCREEN_POSITION) {
        // Первая раскладка после монтирования: начинаем чуть ниже края экрана и выезжаем.
        translateY.set(measuredHeight);
        translateY.set(withTiming(0, SLIDE_IN_TIMING));
        backdropOpacity.set(withTiming(1, SLIDE_IN_TIMING));
      }
    },
    [translateY, backdropOpacity, sheetHeight],
  );

  const unmount = useCallback(() => {
    setIsMounted(false);
    setKeyboardHeight(0);
    translateY.set(OFFSCREEN_POSITION);
    backdropOpacity.set(0);
  }, [translateY, backdropOpacity]);

  useEffect(() => {
    if (visible || !isMounted) return;
    Keyboard.dismiss();
    backdropOpacity.set(withTiming(0, SLIDE_OUT_TIMING));
    translateY.set(
      withTiming(sheetHeight.get() || OFFSCREEN_POSITION, SLIDE_OUT_TIMING, (isFinished) => {
        if (isFinished) scheduleOnRN(unmount);
      }),
    );
  }, [visible, isMounted, translateY, backdropOpacity, sheetHeight, unmount]);

  useEffect(() => {
    if (!visible) return undefined;
    const backPressSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => backPressSubscription.remove();
  }, [visible, onClose]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!isMounted) return null;

  const dragGesture = Gesture.Pan()
    // Во время ухода жест перебил бы анимацию, и шторка осталась бы на экране.
    .enabled(visible)
    .activeOffsetY(DRAG_ACTIVATION_DISTANCE)
    .onUpdate((event) => {
      translateY.set(Math.max(0, event.translationY));
    })
    .onEnd((event) => {
      const isDraggedFarEnough = translateY.get() > sheetHeight.get() * DISMISS_DISTANCE_RATIO;
      if (isDraggedFarEnough || event.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(onClose);
        return;
      }
      translateY.set(withTiming(0, SNAP_BACK_TIMING));
    });

  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* На Android `Modal` это отдельный корень: корневой обработчик приложения сюда не достаёт. */}
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <NativePressable style={[styles.fill, { backgroundColor: colors.overlay }]} onPress={onClose} />
        </Animated.View>
        <View style={styles.fill} pointerEvents="box-none">
          <View style={styles.fill} pointerEvents="none" />
          <Animated.View
            onLayout={handleSheetLayout}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surfaceRaised,
                paddingBottom: keyboardHeight + insets.bottom + spacing.lg,
              },
              sheetStyle,
            ]}
          >
            {/* Жест только на ручке и заголовке, чтобы не спорить с прокруткой внутри шторки. */}
            <GestureDetector gesture={dragGesture}>
              <View style={styles.dragZone}>
                <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
                {title ? (
                  <Text variant="h3" style={styles.title}>
                    {title}
                  </Text>
                ) : null}
              </View>
            </GestureDetector>
            <View style={unpadded ? null : styles.content}>{displayedContent}</View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    boxShadow: shadows.sheet,
  },
  dragZone: { minHeight: 24, paddingTop: spacing.sm, paddingBottom: spacing.md },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  title: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  content: { paddingHorizontal: spacing.lg },
});
