import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { formatMonthYear } from '@/domain/dates';
import { Text, spacing, useColors } from '@/ui';

const MONTH_ROW_HEIGHT = 40;

interface HistoryMonthRowProps {
  monthStart: number;
  workoutCount: number;
}

/** Липкая строка месяца: фон непрозрачный, иначе строки тренировок просвечивают при прокрутке. */
function HistoryMonthRowComponent({ monthStart, workoutCount }: HistoryMonthRowProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();

  return (
    <View style={[styles.row, { backgroundColor: colors.background }]}>
      <Text variant="label" color="muted">
        {formatMonthYear(monthStart, i18n.language).toUpperCase()}
      </Text>
      <Text variant="caption" color="muted">
        {translate('history.workoutsInMonth', { count: workoutCount })}
      </Text>
    </View>
  );
}

export const HistoryMonthRow = memo(HistoryMonthRowComponent);

const styles = StyleSheet.create({
  row: {
    height: MONTH_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
});
