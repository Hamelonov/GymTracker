import { Timer } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Input, Text, spacing } from '@/ui';
import type { PenTextState } from './usePenText';

interface PenEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  penState: PenTextState;
  onRestTimerPress: () => void;
}

/** Режим «Ручка»: поле на всю страницу, строка состояния, ошибки и кнопка таймера отдыха. */
export function PenEditor({ text, onTextChange, penState, onRestTimerPress }: PenEditorProps) {
  const { t: translate } = useTranslation();
  // Ошибки и новые упражнения: второе важно, чтобы опечатка не превратилась молча в новую запись библиотеки.
  const noticeLines = penState.lines.filter((line) => line.status !== 'matched');
  const summary = `${translate('home.exercisesCount', { count: penState.exerciseCount })} · ${translate(
    'workout.quickEntrySets',
    { count: penState.setCount },
  )}`;

  return (
    <View>
      <Input
        value={text}
        onChangeText={onTextChange}
        multiline
        autoCapitalize="sentences"
        autoCorrect={false}
        placeholder={translate('workout.penPlaceholder')}
        hint={translate('workout.penHint')}
        style={styles.input}
        textAlignVertical="top"
      />
      <Text variant="caption" color="muted" style={styles.summary}>
        {summary}
      </Text>
      {noticeLines.length > 0 ? (
        <View style={styles.errorList}>
          {noticeLines.map((line) => (
            <View key={line.lineIndex} style={styles.errorLine}>
              <Text variant="bodyMedium" color="muted" numberOfLines={1}>
                {line.title}
              </Text>
              {line.status === 'error' ? (
                <Text variant="caption" color="danger">
                  {line.errorText}
                </Text>
              ) : (
                <Text variant="caption" color="muted">
                  {translate('workout.quickEntryNewExercise')}
                </Text>
              )}
            </View>
          ))}
        </View>
      ) : null}
      <Button
        title={translate('workout.restTimer')}
        variant="secondary"
        size="lg"
        fullWidth
        icon={<Icon icon={Timer} size={20} />}
        onPress={onRestTimerPress}
        style={styles.timerButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 240 },
  summary: { marginTop: spacing.sm },
  errorList: { marginTop: spacing.md, gap: spacing.sm },
  errorLine: { gap: 2 },
  timerButton: { marginTop: spacing.lg },
});
