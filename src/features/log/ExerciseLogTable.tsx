import { format } from 'date-fns';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, type StyleProp, type TextStyle, View } from 'react-native';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import { dateLocale } from '@/domain/dates';
import { penTimesSign } from '@/domain/pen/serializeWorkout';
import type { DistanceUnit, ExerciseType, WeightUnit } from '@/domain/types';
import { buildWeightLines, describeLogColumns, formatPerSet } from './logLines';
import { PenLine } from '@/features/pen/PenTable';
import { Text, spacing, useColors } from '@/ui';

type Units = { weight: WeightUnit; distance: DistanceUnit };

/** Ширины колонок фиксированы: таблица шире экрана, её двигают и масштабируют на холсте. */
const COLUMN_WIDTHS = { day: 100, weight: 64, timesSign: 14, sets: 110, rir: 80, rpe: 80, note: 180 };
// Между столбцами зазор шире, чтобы их было легче различать; внутри «вес х подходы» — уже, это одна фраза.
const COLUMN_GAP = spacing.lg;
const INNER_GAP = spacing.sm;
const DIVIDER_WIDTH = StyleSheet.hairlineWidth;
// Поля таблицы равны полям экрана: её края стоят на одной линии с заголовком.
const TABLE_HORIZONTAL_PADDING = spacing.lg;
const WEIGHT_GROUP_WIDTH =
  COLUMN_WIDTHS.weight + COLUMN_WIDTHS.timesSign + COLUMN_WIDTHS.sets + 2 * INNER_GAP;

/** Дата цифрами в формате языка: «28.03.2026». */
function formatDay(timestamp: number, language: string): string {
  return format(timestamp, 'P', { locale: dateLocale(language) });
}

/**
 * Ширина таблицы без растяжения: сумма видимых колонок, промежутков и полей таблицы.
 * Нужна холсту заранее — измерить её нельзя, вёрстка упирает ширину в ширину экрана.
 */
export function naturalLogTableWidth(entries: ExerciseHistoryEntry[], exerciseType: ExerciseType): number {
  const { hasWeight, hasRir, hasRpe } = describeLogColumns(entries);
  // День, «вес х подходы» (или один «подходы») и примечание есть всегда; RIR и RPE — не всегда.
  const groupWidth = hasWeight ? WEIGHT_GROUP_WIDTH : COLUMN_WIDTHS.sets;
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
function joinWithDividers(cells: (React.ReactNode | null)[], keyPrefix: string): React.ReactNode[] {
  return cells
    .filter((cell): cell is React.ReactNode => cell != null)
    .flatMap((cell, index) =>
      index === 0 ? [cell] : [<ColumnDivider key={`${keyPrefix}-divider-${index}`} />, cell],
    );
}

function ColumnDivider() {
  const colors = useColors();
  return <View style={[styles.columnDivider, { backgroundColor: colors.border }]} />;
}

/** Таблица прогресса по упражнению: строка на день тренировки, в вёрстке блока «Сегодня сделано». */
export function ExerciseLogTable({ entries, exerciseType, units, width }: ExerciseLogTableProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const penOptions = { weightUnit: units.weight, distanceUnit: units.distance, language: i18n.language };
  const timesSign = penTimesSign(i18n.language);
  const { hasWeight, hasRir, hasRpe } = describeLogColumns(entries);
  const weightGroupWidth = hasWeight ? WEIGHT_GROUP_WIDTH : COLUMN_WIDTHS.sets;
  const dividerStyle = { borderTopColor: colors.border };

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
    <View style={[styles.table, { backgroundColor: colors.background, width }]}>
      <View style={[styles.outerRow, styles.headerRow]}>{joinWithDividers(headerCells, 'header')}</View>

      {entries.map((entry) => {
        const dayCells = [
          <Text key="day" variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.day }}>
            {formatDay(entry.startedAt, i18n.language)}
          </Text>,
          <View key="weight-group" style={[styles.weightLines, { width: weightGroupWidth }]}>
            {buildWeightLines(entry.sets, exerciseType, penOptions).map((line, lineIndex) => (
              <PenLine
                key={lineIndex}
                weight={line.weight}
                values={line.sets}
                timesSign={timesSign}
                hasWeightColumn={hasWeight}
                weightWidth={COLUMN_WIDTHS.weight}
              />
            ))}
          </View>,
          hasRir ? (
            <Text key="rir" variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.rir }}>
              {formatPerSet(entry.sets, (set) => set.rir)}
            </Text>
          ) : null,
          hasRpe ? (
            <Text key="rpe" variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.rpe }}>
              {formatPerSet(entry.sets, (set) => set.rpe)}
            </Text>
          ) : null,
          <Text
            key="note"
            variant="bodyMedium"
            color={entry.note ? 'text' : 'faint'}
            style={styles.noteColumn}
          >
            {entry.note || '—'}
          </Text>,
        ];
        return (
          <View key={entry.workoutId} style={[styles.outerRow, styles.dayRow, dividerStyle]}>
            {joinWithDividers(dayCells, entry.workoutId)}
          </View>
        );
      })}
    </View>
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
  table: { paddingHorizontal: TABLE_HORIZONTAL_PADDING, paddingTop: spacing.md },
  headerRow: { paddingBottom: spacing.md },
  // Между столбцами таблицы — широкий зазор с линией-разделителем между ними.
  outerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: COLUMN_GAP },
  // Внутри «вес х подходы» зазор у́же: это одна фраза, а не два разных столбца.
  innerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: INNER_GAP },
  dayRow: { paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  weightLines: { gap: spacing.xs },
  columnDivider: { width: DIVIDER_WIDTH, alignSelf: 'stretch' },
  // Подпись и значения веса прижаты вправо, ближе к знаку «х».
  weightColumn: { width: COLUMN_WIDTHS.weight, textAlign: 'right' },
  noteColumn: { flex: 1, minWidth: COLUMN_WIDTHS.note },
});
