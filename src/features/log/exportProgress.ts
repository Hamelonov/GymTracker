import { exerciseName, getExerciseHistory, getExerciseUsage, listExercises } from '@/db/repo/exercises';
import type { DistanceUnit, WeightUnit } from '@/domain/types';
import { buildXlsx, XLSX_MIME_TYPE } from '@/domain/xlsx/buildXlsx';
import { buildExportFileName } from '@/features/settings/exportFileName';
import { nextExportSequence, shareExportFile } from '@/features/settings/shareExportFile';
import { buildProgressWorkbook, type ExerciseProgress } from './progressWorkbook';

// Журнал на экране показывает до 500 тренировок; в файл уходит вся история.
const FULL_HISTORY_LIMIT = 100_000;

export interface ExportProgressOptions {
  profileName: string;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  language: string;
  translate: (key: string) => string;
}

export interface ProgressExcelFile {
  fileName: string;
  content: Uint8Array;
}

export async function createProgressExcelFile(
  options: ExportProgressOptions,
  onProgress?: (progress: number, current: number, total: number) => void,
): Promise<ProgressExcelFile | null> {
  const usageByExerciseId = getExerciseUsage();
  const performedExercises = listExercises({ includeArchived: true })
    .filter((row) => usageByExerciseId.has(row.id))
    .sort(
      (left, right) =>
        (usageByExerciseId.get(right.id)?.lastAt ?? 0) - (usageByExerciseId.get(left.id)?.lastAt ?? 0),
    );
  if (performedExercises.length === 0) return null;

  const progress: ExerciseProgress[] = [];
  for (const [index, row] of performedExercises.entries()) {
    progress.push({
      name: exerciseName(row, options.language),
      exerciseType: row.type,
      entries: getExerciseHistory(row.id, FULL_HISTORY_LIMIT),
    });
    onProgress?.((index + 1) / performedExercises.length, index + 1, performedExercises.length);
    if (index + 1 < performedExercises.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  const workbook = buildProgressWorkbook(progress, {
    weightUnit: options.weightUnit,
    distanceUnit: options.distanceUnit,
    language: options.language,
    translate: options.translate,
  });
  const content = buildXlsx(workbook);
  const fileName = buildExportFileName({
    profileName: options.profileName,
    date: new Date(),
    sequence: nextExportSequence(),
    extension: 'xlsx',
  });
  return { fileName, content };
}

/**
 * Выгружает журнал прогресса в Excel и открывает окно «Поделиться».
 * Возвращает false, если выгружать нечего: ни одно упражнение ещё не делалось.
 */
export async function exportProgressToExcel(options: ExportProgressOptions): Promise<boolean> {
  const file = await createProgressExcelFile(options);
  if (!file) return false;
  await shareExportFile(file.fileName, file.content, XLSX_MIME_TYPE);
  return true;
}
