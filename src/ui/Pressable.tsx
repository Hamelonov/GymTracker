import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSettings } from '@/store/settings';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface ScalePressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'selection' | 'success' | 'none';
  /** Ignore presses that arrive within this many ms of the previous one (double-tap guard). */
  debounceMs?: number;
  children?: React.ReactNode;
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
}: ScalePressableProps) {
  const scale = useSharedValue(1);
  const lastPress = useRef(0);
  const hapticsOn = useSettings((s) => s.haptics);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (e) => {
      // onPress fires on release, but React Native delays press-out by up to
      // 130 ms; reset the press look right now instead of waiting for it.
      scale.set(1);
      const now = Date.now();
      if (now - lastPress.current < debounceMs) return;
      lastPress.current = now;
      if (hapticsOn && haptic !== 'none') {
        if (haptic === 'selection') void Haptics.selectionAsync();
        else if (haptic === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else void Haptics.impactAsync(haptic === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
      }
      onPress?.(e);
    },
    [debounceMs, haptic, hapticsOn, onPress, scale],
  );

  return (
    <AnimatedPressable
      {...rest}
      onPress={handlePress}
      onPressIn={(e) => {
        scale.set(withTiming(scaleTo, { duration: 70, easing: Easing.out(Easing.quad) }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        // Snap back immediately so nothing visual lags behind the action.
        scale.set(1);
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
