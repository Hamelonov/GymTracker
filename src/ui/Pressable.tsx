import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import {
  Pressable as NativePressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSettings } from '@/store/settings';

const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);

type HapticKind = 'light' | 'medium' | 'selection' | 'success' | 'none';

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: HapticKind;
  /** Ignore presses that arrive within this many ms of the previous one (double-tap guard). */
  debounceMs?: number;
  children?: React.ReactNode;
}

function playHaptic(haptic: HapticKind) {
  if (haptic === 'none') return;
  if (haptic === 'selection') {
    void Haptics.selectionAsync();
    return;
  }
  if (haptic === 'success') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }
  const impactStyle =
    haptic === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium;
  void Haptics.impactAsync(impactStyle);
}

/** Pressable with a subtle spring scale, optional haptic tick and a double-tap guard. */
export function Pressable({
  style,
  scaleTo = 0.97,
  haptic = 'none',
  debounceMs = 400,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const lastPressTime = useRef(0);
  const areHapticsEnabled = useSettings((state) => state.haptics);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (event) => {
      // onPress fires on release, but React Native delays press-out by up to
      // 130 ms; reset the press look right now instead of waiting for it.
      scale.set(1);
      const now = Date.now();
      if (now - lastPressTime.current < debounceMs) return;
      lastPressTime.current = now;
      if (areHapticsEnabled) playHaptic(haptic);
      onPress?.(event);
    },
    [debounceMs, haptic, areHapticsEnabled, onPress, scale],
  );

  return (
    <AnimatedPressable
      {...rest}
      onPress={handlePress}
      onPressIn={(event) => {
        scale.set(withTiming(scaleTo, { duration: 70, easing: Easing.out(Easing.quad) }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // Snap back immediately so nothing visual lags behind the action.
        scale.set(1);
        onPressOut?.(event);
      }}
      style={[style, scaleStyle]}
    />
  );
}
