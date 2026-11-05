import { Timer } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, layout, spacing, useColors } from '@/ui';
import type { PenTextState } from './usePenText';

interface PenToolbarProps {
  penState: PenTextState;
  onRestTimerPress: () => void;
}

/** Панель над листом «Ручки»: сводка и таймер. Вне прокрутки, чтобы клавиатура не прятала кнопку. */
export function PenToolbar({ penState, onRestTimerPress }: PenToolbarProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const summary = `${translate('home.exercisesCount', { count: penState.exerciseCount })} · ${translate(
    'workout.quickEntrySets',
    { count: penState.setCount },
  )}`;

  return (
    <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
      <Text variant="caption" color="muted" numberOfLines={1} tabular style={styles.summary}>
        {summary}
      </Text>
      <Button
        title={translate('workout.restTimer')}
        variant="secondary"
        size="sm"
        icon={<Icon icon={Timer} size={16} />}
        onPress={onRestTimerPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.rowMinHeight,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summary: { flex: 1 },
});
