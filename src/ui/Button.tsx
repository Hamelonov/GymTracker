import React, { useState } from 'react';
import { ActivityIndicator, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Pressable, type AnimatedPressableProps } from './Pressable';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { fonts, radius, spacing, type ThemeColors } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'ink';
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
  /** `danger` красит подпись: разрушительное действие без заливки. */
  tone?: 'danger';
  /** 'start' — иконка и подпись у левого края: в столбце кнопок разной длины так ровнее. */
  contentAlign?: 'center' | 'start';
}

const buttonHeightBySize: Record<Size, number> = { sm: 40, md: 48, lg: 56 };
const horizontalPaddingBySize: Record<Size, number> = { sm: spacing.md, md: spacing.lg, lg: spacing.xl };

function getRestingBackgroundColor(variant: Variant, colors: ThemeColors): string {
  const backgroundColorByVariant: Record<Variant, string> = {
    primary: colors.accent,
    secondary: colors.surfaceAlt,
    danger: colors.dangerSoft,
    ghost: 'transparent',
    outline: 'transparent',
    ink: colors.onAccent,
  };
  return backgroundColorByVariant[variant];
}

function getBackgroundColor(
  variant: Variant,
  colors: ThemeColors,
  isDisabled: boolean,
  isPressed: boolean,
): string {
  // Выключенная кнопка получает свой фон, а не прозрачность: на жёлтом она давала грязный цвет.
  if (isDisabled) return variant === 'ghost' ? 'transparent' : colors.surfaceAlt;
  if (isPressed && variant === 'primary') return colors.accentPressed;
  if (isPressed && variant === 'ghost') return colors.pressed;
  return getRestingBackgroundColor(variant, colors);
}

function getLabelColor(variant: Variant, colors: ThemeColors, tone: ButtonProps['tone']): string {
  if (tone === 'danger') return colors.danger;
  const labelColorByVariant: Record<Variant, string> = {
    primary: colors.onAccent,
    danger: colors.danger,
    ghost: colors.textMuted,
    secondary: colors.text,
    outline: colors.text,
    ink: colors.accent,
  };
  return labelColorByVariant[variant];
}

/** Значок приходит готовым элементом, поэтому цвет выключенной кнопки подставляется здесь. */
function tintIcon(icon: React.ReactNode, color: string): React.ReactNode {
  if (!React.isValidElement<{ color?: string }>(icon)) return icon;
  return React.cloneElement(icon, { color });
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
  tone,
  contentAlign = 'center',
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = Boolean(disabled);
  const isBusy = Boolean(loading);
  const backgroundColor = getBackgroundColor(variant, colors, isDisabled, isPressed);
  const labelColor = isDisabled ? colors.textFaint : (textColor ?? getLabelColor(variant, colors, tone));
  const leadingIcon = isDisabled ? tintIcon(icon, labelColor) : icon;
  const endingIcon = isDisabled ? tintIcon(trailingIcon, labelColor) : trailingIcon;
  const hasOutline = variant === 'outline' && !isDisabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled || isBusy, busy: isBusy }}
      // Призрачная кнопка отвечает фоном: сжатие на прозрачной подложке не видно.
      scaleTo={variant === 'ghost' ? 1 : undefined}
      {...rest}
      disabled={isDisabled || isBusy}
      haptic={rest.haptic ?? (variant === 'primary' ? 'light' : 'none')}
      onPressIn={(event) => {
        setIsPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setIsPressed(false);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        // React Native задерживает press-out до 130 мс, а вид нажатия не должен отставать от действия.
        setIsPressed(false);
        onPress?.(event);
      }}
      style={[
        styles.button,
        {
          backgroundColor,
          height: buttonHeightBySize[size],
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: hasOutline ? colors.borderStrong : 'transparent',
          alignSelf: fullWidth ? 'stretch' : 'auto',
          paddingHorizontal: horizontalPaddingBySize[size],
          // Кнопка раскладывает содержимое столбиком, поэтому к левому краю его прижимает alignItems.
          alignItems: contentAlign === 'start' ? 'flex-start' : 'center',
        },
        style,
      ]}
    >
      {isBusy ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={styles.content}>
          {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
          {title ? (
            <Text color={labelColor} style={labelStyles[size]}>
              {title}
            </Text>
          ) : null}
          {endingIcon ? <View style={styles.icon}>{endingIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { alignItems: 'center', justifyContent: 'center' },
});

const labelStyles = StyleSheet.create({
  sm: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  md: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  lg: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
});
