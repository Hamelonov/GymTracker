import React, { useCallback, useRef } from 'react';
import {
  Pressable as NativePressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { playHaptic, type HapticKind } from './haptics';
import { easeOut, motionDuration } from './motion';

const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: HapticKind;
  /** Игнорировать нажатия, пришедшие в пределах стольких мс после предыдущего (защита от двойного тапа). */
  debounceMs?: number;
  children?: React.ReactNode;
}

/** `Pressable` с лёгким сжатием при нажатии, необязательной вибро-отдачей и защитой от двойного тапа. */
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
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (event) => {
      // `onPress` срабатывает при отпускании, но React Native задерживает press-out до
      // 130 мс; сбрасываем вид нажатия сразу, а не ждём.
      scale.set(1);
      const now = Date.now();
      if (now - lastPressTime.current < debounceMs) return;
      lastPressTime.current = now;
      onPress?.(event);
      // После действия: вибрация не должна откладывать смену состояния на экране.
      playHaptic(haptic);
    },
    [debounceMs, haptic, onPress, scale],
  );

  return (
    <AnimatedPressable
      {...rest}
      onPress={handlePress}
      onPressIn={(event) => {
        scale.set(withTiming(scaleTo, { duration: motionDuration.press, easing: easeOut }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // Возвращаем сразу, чтобы визуально ничего не отставало от действия.
        scale.set(1);
        onPressOut?.(event);
      }}
      style={[style, scaleStyle]}
    />
  );
}
