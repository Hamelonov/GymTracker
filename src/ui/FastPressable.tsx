import React, { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type PressState = { pressed: boolean };

export interface FastPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle> | ((pressState: PressState) => StyleProp<ViewStyle>);
  children?: React.ReactNode | ((pressState: PressState) => React.ReactNode);
}

/**
 * React Native's Pressable keeps its "pressed" look for at least 130 ms after
 * the finger lifts (a built-in minimum that Pressable does not let you change).
 * This wrapper tracks the pressed look itself and clears it the moment the
 * press fires, so the UI never lags behind the action.
 */
export function FastPressable({
  style,
  children,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: FastPressableProps) {
  const [isPressed, setIsPressed] = useState(false);
  const pressState = { pressed: isPressed };
  return (
    <Pressable
      {...rest}
      onPressIn={(event) => {
        setIsPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setIsPressed(false);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        setIsPressed(false);
        onPress?.(event);
      }}
      style={typeof style === 'function' ? style(pressState) : style}
    >
      {typeof children === 'function' ? children(pressState) : children}
    </Pressable>
  );
}
