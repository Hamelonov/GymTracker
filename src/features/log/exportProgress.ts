import { exerciseName, getExerciseHistory, getExerciseUsage, listExercises } from '@/db/repo/exercises';
import type { DistanceUnit, WeightUnit } from '@/domain/types';
import { buildXlsx, XLSX_MIME_TYPE } from '@/domain/xlsx/buildXlsx';
import { buildExportFileName } from '@/features/settings/exportFileName';
import { nextExportSequence, shareExportFile } from '@/features/settings/shareExportFile';
import { buildProgressWorkbook, type ExerciseProgress } from './progressWorkbook';

// Журнал на экране показывает до 500 тренировок; в файл уходит вся история.
const FULL_HISTORY_LIMIT = 100_000;

interface ExportProgressOptions {
  profileName: string;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  language: string;
  translate: (key: string) => string;
}

/**
 * Выгружает журнал прогресса в Excel и открывает окно «Поделиться».
 * Возвращает false, если выгружать нечего: ни одно упражнение ещё не делалось.
 */
export async function exportProgressToExcel(options: ExportProgressOptions): Promise<boolean> {
  const usageByExerciseId = getExerciseUsage();
  // Листы в том же порядке, что и в журнале: недавние упражнения первыми.
  const performedExercises = listExercises({ includeArchived: true })
    .filter((row) => usageByExerciseId.has(row.id))
    .sort(
      (left, right) =>
        (usageByExerciseId.get(right.id)?.lastAt ?? 0) - (usageByExerciseId.get(left.id)?.lastAt ?? 0),
    );
  if (performedExercises.length === 0) return false;

  const progress: ExerciseProgress[] = performedExercises.map((row) => ({
    name: exerciseName(row, options.language),
    exerciseType: row.type,
    entries: getExerciseHistory(row.id, FULL_HISTORY_LIMIT),
  }));
  const workbook = buildProgressWorkbook(progress, {
    weightUnit: options.weightUnit,
    distanceUnit: options.distanceUnit,
    language: options.language,
    translate: options.translate,
  });
  const fileName = buildExportFileName({
    profileName: options.profileName,
    date: new Date(),
    sequence: nextExportSequence(),
    extension: 'xlsx',
  });
  await shareExportFile(fileName, buildXlsx(workbook), XLSX_MIME_TYPE);
  return true;
}
