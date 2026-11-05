import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { motionDuration } from './motion';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { fonts, layout, radius, shadows, spacing } from './tokens';

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
  /** Высота панели вкладок с системным отступом и плашкой тренировки. 0, когда вкладок нет на экране. */
  tabBarOffset: number;
  /** Высота плашки отдыха, пока она показана. */
  dockOffset: number;
  show: (message: string, options?: ToastOptions) => void;
  dismiss: () => void;
  setTabBarOffset: (offset: number) => void;
  setDockOffset: (offset: number) => void;
}

// Тост с кнопкой висит дольше, чтобы успеть нажать.
const DURATION_WITH_ACTION_MS = 5000;
const DURATION_PLAIN_MS = 2500;
const EXIT_DURATION_MS = 100;

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  tabBarOffset: 0,
  dockOffset: 0,
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
  setTabBarOffset: (offset) => set({ tabBarOffset: offset }),
  setDockOffset: (offset) => set({ dockOffset: offset }),
}));

export function toast(message: string, options?: ToastOptions) {
  useToastStore.getState().show(message, options);
}

export function ToastHost() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const current = useToastStore((state) => state.current);
  const dismiss = useToastStore((state) => state.dismiss);
  const tabBarOffset = useToastStore((state) => state.tabBarOffset);
  const dockOffset = useToastStore((state) => state.dockOffset);

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

  // Без нижней панели тост всё равно должен стоять над системной навигацией.
  const occupiedBottomHeight = Math.max(tabBarOffset + dockOffset, insets.bottom);

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: occupiedBottomHeight + spacing.md }]}>
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(motionDuration.fast)}
        exiting={FadeOutDown.duration(EXIT_DURATION_MS)}
        style={[styles.toast, { backgroundColor: colors.inverseSurface }]}
      >
        <Text variant="bodyMedium" color="inverseText" style={styles.message} numberOfLines={2}>
          {current.message}
        </Text>
        {current.actionLabel ? (
          <Pressable onPress={handleActionPress} style={styles.actionButton}>
            <Text variant="caption" color="accent" style={styles.actionLabel}>
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
    paddingVertical: spacing.xs,
    minHeight: 52,
    borderRadius: radius.md,
    boxShadow: shadows.toast,
    maxWidth: 480,
    width: '100%',
  },
  message: { flex: 1 },
  actionButton: { minHeight: layout.touchTarget, justifyContent: 'center' },
  actionLabel: { fontFamily: fonts.semibold },
});
