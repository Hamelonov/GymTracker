import React from 'react';
import { type StyleProp, StyleSheet, TextInput, type TextInputProps, View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { fonts, radius, spacing } from './tokens';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  right?: React.ReactNode;
}

export function Input({ label, hint, error, containerStyle, right, style, multiline, ...rest }: InputProps) {
  const c = useColors();
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
          { backgroundColor: c.inputBg, borderColor: error ? c.danger : 'transparent' },
          multiline ? styles.multiline : null,
        ]}
      >
        <TextInput
          placeholderTextColor={c.textFaint}
          selectionColor={c.accent}
          cursorColor={c.text}
          multiline={multiline}
          {...rest}
          style={[styles.input, { color: c.text }, multiline ? styles.inputMultiline : null, style]}
        />
        {right}
      </View>
      {error ? (
        <Text variant="caption" color="danger" style={styles.hint}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="faint" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm, marginLeft: 2 },
  field: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiline: { minHeight: 96, alignItems: 'flex-start', paddingVertical: spacing.md },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, paddingVertical: 0, minHeight: 50 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  hint: { marginTop: spacing.sm, marginLeft: 2 },
});
