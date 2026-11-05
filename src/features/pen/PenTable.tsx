import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, spacing, useColors, type ThemeColors } from '@/ui';

/** `paper` это белая карточка на жёлтом экране итогов, цвета у неё не зависят от темы. */
export type PenTone = 'theme' | 'paper';

const NAME_COLUMN_WIDTH = '36%';
const WEIGHT_COLUMN_WIDTH = 72;
const TIMES_SIGN_COLUMN_WIDTH = 14;
const COLUMN_DIVIDER_GAP = spacing.md;

interface PenPalette {
  ink: string;
  muted: string;
  border: string;
}

function getPalette(colors: ThemeColors, tone: PenTone): PenPalette {
  if (tone === 'paper') return { ink: colors.black, muted: colors.paperMuted, border: colors.paperBorder };
  return { ink: colors.text, muted: colors.textMuted, border: colors.border };
}

/** Тонкая вертикаль между названием упражнения и его записью, как в журнале. */
function ColumnDivider({ color }: { color: string }) {
  return <View style={[styles.columnDivider, { backgroundColor: color }]} />;
}

export interface PenTableHeaderProps {
  nameTitle?: string;
  /** null, если ни у одного упражнения в таблице нет веса: тогда колонки веса нет совсем. */
  weightTitle: string | null;
  valuesTitle: string;
  tone?: PenTone;
}

/** Строка подписей над колонками таблицы записи ручкой. */
export function PenTableHeader({ nameTitle, weightTitle, valuesTitle, tone = 'theme' }: PenTableHeaderProps) {
  const colors = useColors();
  const palette = getPalette(colors, tone);
  const hasNameColumn = nameTitle != null;

  return (
    <View style={styles.headerRow}>
      {hasNameColumn ? (
        <>
          <View style={styles.nameColumn}>
            <Text variant="label" color={palette.muted}>
              {nameTitle.toUpperCase()}
            </Text>
          </View>
          <ColumnDivider color={palette.border} />
        </>
      ) : null}
      <View style={styles.headerValues}>
        {weightTitle != null ? (
          <>
            <Text variant="label" color={palette.muted} style={styles.weightHeader}>
              {weightTitle.toUpperCase()}
            </Text>
            <View style={styles.timesSignColumn} />
          </>
        ) : null}
        <Text variant="label" color={palette.muted} style={styles.valuesHeader}>
          {valuesTitle.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

export interface PenLineProps {
  /** «70кг» или null у упражнения без веса. */
  weight: string | null;
  values: string;
  timesSign: string;
  hasWeightColumn: boolean;
  tone?: PenTone;
  weightWidth?: number;
  /** Мелкая строка под весом, например прошлый рекорд с прибавкой. */
  weightExtra?: React.ReactNode;
  /** Мелкая строка под значениями. */
  valuesExtra?: React.ReactNode;
}

/** Одна строка записи: вес прижат вправо, приглушённая «х», значения. */
export function PenLine({
  weight,
  values,
  timesSign,
  hasWeightColumn,
  tone = 'theme',
  weightWidth = WEIGHT_COLUMN_WIDTH,
  weightExtra,
  valuesExtra,
}: PenLineProps) {
  const colors = useColors();
  const palette = getPalette(colors, tone);

  return (
    <View style={styles.line}>
      {hasWeightColumn ? (
        <>
          <View style={[styles.weightCell, { width: weightWidth }]}>
            {weight != null ? (
              <Text variant="bodyMedium" color={palette.ink} tabular>
                {weight}
              </Text>
            ) : null}
            {weightExtra}
          </View>
          <Text variant="bodyMedium" color={palette.muted} style={styles.timesSignColumn}>
            {weight != null ? timesSign : ''}
          </Text>
        </>
      ) : null}
      <View style={styles.valuesCell}>
        <Text variant="bodyMedium" color={palette.ink} tabular>
          {values}
        </Text>
        {valuesExtra}
      </View>
    </View>
  );
}

export interface PenTableRowProps {
  name?: string;
  /** Строки `PenLine` одного упражнения. */
  children: React.ReactNode;
  /** У первой строки без шапки линии сверху нет. */
  isFirst?: boolean;
  tone?: PenTone;
}

/** Упражнение: название слева, линия, его строки записи справа. */
export function PenTableRow({ name, children, isFirst = false, tone = 'theme' }: PenTableRowProps) {
  const colors = useColors();
  const palette = getPalette(colors, tone);
  const topBorderStyle = isFirst
    ? null
    : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border };

  return (
    <View style={[styles.exerciseRow, topBorderStyle]}>
      {name != null ? (
        <>
          <View style={[styles.nameColumn, styles.nameCell]}>
            <Text variant="bodyMedium" color={palette.ink}>
              {name}
            </Text>
          </View>
          <ColumnDivider color={palette.border} />
        </>
      ) : null}
      <View style={styles.linesColumn}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm },
  headerValues: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exerciseRow: { flexDirection: 'row', alignItems: 'stretch' },
  nameColumn: { width: NAME_COLUMN_WIDTH },
  nameCell: { paddingVertical: spacing.md },
  // Линия на всю высоту строки: stretch берёт высоту у самой высокой колонки.
  columnDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: COLUMN_DIVIDER_GAP,
  },
  linesColumn: { flex: 1, minWidth: 0, paddingVertical: spacing.md, gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  weightCell: { alignItems: 'flex-end' },
  valuesCell: { flex: 1, minWidth: 0 },
  timesSignColumn: { width: TIMES_SIGN_COLUMN_WIDTH, textAlign: 'center' },
  weightHeader: { width: WEIGHT_COLUMN_WIDTH, textAlign: 'right' },
  valuesHeader: { flex: 1 },
});
