import { format } from 'date-fns';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, type StyleProp, type TextStyle, View } from 'react-native';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import { dateLocale } from '@/domain/dates';
import { penTimesSign } from '@/domain/pen/serializeWorkout';
import type { DistanceUnit, ExerciseType, WeightUnit } from '@/domain/types';
import { buildWeightLines, describeLogColumns, formatPerSet } from './logLines';
import { Card, Text, spacing, useColors } from '@/ui';

type Units = { weight: WeightUnit; distance: DistanceUnit };

/** Ширины колонок фиксированы: таблица шире экрана, её двигают и масштабируют на холсте. */
// Вес шире своих значений: подпись «УСЛОЖНЕНИЕ» иначе переносится на вторую строку.
const COLUMN_WIDTHS = { day: 100, weight: 92, timesSign: 14, sets: 110, rir: 80, rpe: 80, note: 180 };
const CELL_GAP = spacing.sm;
const CARD_HORIZONTAL_PADDING = spacing.md;

/** Дата цифрами в формате языка: «28.03.2026». */
function formatDay(timestamp: number, language: string): string {
  return format(timestamp, 'P', { locale: dateLocale(language) });
}

/**
 * Ширина таблицы без растяжения: сумма видимых колонок, промежутков и полей карточки.
 * Нужна холсту заранее — измерить её нельзя, вёрстка упирает ширину в ширину экрана.
 */
export function naturalLogTableWidth(entries: ExerciseHistoryEntry[], exerciseType: ExerciseType): number {
  const { hasWeight, hasRir, hasRpe } = describeLogColumns(entries, exerciseType);
  const weightLinesWidth =
    COLUMN_WIDTHS.sets + (hasWeight ? COLUMN_WIDTHS.weight + COLUMN_WIDTHS.timesSign + 2 * CELL_GAP : 0);
  const rirWidth = hasRir ? COLUMN_WIDTHS.rir + CELL_GAP : 0;
  const rpeWidth = hasRpe ? COLUMN_WIDTHS.rpe + CELL_GAP : 0;
  const cellsWidth =
    COLUMN_WIDTHS.day + CELL_GAP + weightLinesWidth + CELL_GAP + rirWidth + rpeWidth + COLUMN_WIDTHS.note;
  return cellsWidth + 2 * CARD_HORIZONTAL_PADDING;
}

interface ExerciseLogTableProps {
  entries: ExerciseHistoryEntry[];
  exerciseType: ExerciseType;
  units: Units;
  /** Общая ширина: в режиме «Все» таблицы выровнены по самой широкой, лишнее забирает колонка примечаний. */
  width: number;
}

/** Таблица прогресса по упражнению: строка на день тренировки, в вёрстке блока «Сегодня сделано». */
export function ExerciseLogTable({ entries, exerciseType, units, width }: ExerciseLogTableProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const penOptions = { weightUnit: units.weight, distanceUnit: units.distance, language: i18n.language };
  const timesSign = penTimesSign(i18n.language);
  const { hasWeight, hasRir, hasRpe, weightTitleKey } = describeLogColumns(entries, exerciseType);
  const weightTitle = translate(weightTitleKey);
  const dividerStyle = { borderTopColor: colors.border };

  return (
    <Card raised style={[styles.card, { width }]}>
      <View style={[styles.row, styles.headerRow]}>
        <HeaderCell title={translate('log.columnDay')} style={{ width: COLUMN_WIDTHS.day }} />
        {hasWeight ? (
          <>
            <HeaderCell title={weightTitle} style={styles.weightColumn} />
            <View style={{ width: COLUMN_WIDTHS.timesSign }} />
          </>
        ) : null}
        <HeaderCell title={translate('log.columnSets')} style={{ width: COLUMN_WIDTHS.sets }} />
        {hasRir ? <HeaderCell title={translate('workout.rir')} style={{ width: COLUMN_WIDTHS.rir }} /> : null}
        {hasRpe ? <HeaderCell title={translate('workout.rpe')} style={{ width: COLUMN_WIDTHS.rpe }} /> : null}
        <HeaderCell title={translate('log.columnNote')} style={styles.noteColumn} />
      </View>

      {entries.map((entry) => (
        <View key={entry.workoutId} style={[styles.row, styles.dayRow, dividerStyle]}>
          <Text variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.day }}>
            {formatDay(entry.startedAt, i18n.language)}
          </Text>
          <View style={styles.weightLines}>
            {buildWeightLines(entry.sets, exerciseType, penOptions).map((line, lineIndex) => (
              <View key={lineIndex} style={styles.row}>
                {hasWeight ? (
                  <>
                    <Text variant="bodyMedium" tabular style={styles.weightColumn}>
                      {line.weight ?? ''}
                    </Text>
                    <Text variant="bodyMedium" color="muted" style={styles.timesSignColumn}>
                      {line.weight != null ? timesSign : ''}
                    </Text>
                  </>
                ) : null}
                <Text variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.sets }}>
                  {line.sets}
                </Text>
              </View>
            ))}
          </View>
          {hasRir ? (
            <Text variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.rir }}>
              {formatPerSet(entry.sets, (set) => set.rir)}
            </Text>
          ) : null}
          {hasRpe ? (
            <Text variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.rpe }}>
              {formatPerSet(entry.sets, (set) => set.rpe)}
            </Text>
          ) : null}
          <Text variant="bodyMedium" color={entry.note ? 'text' : 'faint'} style={styles.noteColumn}>
            {entry.note || '—'}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function HeaderCell({ title, style }: { title: string; style: StyleProp<TextStyle> }) {
  return (
    <Text variant="label" color="muted" style={style}>
      {title.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: CARD_HORIZONTAL_PADDING, paddingTop: spacing.lg, paddingBottom: 0 },
  headerRow: { paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: CELL_GAP },
  dayRow: { paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  weightLines: { gap: spacing.xs },
  // Подпись и значения веса прижаты вправо, ближе к знаку «х».
  weightColumn: { width: COLUMN_WIDTHS.weight, textAlign: 'right' },
  timesSignColumn: { width: COLUMN_WIDTHS.timesSign, textAlign: 'center' },
  noteColumn: { flex: 1, minWidth: COLUMN_WIDTHS.note },
});
