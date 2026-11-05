import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius, spacing } from './tokens';

interface ToastItem {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
}

interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastState {
  current: ToastItem | null;
  show: (message: string, options?: ToastOptions) => void;
  dismiss: () => void;
}

// Тост с кнопкой висит дольше, чтобы успеть нажать.
const DURATION_WITH_ACTION_MS = 5000;
const DURATION_PLAIN_MS = 2500;

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (message, options) =>
    set({
      current: {
        id: ++toastCounter,
        message,
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
        durationMs:
          options?.durationMs ?? (options?.actionLabel ? DURATION_WITH_ACTION_MS : DURATION_PLAIN_MS),
      },
    }),
  dismiss: () => set({ current: null }),
}));

export function toast(message: string, options?: ToastOptions) {
  useToastStore.getState().show(message, options);
}

export function ToastHost({ bottomOffset = 0 }: { bottomOffset?: number }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const current = useToastStore((state) => state.current);
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    if (!current) return undefined;
    const dismissTimer = setTimeout(dismiss, current.durationMs);
    return () => clearTimeout(dismissTimer);
  }, [current, dismiss]);

  if (!current) return null;

  const handleActionPress = () => {
    current.onAction?.();
    dismiss();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + bottomOffset + spacing.lg }]}
    >
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(120)}
        exiting={FadeOutDown.duration(100)}
        style={[styles.toast, { backgroundColor: colors.inverseSurface }]}
      >
        <Text variant="bodyMedium" color="inverseText" style={styles.message} numberOfLines={2}>
          {current.message}
        </Text>
        {current.actionLabel ? (
          <Pressable onPress={handleActionPress} hitSlop={8}>
            <Text variant="h3" color="accent">
              {current.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    maxWidth: 480,
    width: '100%',
  },
  message: { flex: 1 },
});
