import React, { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { fonts, layout, radius, typeScale, useColors } from '@/ui';
import { NARROW_COLUMN_FLEX } from './setRowLayout';

interface SetNumberFieldProps {
  value: number | null;
  onCommit: (value: number | null) => void;
  placeholder: string;
  parse: (text: string) => number | null;
  format: (value: number | null) => string;
  isEditable: boolean;
  /** Поле лежит на полосе маркера выполненного подхода. */
  isCompleted: boolean;
  /** Узкая колонка для RIR и RPE, чтобы основные значения не теснились. */
  isNarrow?: boolean;
  /** Мелкий шрифт: плотный режим, а ещё время и дистанция, которые иначе не влезли бы. */
  isDense?: boolean;
}

// Поле задано по ширине: без предела системный шрифт обрежет значение.
const FIELD_MAX_FONT_SCALE = 1.2;

/** Поле значения подхода: хранит вводимый текст у себя, поэтому ввод не зависит от округления в хранилище. */
export function SetNumberField({
  value,
  onCommit,
  placeholder,
  parse,
  format,
  isEditable,
  isCompleted,
  isNarrow,
  isDense,
}: SetNumberFieldProps) {
  const colors = useColors();
  const [text, setText] = useState(() => format(value));
  const [isFocused, setIsFocused] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);
  // Подхватываем изменения значений, сделанные в другом месте, но никогда не затираем то, что пользователь сейчас вводит.
  if (value !== previousValue) {
    setPreviousValue(value);
    if (!isFocused) setText(format(value));
  }
  return (
    <TextInput
      value={text}
      editable={isEditable}
      onChangeText={(newText) => {
        setText(newText);
        onCommit(parse(newText));
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setText(format(value));
      }}
      placeholder={placeholder}
      // На полосе маркера бледный цвет не проходит по контрасту.
      placeholderTextColor={isCompleted ? colors.textMuted : colors.textFaint}
      keyboardType="decimal-pad"
      selectTextOnFocus
      selectionColor={colors.accent}
      cursorColor={colors.text}
      maxFontSizeMultiplier={FIELD_MAX_FONT_SCALE}
      style={[
        styles.field,
        isNarrow ? styles.narrowField : null,
        isDense ? styles.denseField : null,
        { color: colors.text, backgroundColor: isCompleted ? 'transparent' : colors.inputBackground },
        isFocused ? { borderColor: colors.text } : null,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    height: layout.setCellHeight,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: typeScale.setValue.fontSize,
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  narrowField: { flex: NARROW_COLUMN_FLEX },
  denseField: { fontSize: typeScale.setValueDense.fontSize },
});
