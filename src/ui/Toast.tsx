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

interface ToastState {
  current: ToastItem | null;
  show: (message: string, opts?: { actionLabel?: string; onAction?: () => void; durationMs?: number }) => void;
  dismiss: () => void;
}

let seq = 0;

export const useToast = create<ToastState>((set) => ({
  current: null,
  show: (message, opts) =>
    set({
      current: {
        id: ++seq,
        message,
        actionLabel: opts?.actionLabel,
        onAction: opts?.onAction,
        durationMs: opts?.durationMs ?? (opts?.actionLabel ? 5000 : 2500),
      },
    }),
  dismiss: () => set({ current: null }),
}));

export function toast(message: string, opts?: { actionLabel?: string; onAction?: () => void; durationMs?: number }) {
  useToast.getState().show(message, opts);
}

export function ToastHost({ bottomOffset = 0 }: { bottomOffset?: number }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const current = useToast((s) => s.current);
  const dismiss = useToast((s) => s.dismiss);

  useEffect(() => {
    if (!current) return undefined;
    const t = setTimeout(dismiss, current.durationMs);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  if (!current) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + bottomOffset + spacing.lg }]}>
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(120)}
        exiting={FadeOutDown.duration(100)}
        style={[styles.toast, { backgroundColor: c.text }]}
      >
        <Text variant="bodyMedium" color={c.bg} style={styles.msg} numberOfLines={2}>
          {current.message}
        </Text>
        {current.actionLabel ? (
          <Pressable
            onPress={() => {
              current.onAction?.();
              dismiss();
            }}
            hitSlop={8}
          >
            <Text variant="h3" color={c.accent}>
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
  msg: { flex: 1 },
});
