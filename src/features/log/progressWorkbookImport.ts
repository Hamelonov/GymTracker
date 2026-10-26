import type { HevyCsvParseResult, ImportedExercise, ImportedSet, ImportedWorkout } from '@/domain/hevyCsv';
import { parseLine } from '@/domain/quickEntry/parseLine';
import type { ParseOptions } from '@/domain/quickEntry/types';
import type { ReadSheet } from '@/domain/xlsx/readXlsx';
import type { XlsxCellValue } from '@/domain/xlsx/types';

/**
 * Обратный путь для выгрузки «Экспорт в XLSX»: лист на упражнение, строка на вес.
 * Время начала и длительности в файле нет, поэтому каждый день становится одной тренировкой в полдень.
 */

/** Подписи колонок на всех языках интерфейса: файл мог быть выгружен на любом из них. */
export interface ProgressHeaderAliases {
  day: string[];
  weight: string[];
  sets: string[];
  rir: string[];
  rpe: string[];
  note: string[];
}

type ColumnKey = keyof ProgressHeaderAliases;

export interface ProgressWorkbookImportOptions extends ParseOptions {
  aliases: ProgressHeaderAliases;
  /** Название, которое получат восстановленные тренировки. */
  workoutTitle: string;
}

const MS_PER_DAY = 86_400_000;
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const WORKOUT_HOUR = 12;
const WORKOUT_DURATION_MS = 60 * 60 * 1000;
// Шапка ищется в первых строках: над ней может быть название упражнения.
const HEADER_SEARCH_ROWS = 5;

function normalizeLabel(value: XlsxCellValue): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function findColumns(
  headerRow: XlsxCellValue[],
  aliases: ProgressHeaderAliases,
): Partial<Record<ColumnKey, number>> {
  const columns: Partial<Record<ColumnKey, number>> = {};
  headerRow.forEach((cell, index) => {
    const label = normalizeLabel(cell);
    for (const key of Object.keys(aliases) as ColumnKey[]) {
      if (columns[key] === undefined && aliases[key].some((alias) => alias.toLowerCase() === label)) {
        columns[key] = index;
      }
    }
  });
  return columns;
}

/** Полдень дня тренировки по местному времени: число дней Excel или текст «25.10.2026», «2026-10-25», «10/25/2026». */
function parseDay(value: XlsxCellValue): number | null {
  if (typeof value === 'number') {
    const utc = new Date(EXCEL_EPOCH_UTC + Math.round(value) * MS_PER_DAY);
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), WORKOUT_HOUR).getTime();
  }
  const text = (value ?? '').trim();
  const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
  if (dotted)
    return new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]), WORKOUT_HOUR).getTime();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), WORKOUT_HOUR).getTime();
  const american = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (american) {
    return new Date(
      Number(american[3]),
      Number(american[1]) - 1,
      Number(american[2]),
      WORKOUT_HOUR,
    ).getTime();
  }
  return null;
}

/** «0/1/—» → [0, 1, null]; прочерк или пусто — значения нет. */
function parsePerSet(value: XlsxCellValue): (number | null)[] {
  if (value == null) return [];
  return String(value)
    .split('/')
    .map((part) => {
      const number = Number(part.trim().replace(',', '.'));
      return part.trim() !== '' && Number.isFinite(number) ? number : null;
    });
}

/** Вес строки в записи «Ручки»: число в единицах из настроек или текст «70кг», «+10кг», «67,5кг». */
function weightText(value: XlsxCellValue): string {
  if (value == null) return '';
  if (typeof value === 'number') return String(value);
  return value.trim().replace(/(\d),(\d)/g, '$1.$2');
}

interface DayDraft {
  startedAt: number;
  exercise: ImportedExercise;
  rirValues: (number | null)[];
  rpeValues: (number | null)[];
}

/** RIR и RPE записаны на весь день по порядку подходов: раздаём их подходам дня. */
function finishDay(day: DayDraft): ImportedExercise {
  const sets: ImportedSet[] = day.exercise.sets.map((set, index) => ({
    ...set,
    rir: day.rirValues[index] ?? set.rir,
    rpe: day.rpeValues[index] ?? set.rpe,
  }));
  return { ...day.exercise, sets };
}

