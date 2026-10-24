import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, spacing } from '@/ui';
import { SUMMARY_MUTED_TEXT_COLOR } from './SummaryBlockHeader';

interface SummaryTableHeaderProps {
  exerciseTitle: string;
  /** null, если ни у одного упражнения в таблице нет веса: тогда колонки веса нет совсем. */
  weightTitle: string | null;
  valuesTitle: string;
}

/** Строка подписей над колонками «Упражнение», «Вес» и значениями; общая для таблиц на экране итогов. */
export function SummaryTableHeader({ exerciseTitle, weightTitle, valuesTitle }: SummaryTableHeaderProps) {
  return (
    <View style={summaryTableStyles.headerRow}>
      <Text variant="label" color={SUMMARY_MUTED_TEXT_COLOR} style={summaryTableStyles.nameColumn}>
        {exerciseTitle.toUpperCase()}
      </Text>
      <View style={summaryTableStyles.valuesColumn}>
        <View style={summaryTableStyles.headerRow}>
          {weightTitle != null ? (
            <>
              <Text variant="label" color={SUMMARY_MUTED_TEXT_COLOR} style={summaryTableStyles.weightColumn}>
                {weightTitle.toUpperCase()}
              </Text>
              <View style={summaryTableStyles.timesSignColumn} />
            </>
          ) : null}
          <Text variant="label" color={SUMMARY_MUTED_TEXT_COLOR} style={summaryTableStyles.repsColumn}>
            {valuesTitle.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Одинаковые ширины колонок, чтобы таблицы «Новые рекорды» и «Сегодня сделано» совпадали по вёрстке.
export const summaryTableStyles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  nameColumn: { width: '30%' },
  valuesColumn: { flex: 1, gap: spacing.xs },
  valueLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  weightColumn: { width: 72, textAlign: 'right' },
  timesSignColumn: { width: 14, textAlign: 'center' },
  repsColumn: { flex: 1 },
});
