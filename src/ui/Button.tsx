import React from 'react';
import { ActivityIndicator, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Pressable, type ScalePressableProps } from './Pressable';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius, spacing } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ScalePressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Override the label color (e.g. a black button on a yellow screen). */
  textColor?: string;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  full,
  disabled,
  style,
  textColor,
  ...rest
}: ButtonProps) {
  const c = useColors();
  const bg =
    variant === 'primary'
      ? c.accent
      : variant === 'secondary'
        ? c.surfaceAlt
        : variant === 'danger'
          ? c.dangerSoft
          : 'transparent';
  const fg =
    textColor ??
    (variant === 'primary'
      ? c.onAccent
      : variant === 'danger'
        ? c.danger
        : variant === 'ghost'
          ? c.textMuted
          : c.text);
  const height = size === 'sm' ? 36 : size === 'lg' ? 56 : 48;
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      haptic={rest.haptic ?? (variant === 'primary' ? 'light' : 'none')}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          height,
          borderRadius: size === 'lg' ? radius.lg : radius.md,
          opacity: disabled ? 0.45 : 1,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: c.borderStrong,
          alignSelf: full ? 'stretch' : 'auto',
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text variant={size === 'sm' ? 'caption' : 'h3'} color={fg}>
            {title}
          </Text>
          {iconRight ? <View style={styles.icon}>{iconRight}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
