import { format } from 'date-fns';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, type StyleProp, type TextStyle, View } from 'react-native';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import { getTimesSign } from '@/domain/setFormatting';
import type { DistanceUnit, ExerciseType, WeightUnit } from '@/domain/types';
import { useSettings } from '@/store/settings';
import { buildWeightLines, describeLogColumns, formatPerSet } from './logLines';
import { getLogTableColors } from './tableColors';
import { Card, Text, spacing, useColors } from '@/ui';

type Units = { weight: WeightUnit; distance: DistanceUnit };

/** Ширины колонок фиксированы: таблица шире экрана, её двигают и масштабируют на холсте. */
const COLUMN_WIDTHS = { day: 100, weight: 64, timesSign: 14, sets: 110, rir: 80, rpe: 80, note: 320 };
// Между столбцами зазор шире, чтобы их было легче различать; внутри «вес х подходы» — уже, это одна фраза.
const COLUMN_GAP = spacing.lg;
const INNER_GAP = spacing.sm;
const DIVIDER_WIDTH = StyleSheet.hairlineWidth;
const TABLE_HORIZONTAL_PADDING = spacing.md;

/** Дата цифрами через точки: «28.03.2026». */
function formatDay(timestamp: number): string {
  return format(timestamp, 'dd.MM.yyyy');
}

/**
 * Ширина таблицы без растяжения: сумма видимых колонок, промежутков и полей строки.
 * Нужна холсту заранее — измерить её нельзя, вёрстка упирает ширину в ширину экрана.
 */
export function naturalLogTableWidth(entries: ExerciseHistoryEntry[], exerciseType: ExerciseType): number {
  const { hasWeight, hasRir, hasRpe } = describeLogColumns(entries);
  // День, «вес х подходы» (или один «подходы») и примечание есть всегда; RIR и RPE — не всегда.
  const groupWidth = hasWeight
    ? COLUMN_WIDTHS.weight + COLUMN_WIDTHS.timesSign + COLUMN_WIDTHS.sets + 2 * INNER_GAP
    : COLUMN_WIDTHS.sets;
  const columnCount = 3 + (hasRir ? 1 : 0) + (hasRpe ? 1 : 0);
  const dividersWidth = (columnCount - 1) * (2 * COLUMN_GAP + DIVIDER_WIDTH);
  const cellsWidth =
    COLUMN_WIDTHS.day +
    groupWidth +
    (hasRir ? COLUMN_WIDTHS.rir : 0) +
    (hasRpe ? COLUMN_WIDTHS.rpe : 0) +
    COLUMN_WIDTHS.note +
    dividersWidth;
  return cellsWidth + 2 * TABLE_HORIZONTAL_PADDING;
}

interface ExerciseLogTableProps {
  entries: ExerciseHistoryEntry[];
  exerciseType: ExerciseType;
  units: Units;
  /** Общая ширина: в режиме «Все» таблицы выровнены по самой широкой, лишнее забирает колонка примечаний. */
  width: number;
}

/** Вставляет тонкую линию между соседними столбцами, не трогая первый. */
function joinWithDividers(
  cells: (React.ReactNode | null)[],
  keyPrefix: string,
  dividerColor: string,
): React.ReactNode[] {
  return cells
    .filter((cell): cell is React.ReactNode => cell != null)
    .flatMap((cell, index) =>
      index === 0
        ? [cell]
        : [
            <View
              key={`${keyPrefix}-divider-${index}`}
              style={[styles.columnDivider, { backgroundColor: dividerColor }]}
            />,
            cell,
          ],
    );
}

