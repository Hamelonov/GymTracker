import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import { getTimesSign, weightUnitToken, type SetFormatOptions } from '@/domain/setFormatting';
import type { ExerciseType } from '@/domain/types';
import { kgToUnit, roundForDisplay } from '@/domain/units';
import type { XlsxCell, XlsxCellStyle, XlsxRow, XlsxSheet, XlsxWorkbook } from '@/domain/xlsx/types';
import { cellReference, toExcelDateSerial } from '@/domain/xlsx/xml';
import { buildWeightLines, describeLogColumns, formatPerSet } from './logLines';

export interface ExerciseProgress {
  name: string;
  exerciseType: ExerciseType;
  entries: ExerciseHistoryEntry[];
}

export interface ProgressWorkbookOptions extends SetFormatOptions {
  translate: (key: string) => string;
}

// Цвета приложения: жёлтый акцент в шапке, серый для «х» и линий между днями.
const ACCENT_COLOR = 'FFD400';
const MUTED_TEXT_COLOR = '6A6A66';
const DIVIDER_COLOR = 'D9D9D9';

type ColumnKey = 'day' | 'weight' | 'timesSign' | 'sets' | 'rir' | 'rpe' | 'note';

/**
 * Текстовые колонки: без формата «@» Excel превращает набранное «8/8/7» в дату,
 * и при импорте подходы уже не прочитать.
 */
const TEXT_COLUMNS = new Set<ColumnKey>(['sets', 'rir', 'rpe', 'note']);
const TEXT_FORMAT: XlsxCellStyle = { numberFormat: '@' };

const COLUMN_WIDTHS: Record<ColumnKey, number> = {
  day: 12,
  weight: 13,
  timesSign: 3,
  sets: 18,
  rir: 10,
  rpe: 10,
  note: 50,
};

const TITLE_STYLE: XlsxCellStyle = { bold: true, fontSize: 14, verticalAlign: 'center' };
const HEADER_STYLE: XlsxCellStyle = {
  bold: true,
  fillColor: ACCENT_COLOR,
  verticalAlign: 'center',
  borderBottomColor: DIVIDER_COLOR,
};

/** Колонки листа: пустые для этого упражнения (вес, RIR, RPE) не выводятся, как и в журнале. */
function sheetColumns(entries: ExerciseHistoryEntry[]): ColumnKey[] {
  const { hasWeight, hasRir, hasRpe } = describeLogColumns(entries);
  const columns: ColumnKey[] = ['day'];
  if (hasWeight) columns.push('weight', 'timesSign');
  columns.push('sets');
  if (hasRir) columns.push('rir');
  if (hasRpe) columns.push('rpe');
  columns.push('note');
  return columns;
}

function headerTitle(column: ColumnKey, translate: (key: string) => string): string {
  const titleKeys: Record<Exclude<ColumnKey, 'timesSign'>, string> = {
    day: 'log.columnDay',
    weight: 'log.columnWeight',
    sets: 'log.columnSets',
    rir: 'workout.rir',
    rpe: 'workout.rpe',
    note: 'log.columnNote',
  };
  if (column === 'timesSign') return '';
  return translate(titleKeys[column]);
}

/**
 * Вес хранится числом, а «кг» дописывает формат ячейки: в Excel видно «70кг», но по колонке
 * можно считать и строить графики.
 */
function weightNumberFormat(options: SetFormatOptions): string {
  const unit = weightUnitToken(options.weightUnit, options.language);
  return `General"${unit}"`;
}

/** Строки одного дня: на каждый вес своя строка, дата, RIR, RPE и примечание — в первой. */
function dayRows(
  entry: ExerciseHistoryEntry,
  exercise: ExerciseProgress,
  columns: ColumnKey[],
  options: ProgressWorkbookOptions,
): XlsxRow[] {
  const lines = buildWeightLines(entry.sets, exercise.exerciseType, options);
  return lines.map((line, lineIndex) => {
    const isFirstLine = lineIndex === 0;
    // Линия над первой строкой дня отделяет тренировки друг от друга, как в «Сегодня сделано».
    const baseStyle: XlsxCellStyle = {
      verticalAlign: 'top',
      ...(isFirstLine ? { borderTopColor: DIVIDER_COLOR } : {}),
    };
    const textStyle: XlsxCellStyle = { ...baseStyle, ...TEXT_FORMAT };
    const cellFor = (column: ColumnKey): XlsxCell => {
      switch (column) {
        case 'day':
          return {
            value: isFirstLine ? toExcelDateSerial(entry.startedAt) : null,
            style: { ...baseStyle, numberFormat: 'dd.mm.yyyy', horizontalAlign: 'left' },
          };
        case 'weight':
          return {
            value:
              line.weightKg != null ? roundForDisplay(kgToUnit(line.weightKg, options.weightUnit), 2) : null,
            style: {
              ...baseStyle,
              numberFormat: weightNumberFormat(options),
              horizontalAlign: 'right',
            },
          };
        case 'timesSign':
          return {
            value: line.weightKg != null ? getTimesSign(options.language) : null,
            style: { ...baseStyle, fontColor: MUTED_TEXT_COLOR, horizontalAlign: 'center' },
          };
        case 'sets':
          return { value: line.sets, style: textStyle };
        case 'rir':
          return { value: isFirstLine ? formatPerSet(entry.sets, (set) => set.rir) : null, style: textStyle };
        case 'rpe':
          return { value: isFirstLine ? formatPerSet(entry.sets, (set) => set.rpe) : null, style: textStyle };
        // Примечание не переносится: колонка последняя, текст уходит вправо, а высокая строка оттолкнула бы второй вес дня вниз.
        case 'note':
          return {
            value: isFirstLine && entry.note ? entry.note : null,
            style: textStyle,
          };
      }
    };
    return { cells: columns.map(cellFor) };
  });
}

function exerciseSheet(exercise: ExerciseProgress, options: ProgressWorkbookOptions): XlsxSheet {
  const columns = sheetColumns(exercise.entries);
  const titleRow: XlsxRow = {
    height: 24,
    cells: columns.map((_, index) => ({ value: index === 0 ? exercise.name : null, style: TITLE_STYLE })),
  };
  const headerRow: XlsxRow = {
    height: 20,
    cells: columns.map((column) => ({
      value: headerTitle(column, options.translate) || null,
      style: { ...HEADER_STYLE, horizontalAlign: column === 'weight' ? 'right' : 'left' },
    })),
  };
  // В таблице, которую ведут вручную, новые тренировки дописываются вниз — поэтому от старых к новым.
  const chronologicalEntries = [...exercise.entries].sort((left, right) => left.startedAt - right.startedAt);
  const bodyRows = chronologicalEntries.flatMap((entry) => dayRows(entry, exercise, columns, options));
  return {
    name: exercise.name,
    columnWidths: columns.map((column) => COLUMN_WIDTHS[column]),
    columnStyles: columns.map((column) => (TEXT_COLUMNS.has(column) ? TEXT_FORMAT : undefined)),
    rows: [titleRow, headerRow, ...bodyRows],
    frozenRowCount: 2,
    merges: [`${cellReference(0, 0)}:${cellReference(columns.length - 1, 0)}`],
  };
}

/** Книга прогресса: лист на каждое упражнение в том же виде, что и журнал в приложении. */
export function buildProgressWorkbook(
  exercises: ExerciseProgress[],
  options: ProgressWorkbookOptions,
): XlsxWorkbook {
  return { sheets: exercises.map((exercise) => exerciseSheet(exercise, options)) };
}
