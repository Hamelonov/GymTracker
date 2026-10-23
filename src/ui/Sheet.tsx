import React, { useEffect, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable as RNPressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
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

const EASE = Easing.out(Easing.cubic);
const IN_MS = 200;
const OUT_MS = 150;

/** Bottom sheet modal with backdrop. Uses the native Modal so it overlays navigation. */
export function Sheet({ visible, onClose, title, children, flush }: SheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
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

  useEffect(() => {
    if (visible) return undefined;
    const t = setTimeout(() => setMounted(false), OUT_MS + 20);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!mounted) return null;
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {visible ? (
          <Animated.View entering={FadeIn.duration(IN_MS)} exiting={FadeOut.duration(OUT_MS)} style={StyleSheet.absoluteFill}>
            <RNPressable style={[styles.flex, { backgroundColor: c.overlay }]} onPress={onClose} />
          </Animated.View>
        ) : null}
        <View style={styles.flex} pointerEvents="box-none">
          <View style={styles.flex} pointerEvents="none" />
          {visible ? (
            <Animated.View
              entering={SlideInDown.duration(IN_MS).easing(EASE)}
              exiting={SlideOutDown.duration(OUT_MS).easing(Easing.in(Easing.cubic))}
              style={[styles.sheet, { backgroundColor: c.bg, paddingBottom: keyboard + insets.bottom + spacing.lg }]}
            >
              <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
              {title ? (
                <Text variant="h2" style={styles.title}>
                  {title}
                </Text>
              ) : null}
              <View style={flush ? null : styles.content}>{children}</View>
            </Animated.View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
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
