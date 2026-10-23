import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSettings } from '@/store/settings';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface ScalePressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'selection' | 'success' | 'none';
  children?: React.ReactNode;
}

/** Pressable with a subtle spring scale and optional haptic tick. */
export function Pressable({ style, scaleTo = 0.97, haptic = 'none', onPressIn, onPressOut, onPress, ...rest }: ScalePressableProps) {
  const scale = useSharedValue(1);
  const hapticsOn = useSettings((s) => s.haptics);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (e) => {
      if (hapticsOn && haptic !== 'none') {
        if (haptic === 'selection') void Haptics.selectionAsync();
        else if (haptic === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else void Haptics.impactAsync(haptic === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
      }
      onPress?.(e);
    },
    [haptic, hapticsOn, onPress],
  );

  return (
    <AnimatedPressable
      {...rest}
      onPress={handlePress}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, { damping: 20, stiffness: 400 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 20, stiffness: 400 }));
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
