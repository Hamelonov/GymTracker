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
  /** Keep content area unpadded (e.g. for lists). */
  unpadded?: boolean;
}

const SLIDE_IN_TIMING = { duration: 170, easing: Easing.out(Easing.cubic) };
const SLIDE_OUT_TIMING = { duration: 130, easing: Easing.in(Easing.cubic) };
/** Far below any screen: marks "not laid out yet" and hides the sheet until then. */
const OFFSCREEN_POSITION = 4000;

/**
 * Bottom sheet modal with backdrop. Uses the native Modal so it overlays
 * navigation. The slide is driven by hand from the sheet's measured height so
 * it travels exactly its own distance, even when the content resizes.
 */
export function Sheet({ visible, onClose, title, children, unpadded }: SheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(visible);
  if (visible && !isMounted) setIsMounted(true);
  // Keep the last rendered content while sliding out: parents usually drop the
  // content the moment they close the sheet, which would collapse it mid-slide.
  const [displayedContent, setDisplayedContent] = useState<React.ReactNode>(children);
  if (visible && displayedContent !== children) setDisplayedContent(children);

  const translateY = useSharedValue(OFFSCREEN_POSITION);
  const backdropOpacity = useSharedValue(0);
  // Latest measured height, read when the exit animation starts (a ref so a
  // keyboard-driven resize mid-animation cannot restart the slide).
  const sheetHeightRef = useRef(0);

  // Inside a translucent native Modal Android does not resize the window for the
  // keyboard, so track its height ourselves and pad the sheet.
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
        // First layout after mount: start just below the screen edge and slide in.
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
