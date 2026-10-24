import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Download, Trash2, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { createBackup, deleteAllUserData, isBackup, restoreBackup, workoutsCsv } from '@/db/repo/backup';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useSettings } from '@/store/settings';
import { Button, Card, Screen, SectionTitle, Text, confirm, spacing, toast } from '@/ui';

type BusyAction = 'json' | 'csv' | 'import';

function padToTwoDigits(number: number): string {
  return String(number).padStart(2, '0');
}

/** Current local time as `YYYYMMDD-HHmm`, used in exported file names. */
function formatFileTimestamp(): string {
  const date = new Date();
  const datePart = `${date.getFullYear()}${padToTwoDigits(date.getMonth() + 1)}${padToTwoDigits(date.getDate())}`;
  const timePart = `${padToTwoDigits(date.getHours())}${padToTwoDigits(date.getMinutes())}`;
  return `${datePart}-${timePart}`;
}

/** Writes the text to a cache file and opens the system share sheet for it. */
async function shareTextFile(fileName: string, content: string, mimeType: string) {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
  }
}

export default function DataScreen() {
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);

  const exportJson = async () => {
    setBusyAction('json');
    try {
      await shareTextFile(
        `gymtracker-backup-${formatFileTimestamp()}.json`,
        JSON.stringify(createBackup()),
        'application/json',
      );
      toast(translate('settings.exportDone'));
    } catch {
      toast(translate('common.error'));
    } finally {
      setBusyAction(null);
    }
  };

  const exportCsv = async () => {
    setBusyAction('csv');
    try {
      await shareTextFile(
        `gymtracker-workouts-${formatFileTimestamp()}.csv`,
        workoutsCsv(weightUnit, i18n.language),
        'text/csv',
      );
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
