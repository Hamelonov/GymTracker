import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, type LayoutChangeEvent, Modal, Platform, Pressable as RNPressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
  flush?: boolean;
}

const IN = { duration: 200, easing: Easing.out(Easing.cubic) };
const OUT = { duration: 150, easing: Easing.in(Easing.cubic) };
const OFFSCREEN = 4000;

/**
 * Bottom sheet modal with backdrop. Uses the native Modal so it overlays
 * navigation. The slide is driven by hand from the sheet's measured height so
 * it travels exactly its own distance, even when the content resizes.
 */
export function Sheet({ visible, onClose, title, children, flush }: SheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  // Keep the last rendered content while sliding out: parents usually drop the
  // content the moment they close the sheet, which would collapse it mid-slide.
  const [shown, setShown] = useState<React.ReactNode>(children);
  if (visible && shown !== children) setShown(children);

  const translateY = useSharedValue(OFFSCREEN);
  const backdrop = useSharedValue(0);
  // Latest measured height, read when the exit animation starts (a ref so a
  // keyboard-driven resize mid-animation cannot restart the slide).
  const heightRef = useRef(0);

  // Inside a translucent native Modal Android does not resize the window for the
  // keyboard, so track its height ourselves and pad the sheet.
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android' || !mounted) return undefined;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [mounted]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      heightRef.current = h;
      if (translateY.get() >= OFFSCREEN) {
        // First layout after mount: start just below the screen edge and slide in.
        translateY.set(h);
        translateY.set(withTiming(0, IN));
        backdrop.set(withTiming(1, IN));
      }
    },
    [translateY, backdrop],
  );

  const unmount = useCallback(() => {
    setMounted(false);
    setKeyboard(0);
    translateY.set(OFFSCREEN);
    backdrop.set(0);
  }, [translateY, backdrop]);

  useEffect(() => {
    if (visible || !mounted) return;
    Keyboard.dismiss();
    backdrop.set(withTiming(0, OUT));
    translateY.set(
      withTiming(heightRef.current || OFFSCREEN, OUT, (finished) => {
        if (finished) runOnJS(unmount)();
      }),
    );
  }, [visible, mounted, translateY, backdrop, unmount]);

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <RNPressable style={[styles.flex, { backgroundColor: c.overlay }]} onPress={onClose} />
      </Animated.View>
      <View style={styles.flex} pointerEvents="box-none">
        <View style={styles.flex} pointerEvents="none" />
        <Animated.View
          onLayout={onLayout}
          style={[styles.sheet, { backgroundColor: c.bg, paddingBottom: keyboard + insets.bottom + spacing.lg }, sheetStyle]}
        >
          <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
          {title ? (
            <Text variant="h2" style={styles.title}>
              {title}
            </Text>
          ) : null}
          <View style={flush ? null : styles.content}>{shown}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
