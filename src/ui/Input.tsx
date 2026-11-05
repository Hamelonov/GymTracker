import React, { useState } from 'react';
import {
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { fonts, radius, spacing, type ThemeColors } from './tokens';

type InputSize = 'md' | 'lg' | 'xl';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  right?: React.ReactNode;
  /** 'lg' и 'xl' для чисел: крупные цифры одной ширины. */
  size?: InputSize;
}

const fieldHeightBySize: Record<InputSize, number> = { md: 52, lg: 56, xl: 64 };
const FIELD_BORDER_WIDTH = 1.5;

function getBorderColor(hasError: boolean, isFocused: boolean, colors: ThemeColors): string {
  if (hasError) return colors.danger;
  if (isFocused) return colors.text;
  return 'transparent';
}

export function Input({
  label,
  hint,
  error,
  containerStyle,
  right,
  size = 'md',
  style,
  multiline,
  editable,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const fieldHeight = fieldHeightBySize[size];
  const isDisabled = editable === false;
  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="label" color="muted" style={styles.label}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.inputBackground,
            // Рамка есть всегда и меняет только цвет, иначе фокус сдвигал бы раскладку.
            borderColor: getBorderColor(Boolean(error), isFocused, colors),
            minHeight: fieldHeight,
          },
          multiline ? styles.fieldMultiline : null,
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.accent}
          cursorColor={colors.text}
          multiline={multiline}
          editable={editable}
          {...rest}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.textInput,
            sizeStyles[size],
            {
              color: isDisabled ? colors.textFaint : colors.text,
              minHeight: fieldHeight - 2 * FIELD_BORDER_WIDTH,
            },
            multiline ? styles.textInputMultiline : null,
            style,
          ]}
        />
        {right}
      </View>
      <InputFootnote error={error} hint={hint} />
    </View>
  );
}

/** Строка под полем: ошибка приоритетнее подсказки. */
function InputFootnote({ error, hint }: { error?: string; hint?: string }) {
  if (error) {
    return (
      <Text variant="caption" color="danger" style={styles.footnote}>
        {error}
      </Text>
    );
  }
  if (hint) {
    return (
      <Text variant="caption" color="faint" style={styles.footnote}>
        {hint}
      </Text>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm },
  field: {
    borderRadius: radius.md,
    borderWidth: FIELD_BORDER_WIDTH,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldMultiline: { minHeight: 96, alignItems: 'flex-start', paddingVertical: spacing.md },
  textInput: { flex: 1, paddingVertical: 0 },
  textInputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  footnote: { marginTop: spacing.sm },
});

const sizeStyles = StyleSheet.create({
  md: { fontFamily: fonts.medium, fontSize: 16 },
  lg: { fontFamily: fonts.bold, fontSize: 24, fontVariant: ['tabular-nums'] },
  xl: { fontFamily: fonts.bold, fontSize: 32, fontVariant: ['tabular-nums'] },
});
