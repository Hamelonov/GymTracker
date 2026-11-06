import { Search, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable as NativePressable, StyleSheet, TextInput, View } from 'react-native';
import { Icon, fonts, radius, spacing, useColors } from '@/ui';

interface ExerciseSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function ExerciseSearchBox({ value, onChange }: ExerciseSearchBoxProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  return (
    <View style={[styles.box, { backgroundColor: colors.inputBackground }]}>
      <Icon icon={Search} size={18} color="faint" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={translate('exercise.searchPlaceholder')}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        style={[styles.input, { color: colors.text }]}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value ? (
        <NativePressable onPress={() => onChange('')} hitSlop={10}>
          <Icon icon={X} size={18} color="muted" />
        </NativePressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 46,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, paddingVertical: 0 },
});