/** Таблица прогресса по упражнению: заголовок одного цвета и строки на дни тренировок двух чередующихся цветов. */
export function ExerciseLogTable({ entries, exerciseType, units, width }: ExerciseLogTableProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const tableColors = getLogTableColors(colors);
  const setSeparator = useSettings((state) => state.setSeparator);
  const formatOptions = {
    weightUnit: units.weight,
    distanceUnit: units.distance,
    language: i18n.language,
    setSeparator,
  };
  const timesSign = getTimesSign(i18n.language);
  const { hasWeight, hasRir, hasRpe } = describeLogColumns(entries);

  const headerCells = [
    <HeaderCell key="day" title={translate('log.columnDay')} style={{ width: COLUMN_WIDTHS.day }} />,
    hasWeight ? (
      <View key="weight-group" style={styles.innerRow}>
        <HeaderCell title={translate('log.columnWeight')} style={styles.weightColumn} />
        <View style={{ width: COLUMN_WIDTHS.timesSign }} />
        <HeaderCell title={translate('log.columnSets')} style={{ width: COLUMN_WIDTHS.sets }} />
      </View>
    ) : (
      <HeaderCell key="sets" title={translate('log.columnSets')} style={{ width: COLUMN_WIDTHS.sets }} />
    ),
    hasRir ? (
      <HeaderCell key="rir" title={translate('workout.rir')} style={{ width: COLUMN_WIDTHS.rir }} />
    ) : null,
    hasRpe ? (
      <HeaderCell key="rpe" title={translate('workout.rpe')} style={{ width: COLUMN_WIDTHS.rpe }} />
    ) : null,
    <HeaderCell key="note" title={translate('log.columnNote')} style={styles.noteColumn} />,
  ];

  return (
    <Card raised padded={false} style={[styles.tableCard, { width, borderColor: tableColors.border }]}>
      <View style={[styles.outerRow, styles.headerRow, { backgroundColor: tableColors.headerBackground }]}>
        {joinWithDividers(headerCells, 'header', tableColors.headerDivider)}
      </View>

      {entries.map((entry, entryIndex) => {
        const dayCells = [
          <Text key="day" variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.day }}>
            {formatDay(entry.startedAt)}
          </Text>,
          <View key="weight-group" style={styles.weightLines}>
            {buildWeightLines(entry.sets, exerciseType, formatOptions).map((line, lineIndex) => (
              <View key={lineIndex} style={styles.innerRow}>
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
          </View>,
          hasRir ? (
            <Text key="rir" variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.rir }}>
              {formatPerSet(entry.sets, (set) => set.rir, setSeparator)}
            </Text>
          ) : null,
          hasRpe ? (
            <Text key="rpe" variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.rpe }}>
              {formatPerSet(entry.sets, (set) => set.rpe, setSeparator)}
            </Text>
          ) : null,
          // Без записи пишем курсивом «отсутствует», а не длинное тире: так видно, что примечания нет, а не потерялось.
          <Text
            key="note"
            variant="bodyMedium"
            color={entry.note ? 'text' : 'faint'}
            style={[styles.noteColumn, entry.note ? null : styles.emptyNote]}
          >
            {entry.note || translate('log.noNote')}
          </Text>,
        ];
        const rowBackground =
          entryIndex % 2 === 0 ? tableColors.firstRowBackground : tableColors.secondRowBackground;
        return (
          <View
            key={entry.workoutId}
            style={[
              styles.outerRow,
              styles.dayRow,
              { backgroundColor: rowBackground, borderTopColor: tableColors.border },
            ]}
          >
            {joinWithDividers(dayCells, entry.workoutId, tableColors.border)}
          </View>
        );
      })}
    </Card>
  );
}

/** Подпись столбца на жёлтом заголовке: цвет текста подобран под акцентный фон. */
function HeaderCell({ title, style }: { title: string; style: StyleProp<TextStyle> }) {
  return (
    <Text variant="label" color="onAccent" style={style}>
      {title.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Углы таблицы прямые: у карточки по умолчанию скругление, а для таблицы оно не нужно.
  tableCard: { borderRadius: 0 },
  // Между столбцами таблицы — широкий зазор с линией-разделителем между ними.
  outerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: COLUMN_GAP },
  // Внутри «вес х подходы» зазор у́же: это одна фраза, а не два разных столбца.
  innerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: INNER_GAP },
  // Фон рядов тянется от края до края карточки, поэтому поля заданы у самих рядов, а не у карточки.
  headerRow: { paddingHorizontal: TABLE_HORIZONTAL_PADDING, paddingVertical: spacing.md },
  dayRow: {
    paddingHorizontal: TABLE_HORIZONTAL_PADDING,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  weightLines: { gap: spacing.xs },
  columnDivider: { width: DIVIDER_WIDTH, alignSelf: 'stretch' },
  // Подпись и значения веса прижаты вправо, ближе к знаку «х».
  weightColumn: { width: COLUMN_WIDTHS.weight, textAlign: 'right' },
  timesSignColumn: { width: COLUMN_WIDTHS.timesSign, textAlign: 'center' },
  noteColumn: { flex: 1, minWidth: COLUMN_WIDTHS.note },
  emptyNote: { fontStyle: 'italic' },
});
