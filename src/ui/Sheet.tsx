import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius, spacing } from './tokens';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Не добавлять отступы вокруг содержимого (например, для списков). */
  unpadded?: boolean;
}

const SLIDE_IN_TIMING = { duration: 170, easing: Easing.out(Easing.cubic) };
const SLIDE_OUT_TIMING = { duration: 130, easing: Easing.in(Easing.cubic) };
/** Далеко за нижним краем экрана: означает «ещё не измерено» и прячет шторку до этого момента. */
const OFFSCREEN_POSITION = 4000;

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
  // Последняя измеренная высота, читается при старте анимации ухода (ref, чтобы
  // изменение размера из-за клавиатуры посреди анимации не перезапускало сдвиг).
  const sheetHeightRef = useRef(0);

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
      const sheetHeight = event.nativeEvent.layout.height;
      sheetHeightRef.current = sheetHeight;
      if (translateY.get() >= OFFSCREEN_POSITION) {
        // Первая раскладка после монтирования: начинаем чуть ниже края экрана и выезжаем.
        translateY.set(sheetHeight);
        translateY.set(withTiming(0, SLIDE_IN_TIMING));
        backdropOpacity.set(withTiming(1, SLIDE_IN_TIMING));
      }
    },
    [translateY, backdropOpacity],
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
      withTiming(sheetHeightRef.current || OFFSCREEN_POSITION, SLIDE_OUT_TIMING, (isFinished) => {
        if (isFinished) runOnJS(unmount)();
      }),
    );
  }, [visible, isMounted, translateY, backdropOpacity, unmount]);

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
  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
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
              backgroundColor: colors.background,
              paddingBottom: keyboardHeight + insets.bottom + spacing.lg,
            },
            sheetStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          {title ? (
            <Text variant="h2" style={styles.title}>
              {title}
            </Text>
          ) : null}
          <View style={unpadded ? null : styles.content}>{displayedContent}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  title: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  content: { paddingHorizontal: spacing.lg },
});
