import { parseCsvRecords, prepareCsvText } from './csv';
import { isGymTrackerCsvHeader, parseGymTrackerCsv } from './gymTrackerCsv';
import { parseHevyCsv, type HevyCsvParseResult } from './hevyCsv';

export type WorkoutsCsvFormat = 'gymtracker' | 'hevy';

export interface WorkoutsCsvParseResult extends HevyCsvParseResult {
  format: WorkoutsCsvFormat;
}

/** Hevy узнаётся по своим колонкам с временем начала и названием упражнения. */
function isHevyCsvHeader(columnNames: string[]): boolean {
  const names = new Set(columnNames.map((name) => name.trim().toLowerCase()));
  return names.has('start_time') && names.has('exercise_title');
}

/**
 * Один вход для импорта CSV: сам определяет, чей это файл — наш или Hevy.
 * Возвращает null, если заголовок не похож ни на один из известных форматов.
 */
export function parseWorkoutsCsv(text: string): WorkoutsCsvParseResult | null {
  const withoutBom = text.startsWith('﻿') ? text.slice(1) : text;
  // Excel может добавить первую строку «sep=;» — её нужно убрать до поиска заголовка.
  const prepared = prepareCsvText(withoutBom);
  const firstLine = prepared.text.split(/\r\n|\r|\n/, 1)[0] ?? '';
  const [headerRow] = parseCsvRecords(firstLine, prepared.delimiter);
  if (!headerRow) return null;
  if (isHevyCsvHeader(headerRow)) return { format: 'hevy', ...parseHevyCsv(prepared.text) };
  if (isGymTrackerCsvHeader(headerRow)) return { format: 'gymtracker', ...parseGymTrackerCsv(prepared.text) };
  return null;
}
