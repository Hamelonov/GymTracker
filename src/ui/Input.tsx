import React from 'react';
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
import { fonts, radius, spacing } from './tokens';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  right?: React.ReactNode;
}

export function Input({ label, hint, error, containerStyle, right, style, multiline, ...rest }: InputProps) {
  const colors = useColors();
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
          { backgroundColor: colors.inputBackground, borderColor: error ? colors.danger : 'transparent' },
          multiline ? styles.fieldMultiline : null,
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.accent}
          cursorColor={colors.text}
          multiline={multiline}
          {...rest}
          style={[
            styles.textInput,
            { color: colors.text },
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
  label: { marginBottom: spacing.sm, marginLeft: 2 },
  field: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldMultiline: { minHeight: 96, alignItems: 'flex-start', paddingVertical: spacing.md },
  textInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, paddingVertical: 0, minHeight: 50 },
  textInputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  footnote: { marginTop: spacing.sm, marginLeft: 2 },
});
