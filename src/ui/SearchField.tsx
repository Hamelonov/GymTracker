import { Search, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { FastPressable } from './FastPressable';
import { Icon } from './Icon';
import { useColors } from './ThemeProvider';
import { fonts, layout, radius, spacing } from './tokens';

export interface SearchFieldProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}

/** Поле поиска со значком и кнопкой очистки, которая появляется вместе с текстом. */
export function SearchField({ value, onChangeText, style, ...rest }: SearchFieldProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  return (
    <View style={[styles.field, { backgroundColor: colors.inputBackground }, style]}>
      <Icon icon={Search} size={20} color="faint" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        cursorColor={colors.text}
        autoCorrect={false}
        returnKeyType="search"
        {...rest}
        style={[styles.textInput, { color: colors.text }]}
      />
      {value ? (
        <FastPressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={translate('common.close')}
          style={styles.clearButton}
        >
          <Icon icon={X} size={20} color="muted" />
        </FastPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: layout.touchTarget,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
  },
  textInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    paddingVertical: 0,
    paddingRight: spacing.md,
  },
  clearButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
