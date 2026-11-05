import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text, fonts, spacing, typeScale, useColors } from '@/ui';
import type { PenLine, PenTextState } from './usePenText';

interface PenEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  penState: PenTextState;
}

const PEN_LINE_HEIGHT = typeScale.pen.lineHeight;
const PEN_MIN_LINE_COUNT = 10;
const PEN_SHEET_MIN_HEIGHT = 280;
// Текст начинается чуть ниже: тогда первая линия ложится на шаг сетки от линии панели над листом.
const PEN_TEXT_TOP_PADDING = 3;
// Линия идёт под первой строкой текста. Значение подбирается на телефоне.
const PEN_FIRST_LINE_OFFSET = PEN_LINE_HEIGHT;

/** Линии листа. Под полем, а не в нём: у `TextInput` нет своей разлиновки. */
function PenSheetRules({ contentHeight }: { contentHeight: number }) {
  const colors = useColors();
  const lineCount = Math.max(PEN_MIN_LINE_COUNT, Math.ceil(contentHeight / PEN_LINE_HEIGHT));
  return Array.from({ length: lineCount }, (_, lineIndex) => (
    <View
      key={lineIndex}
      style={[
        styles.rule,
        { top: PEN_FIRST_LINE_OFFSET + lineIndex * PEN_LINE_HEIGHT, backgroundColor: colors.border },
      ]}
    />
  ));
}

/** Замечание к строке: ошибка разбора или новое упражнение, о котором лучше знать заранее. */
function PenNotice({ line }: { line: PenLine }) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const isError = line.status === 'error';
  return (
    <View style={styles.notice}>
      <View style={[styles.noticeMark, { backgroundColor: isError ? colors.danger : colors.borderStrong }]} />
      <View style={styles.noticeText}>
        <Text variant="bodyMedium" color="muted" numberOfLines={1}>
          {line.title}
        </Text>
        <Text variant="caption" color={isError ? 'danger' : 'muted'}>
          {isError ? line.errorText : translate('workout.quickEntryNewExercise')}
        </Text>
      </View>
    </View>
  );
}

/** Режим «Ручка»: страница в линейку, замечания к строкам и подсказка. */
export function PenEditor({ text, onTextChange, penState }: PenEditorProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const [contentHeight, setContentHeight] = useState(0);
  // Ошибки и новые упражнения: второе важно, чтобы опечатка не превратилась молча в новую запись библиотеки.
  const noticeLines = penState.lines.filter((line) => line.status !== 'matched');

  return (
    <View>
      <View style={styles.sheet}>
        <PenSheetRules contentHeight={contentHeight} />
        <TextInput
          value={text}
          onChangeText={onTextChange}
          onContentSizeChange={(event) => setContentHeight(event.nativeEvent.contentSize.height)}
          multiline
          scrollEnabled={false}
          autoCapitalize="sentences"
          autoCorrect={false}
          placeholder={translate('workout.penPlaceholder')}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.accent}
          cursorColor={colors.text}
          // Системное увеличение шрифта разъединило бы строки и линии.
          maxFontSizeMultiplier={1}
          textAlignVertical="top"
          style={[styles.input, { color: colors.text }]}
        />
      </View>
      {noticeLines.length > 0 ? (
        <View style={styles.noticeList}>
          {noticeLines.map((line) => (
            <PenNotice key={line.lineIndex} line={line} />
          ))}
        </View>
      ) : null}
      <Text variant="caption" color="muted" style={styles.hint}>
        {translate('workout.penHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { minHeight: PEN_SHEET_MIN_HEIGHT },
  rule: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  input: {
    minHeight: PEN_SHEET_MIN_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingTop: PEN_TEXT_TOP_PADDING,
    paddingBottom: 0,
    fontFamily: fonts.regular,
    fontSize: typeScale.pen.fontSize,
    lineHeight: PEN_LINE_HEIGHT,
  },
  noticeList: { marginTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.sm },
  notice: { flexDirection: 'row', gap: spacing.md },
  noticeMark: { width: 3, borderRadius: 2 },
  noticeText: { flex: 1, gap: spacing.xxs },
  hint: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
});
