import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Download, FileSpreadsheet, Trash2, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { createBackup, deleteAllUserData, isBackup, restoreBackup, workoutsCsv } from '@/db/repo/backup';
import { importWorkouts } from '@/db/repo/importWorkouts';
import { parseHevyCsv } from '@/domain/hevyCsv';
import { exportProgressToExcel } from '@/features/log/exportProgress';
import { buildExportFileName } from '@/features/settings/exportFileName';
import { nextExportSequence, shareExportFile } from '@/features/settings/shareExportFile';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useSettings } from '@/store/settings';
import { Button, Card, Screen, SectionTitle, Text, confirm, spacing, toast } from '@/ui';

type BusyAction = 'json' | 'csv' | 'excel' | 'import' | 'hevy';

export default function DataScreen() {
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  const profileName = useSettings((state) => state.profileName);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const exportFileName = (extension: 'csv' | 'json') =>
    buildExportFileName({ profileName, date: new Date(), sequence: nextExportSequence(), extension });

  const exportJson = async () => {
    setBusyAction('json');
    try {
      await shareExportFile(exportFileName('json'), JSON.stringify(createBackup()), 'application/json');
      toast(translate('settings.exportDone'));
    } catch {
      toast(translate('common.error'));
    } finally {
      setBusyAction(null);
    }
  };

  const exportExcel = async () => {
    setBusyAction('excel');
    try {
      const hasProgress = await exportProgressToExcel({
        profileName,
        weightUnit,
        distanceUnit,
        language: i18n.language,
        translate,
      });
      if (!hasProgress) toast(translate('log.empty'));
    } catch {
      toast(translate('common.error'));
    } finally {
      setBusyAction(null);
    }
  };

  const exportCsv = async () => {
    setBusyAction('csv');
    try {
      await shareExportFile(exportFileName('csv'), workoutsCsv(weightUnit, i18n.language), 'text/csv');
      toast(translate('settings.exportDone'));
    } catch {
      toast(translate('common.error'));
    } finally {
      setBusyAction(null);
    }
  };

  const importJson = async () => {
    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const pickedFile = pickerResult.canceled ? undefined : pickerResult.assets[0];
    if (!pickedFile) return;
    setBusyAction('import');
    try {
      const fileText = await new File(pickedFile.uri).text();
      const parsedBackup: unknown = JSON.parse(fileText);
      if (!isBackup(parsedBackup)) throw new Error('invalid');
      const isConfirmed = await confirm({
        title: translate('settings.importJson'),
        message: translate('settings.importConfirm'),
        destructive: true,
        confirmLabel: translate('settings.importJson'),
      });
      if (!isConfirmed) return;
      restoreBackup(parsedBackup);
      useActiveWorkout.getState().clear();
      toast(translate('settings.importDone'));
    } catch {
      toast(translate('settings.importFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const importHevyCsv = async () => {
    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const pickedFile = pickerResult.canceled ? undefined : pickerResult.assets[0];
    if (!pickedFile) return;
    setBusyAction('hevy');
    try {
      const fileText = await new File(pickedFile.uri).text();
      const parsed = parseHevyCsv(fileText);
      if (parsed.workouts.length === 0) throw new Error('empty');
      const isConfirmed = await confirm({
        title: translate('settings.importHevy'),
        message: translate('settings.importHevyConfirm', { count: parsed.workouts.length }),
        confirmLabel: translate('settings.importHevyAction'),
      });
      if (!isConfirmed) return;
      // Страховка: копия всех данных до слияния лежит в папке приложения.
      const backupFile = new File(Paths.document, `backup-before-import-${Date.now()}.json`);
      backupFile.create();
      await backupFile.write(JSON.stringify(createBackup()));
      const summary = importWorkouts(parsed.workouts);
      toast(
        translate('settings.importHevyDone', {
          imported: summary.importedCount,
          duplicates: summary.duplicateCount,
          created: summary.createdExerciseNames.length,
        }),
      );
    } catch {
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

  return (
    <Screen header={{ backButton: true, title: translate('profile.data') }}>
      <SectionTitle title={translate('settings.data')} first />
      <Card style={styles.buttonsCard}>
        <Button
          title={translate('settings.exportJson')}
          variant="secondary"
          fullWidth
          icon={<Download size={18} />}
          loading={busyAction === 'json'}
          onPress={exportJson}
        />
        <Button
          title={translate('settings.exportCsv')}
          variant="secondary"
          fullWidth
          icon={<Download size={18} />}
          loading={busyAction === 'csv'}
          onPress={exportCsv}
        />
        <Button
          title={translate('settings.exportExcel')}
          variant="secondary"
          fullWidth
          icon={<FileSpreadsheet size={18} />}
          loading={busyAction === 'excel'}
          onPress={exportExcel}
        />
        <Button
          title={translate('settings.importJson')}
          variant="outline"
          fullWidth
          icon={<Upload size={18} />}
          loading={busyAction === 'import'}
          onPress={importJson}
        />
        <Text variant="caption" color="faint">
          {translate('settings.importHint')}
        </Text>
      </Card>
      <SectionTitle title={translate('settings.importHevy')} />
      <Card style={styles.buttonsCard}>
        <Button
          title={translate('settings.importHevy')}
          variant="outline"
          fullWidth
          icon={<Upload size={18} />}
          loading={busyAction === 'hevy'}
          onPress={importHevyCsv}
        />
        <Text variant="caption" color="faint">
          {translate('settings.importHevyHint')}
        </Text>
      </Card>
      <SectionTitle title={translate('settings.deleteAll')} />
      <Button
        title={translate('settings.deleteAll')}
        variant="danger"
        fullWidth
        icon={<Trash2 size={18} color="#E5484D" />}
        onPress={deleteAllData}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonsCard: { gap: spacing.sm },
});
