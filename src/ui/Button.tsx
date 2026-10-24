import React from 'react';
import { ActivityIndicator, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Pressable, type AnimatedPressableProps } from './Pressable';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius, spacing, type ThemeColors } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<AnimatedPressableProps, 'children' | 'style'> {
  /** Без подписи кнопка показывает только иконку. */
  title?: string;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Переопределяет цвет подписи (например, чёрная кнопка на жёлтом экране). */
  textColor?: string;
}

const buttonHeightBySize: Record<Size, number> = { sm: 36, md: 48, lg: 56 };

function getBackgroundColor(variant: Variant, colors: ThemeColors): string {
  const backgroundColorByVariant: Record<Variant, string> = {
    primary: colors.accent,
    secondary: colors.surfaceAlt,
    danger: colors.dangerSoft,
    ghost: 'transparent',
    outline: 'transparent',
  };
  return backgroundColorByVariant[variant];
}

function getLabelColor(variant: Variant, colors: ThemeColors): string {
  const labelColorByVariant: Record<Variant, string> = {
    primary: colors.onAccent,
    danger: colors.danger,
    ghost: colors.textMuted,
    secondary: colors.text,
    outline: colors.text,
  };
  return labelColorByVariant[variant];
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  loading,
  fullWidth,
  disabled,
  style,
  textColor,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const backgroundColor = getBackgroundColor(variant, colors);
  const labelColor = textColor ?? getLabelColor(variant, colors);
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      haptic={rest.haptic ?? (variant === 'primary' ? 'light' : 'none')}
      style={[
        styles.button,
        {
          backgroundColor,
          height: buttonHeightBySize[size],
          borderRadius: size === 'lg' ? radius.lg : radius.md,
          opacity: disabled ? 0.45 : 1,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: colors.borderStrong,
          alignSelf: fullWidth ? 'stretch' : 'auto',
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          {title ? (
            <Text variant={size === 'sm' ? 'caption' : 'h3'} color={labelColor}>
              {title}
            </Text>
          ) : null}
          {trailingIcon ? <View style={styles.icon}>{trailingIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
