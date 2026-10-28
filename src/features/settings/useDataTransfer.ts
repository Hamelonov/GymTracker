import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createBackup, deleteAllUserData, isBackup, workoutsCsv } from '@/db/repo/backup';
import { importWorkoutsAsync } from '@/db/repo/importWorkouts';
import { mergeBackupAsync } from '@/db/repo/mergeBackup';
import { parseWorkoutsCsv } from '@/domain/workoutsCsv';
import { XLSX_MIME_TYPE } from '@/domain/xlsx/buildXlsx';
import { readXlsx } from '@/domain/xlsx/readXlsx';
import { exportProgressToExcel } from '@/features/log/exportProgress';
import { parseProgressWorkbook, type ProgressHeaderAliases } from '@/features/log/progressWorkbookImport';
import en from '@/i18n/en';
import ru from '@/i18n/ru';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useSettings } from '@/store/settings';
import { confirm, toast } from '@/ui';
import { buildExportFileName } from './exportFileName';
import { nextExportSequence, shareExportFile } from './shareExportFile';

export type DataFormat = 'json' | 'csv' | 'xlsx';
export type BusyAction = `${'export' | 'import'}:${DataFormat}`;

export interface ImportProgressState {
  isVisible: boolean;
  progress: number;
  stageText: string;
}

// Мессенджеры и облака часто отдают файл без правильного типа, поэтому в конце всегда «любой файл».
const PICKER_TYPES: Record<DataFormat, string[]> = {
  json: ['application/json', 'text/plain', '*/*'],
  csv: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
  xlsx: [XLSX_MIME_TYPE, 'application/octet-stream', '*/*'],
};

// Файл Excel мог быть выгружен на любом языке интерфейса: колонки ищутся по подписям обоих словарей.
const DICTIONARIES = [ru, en];
const PROGRESS_HEADER_ALIASES: ProgressHeaderAliases = {
  day: DICTIONARIES.map((dictionary) => dictionary.log.columnDay),
  weight: DICTIONARIES.flatMap((dictionary) => [dictionary.log.columnWeight, dictionary.log.columnVariation]),
  sets: DICTIONARIES.map((dictionary) => dictionary.log.columnSets),
  rir: DICTIONARIES.map((dictionary) => dictionary.workout.rir),
  rpe: DICTIONARIES.map((dictionary) => dictionary.workout.rpe),
  note: DICTIONARIES.map((dictionary) => dictionary.log.columnNote),
};

interface ImportResult {
  imported: number;
  duplicates: number;
  created: number;
}

/** Что нашлось в файле и как это добавить: подтверждение показывается до того, как база изменится. */
interface ImportPlan {
  workoutCount: number;
  apply: (
    onProgress?: (progressRatio: number, current?: number, total?: number) => void,
  ) => Promise<ImportResult>;
}

