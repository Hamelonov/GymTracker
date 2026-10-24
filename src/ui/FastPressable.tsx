import React, { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type PressState = { pressed: boolean };

export interface FastPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle> | ((pressState: PressState) => StyleProp<ViewStyle>);
  children?: React.ReactNode | ((pressState: PressState) => React.ReactNode);
}

/**
 * `Pressable` в React Native держит вид «нажато» минимум 130 мс после
 * отпускания пальца (встроенный минимум, который нельзя изменить).
 * Эта обёртка сама следит за видом «нажато» и сбрасывает его в момент
 * срабатывания нажатия, так что интерфейс не отстаёт от действия.
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