function readExerciseSheet(
  sheet: ReadSheet,
  options: ProgressWorkbookImportOptions,
): { days: { startedAt: number; exercise: ImportedExercise }[]; skippedRowCount: number } {
  const headerIndex = sheet.rows
    .slice(0, HEADER_SEARCH_ROWS)
    .findIndex((row) => findColumns(row, options.aliases).day !== undefined);
  if (headerIndex === -1) return { days: [], skippedRowCount: 0 };
  const columns = findColumns(sheet.rows[headerIndex] ?? [], options.aliases);
  if (columns.sets === undefined) return { days: [], skippedRowCount: 0 };

  // Название упражнения — в строке над шапкой; если её нет, берётся имя листа.
  const titleCell = headerIndex > 0 ? sheet.rows[0]?.[0] : null;
  const exerciseTitle = (typeof titleCell === 'string' && titleCell.trim()) || sheet.name;

  const days: { startedAt: number; exercise: ImportedExercise }[] = [];
  let skippedRowCount = 0;
  let currentDay: DayDraft | null = null;
  const cellOf = (row: XlsxCellValue[], key: ColumnKey) => {
    const index = columns[key];
    return index === undefined ? null : (row[index] ?? null);
  };

  for (const row of sheet.rows.slice(headerIndex + 1)) {
    if (row.every((cell) => cell == null || String(cell).trim() === '')) continue;
    const startedAt = parseDay(cellOf(row, 'day'));
    if (startedAt != null) {
      if (currentDay) days.push({ startedAt: currentDay.startedAt, exercise: finishDay(currentDay) });
      const note = cellOf(row, 'note');
      currentDay = {
        startedAt,
        exercise: {
          title: exerciseTitle,
          note: typeof note === 'string' ? note.trim() : '',
          supersetGroup: null,
          sets: [],
        },
        rirValues: parsePerSet(cellOf(row, 'rir')),
        rpeValues: parsePerSet(cellOf(row, 'rpe')),
      };
    }
    if (!currentDay) {
      skippedRowCount += 1;
      continue;
    }
    const setsText = String(cellOf(row, 'sets') ?? '').trim();
    if (setsText === '' || setsText === '—') continue;
    const weight = weightText(cellOf(row, 'weight'));
    // Строка собирается в запись «Ручки» и разбирается тем же парсером: «x: 70 x 9/8о».
    const parsed = parseLine(`x: ${weight ? `${weight} x ` : ''}${setsText}`, 0, options);
    if (!parsed.ok) {
      skippedRowCount += 1;
      continue;
    }
    currentDay.exercise.sets.push(
      ...parsed.line.sets.map((set) => ({
        type: set.type,
        weightKg: set.weightKg,
        reps: set.reps,
        durationSec: set.durationSec,
        distanceM: set.distanceM,
        rpe: null,
        rir: set.rir,
      })),
    );
  }
  if (currentDay) days.push({ startedAt: currentDay.startedAt, exercise: finishDay(currentDay) });
  return { days: days.filter((day) => day.exercise.sets.length > 0), skippedRowCount };
}

/** Книга прогресса → тренировки: все упражнения одного дня собираются в одну тренировку. */
export function parseProgressWorkbook(
  sheets: ReadSheet[],
  options: ProgressWorkbookImportOptions,
): HevyCsvParseResult {
  const workoutByStart = new Map<number, ImportedWorkout>();
  let skippedRowCount = 0;
  for (const sheet of sheets) {
    const result = readExerciseSheet(sheet, options);
    skippedRowCount += result.skippedRowCount;
    for (const day of result.days) {
      let workout = workoutByStart.get(day.startedAt);
      if (!workout) {
        workout = {
          title: options.workoutTitle,
          startedAt: day.startedAt,
          finishedAt: day.startedAt + WORKOUT_DURATION_MS,
          notes: '',
          exercises: [],
        };
        workoutByStart.set(day.startedAt, workout);
      }
      workout.exercises.push(day.exercise);
    }
  }
  const workouts = [...workoutByStart.values()].sort((left, right) => left.startedAt - right.startedAt);
  return { workouts, skippedRowCount };
}