/** Экспорт и импорт данных во всех трёх форматах. Импорт всегда добавляет к текущим данным и ничего не стирает. */
export function useDataTransfer() {
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  const profileName = useSettings((state) => state.profileName);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null);

  const runBusy = async (action: BusyAction, task: () => Promise<void>, failureKey: string) => {
    setBusyAction(action);
    try {
      await task();
    } catch {
      toast(translate(failureKey));
    } finally {
      setBusyAction(null);
    }
  };

  const shareText = async (format: 'json' | 'csv', content: string, mimeType: string) => {
    const fileName = buildExportFileName({
      profileName,
      date: new Date(),
      sequence: nextExportSequence(),
      extension: format,
    });
    await shareExportFile(fileName, content, mimeType);
    toast(translate('settings.exportDone'));
  };

  const exportData = (format: DataFormat) =>
    runBusy(
      `export:${format}`,
      async () => {
        if (format === 'json') await shareText('json', JSON.stringify(createBackup()), 'application/json');
        if (format === 'csv') await shareText('csv', workoutsCsv(weightUnit, i18n.language), 'text/csv');
        if (format === 'xlsx') {
          const hasProgress = await exportProgressToExcel({
            profileName,
            weightUnit,
            distanceUnit,
            language: i18n.language,
            translate,
          });
          if (!hasProgress) toast(translate('log.empty'));
        }
      },
      'common.error',
    );

  const planJsonImport = async (file: File): Promise<ImportPlan> => {
    const backup: unknown = JSON.parse((await file.text()).replace(/^﻿/, ''));
    if (!isBackup(backup)) throw new Error('not a backup');
    return {
      workoutCount: backup.workouts.length,
      apply: async (onProgress) => {
        const summary = await mergeBackupAsync(backup, onProgress);
        return {
          imported: summary.importedCount,
          duplicates: summary.duplicateCount,
          created: summary.createdExerciseCount,
        };
      },
    };
  };

  const planCsvImport = async (file: File): Promise<ImportPlan> => {
    const parsed = parseWorkoutsCsv(await file.text());
    if (!parsed) throw new Error('unknown csv');
    return {
      workoutCount: parsed.workouts.length,
      apply: async (onProgress) => {
        const summary = await importWorkoutsAsync(parsed.workouts, 'sameStartMinute', (progressInfo) => {
          const ratio = progressInfo.total > 0 ? progressInfo.current / progressInfo.total : 1;
          onProgress?.(ratio, progressInfo.current, progressInfo.total);
        });
        return toImportResult(summary);
      },
    };
  };

  const planXlsxImport = async (file: File): Promise<ImportPlan> => {
    const parsed = parseProgressWorkbook(readXlsx(await file.bytes()), {
      aliases: PROGRESS_HEADER_ALIASES,
      weightUnit,
      distanceUnit,
      workoutTitle: translate('workout.defaultName'),
    });
    // В Excel есть только даты, поэтому день, в который тренировка уже есть, пропускается целиком.
    return {
      workoutCount: parsed.workouts.length,
      apply: async (onProgress) => {
        const summary = await importWorkoutsAsync(parsed.workouts, 'sameDay', (progressInfo) => {
          const ratio = progressInfo.total > 0 ? progressInfo.current / progressInfo.total : 1;
          onProgress?.(ratio, progressInfo.current, progressInfo.total);
        });
        return toImportResult(summary);
      },
    };
  };

  const importData = async (format: DataFormat) => {
    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: PICKER_TYPES[format],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const pickedFile = pickerResult.canceled ? undefined : pickerResult.assets[0];
    if (!pickedFile) return;

    setBusyAction(`import:${format}`);
    try {
      const file = new File(pickedFile.uri);
      const planByFormat = { json: planJsonImport, csv: planCsvImport, xlsx: planXlsxImport };
      const plan = await planByFormat[format](file);
      if (plan.workoutCount === 0) throw new Error('nothing to import');

      const isConfirmed = await confirm({
        title: translate(IMPORT_TITLE_KEYS[format]),
        message: translate('settings.importMergeConfirm', { count: plan.workoutCount }),
        confirmLabel: translate('settings.importMergeAction'),
      });
      if (!isConfirmed) {
        setBusyAction(null);
        return;
      }

      // После подтверждения показываем модальное окно прогресса в центре экрана.
      setImportProgress({
        isVisible: true,
        progress: 0.1,
        stageText: translate('settings.importCreatingBackup'),
      });

      // Страховка: копия всех данных до слияния лежит в папке приложения.
      const backupFile = new File(Paths.document, `backup-before-import-${Date.now()}.json`);
      backupFile.create();
      await backupFile.write(JSON.stringify(createBackup()));

      setImportProgress({
        isVisible: true,
        progress: 0.25,
        stageText: translate('settings.importProcessing'),
      });

      const importResult = await plan.apply((stepRatio, current, total) => {
        const mappedProgress = 0.25 + stepRatio * 0.65;
        const stageText = total
          ? translate('settings.importProcessingWorkouts', { current, total })
          : translate('settings.importProcessing');
        setImportProgress({
          isVisible: true,
          progress: mappedProgress,
          stageText,
        });
      });

      setImportProgress({
        isVisible: true,
        progress: 0.95,
        stageText: translate('settings.importFinalizing'),
      });
      await new Promise((resolve) => setTimeout(resolve, 200));

      setImportProgress({
        isVisible: true,
        progress: 1,
        stageText: translate('settings.importDoneTitle'),
      });
      // Небольшая задержка, чтобы пользователь увидел финальный статус 100%.
      await new Promise((resolve) => setTimeout(resolve, 350));

      setImportProgress(null);
      toast(translate('settings.importMergeDone', { ...importResult }));
    } catch {
      setImportProgress(null);
      toast(translate('settings.importFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const deleteAllData = async () => {
    const isConfirmed = await confirm({
      title: translate('settings.deleteAll'),
      message: translate('settings.deleteAllConfirm'),
      destructive: true,
      confirmLabel: translate('common.delete'),
    });
    if (!isConfirmed) return;
    deleteAllUserData();
    useActiveWorkout.getState().clear();
    toast(translate('common.deleted'));
  };

  return { busyAction, importProgress, exportData, importData, deleteAllData };
}

export const EXPORT_TITLE_KEYS: Record<DataFormat, string> = {
  json: 'settings.exportJson',
  csv: 'settings.exportCsv',
  xlsx: 'settings.exportXlsx',
};

export const IMPORT_TITLE_KEYS: Record<DataFormat, string> = {
  json: 'settings.importJson',
  csv: 'settings.importCsv',
  xlsx: 'settings.importXlsx',
};

function toImportResult(summary: {
  importedCount: number;
  duplicateCount: number;
  createdExerciseNames: string[];
}): ImportResult {
  return {
    imported: summary.importedCount,
    duplicates: summary.duplicateCount,
    created: summary.createdExerciseNames.length,
  };
}
