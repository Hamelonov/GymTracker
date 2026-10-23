import React, { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type State = { pressed: boolean };

export interface FastPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle> | ((state: State) => StyleProp<ViewStyle>);
  children?: React.ReactNode | ((state: State) => React.ReactNode);
}

/**
 * React Native's Pressable keeps its "pressed" look for at least 130 ms after
 * the finger lifts (a built-in minimum that Pressable does not let you change).
 * This wrapper tracks the pressed look itself and clears it the moment the
 * press fires, so the UI never lags behind the action.
 */
export function FastPressable({ style, children, onPressIn, onPressOut, onPress, ...rest }: FastPressableProps) {
  const [pressed, setPressed] = useState(false);
  const state = { pressed };
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        setPressed(false);
        onPress?.(e);
      }}
      style={typeof style === 'function' ? style(state) : style}
    >
      {typeof children === 'function' ? children(state) : children}
    </Pressable>
  );
}
