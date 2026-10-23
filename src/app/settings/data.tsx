import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Download, Trash2, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createBackup, deleteAllUserData, isBackup, restoreBackup, workoutsCsv } from '@/db/repo/backup';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useSettings } from '@/store/settings';
import { Button, Card, Screen, SectionTitle, Text, confirm, spacing, toast } from '@/ui';

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function shareText(name: string, content: string, mimeType: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(content);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

export default function DataScreen() {
  const { t, i18n } = useTranslation();
  const unit = useSettings((s) => s.weightUnit);
  const [busy, setBusy] = useState<string | null>(null);

  const exportJson = async () => {
    setBusy('json');
    try {
      await shareText(`gymtracker-backup-${stamp()}.json`, JSON.stringify(createBackup()), 'application/json');
      toast(t('settings.exportDone'));
    } catch {
      toast(t('common.error'));
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = async () => {
    setBusy('csv');
    try {
      await shareText(`gymtracker-workouts-${stamp()}.csv`, workoutsCsv(unit, i18n.language), 'text/csv');
      toast(t('settings.exportDone'));
    } catch {
      toast(t('common.error'));
    } finally {
      setBusy(null);
    }
  };

  const importJson = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets[0]) return;
    setBusy('import');
    try {
      const text = await new File(res.assets[0].uri).text();
      const parsed: unknown = JSON.parse(text);
      if (!isBackup(parsed)) throw new Error('invalid');
      if (!(await confirm({ title: t('settings.importJson'), message: t('settings.importConfirm'), destructive: true, confirmLabel: t('settings.importJson') }))) return;
      restoreBackup(parsed);
      useActiveWorkout.getState().clear();
      toast(t('settings.importDone'));
    } catch {
      toast(t('settings.importFailed'));
    } finally {
      setBusy(null);
    }
  };

  const deleteAll = async () => {
    if (!(await confirm({ title: t('settings.deleteAll'), message: t('settings.deleteAllConfirm'), destructive: true, confirmLabel: t('common.delete') }))) return;
    deleteAllUserData();
    useActiveWorkout.getState().clear();
    toast(t('common.deleted'));
  };

  return (
    <Screen header={{ back: true, title: t('profile.data') }}>
      <SectionTitle title={t('settings.data')} first />
      <Card style={{ gap: spacing.sm }}>
        <Button title={t('settings.exportJson')} variant="secondary" full icon={<Download size={18} />} loading={busy === 'json'} onPress={exportJson} />
        <Button title={t('settings.exportCsv')} variant="secondary" full icon={<Download size={18} />} loading={busy === 'csv'} onPress={exportCsv} />
        <Button title={t('settings.importJson')} variant="outline" full icon={<Upload size={18} />} loading={busy === 'import'} onPress={importJson} />
        <Text variant="caption" color="faint">
          {t('settings.importHint')}
        </Text>
      </Card>
      <SectionTitle title={t('settings.deleteAll')} />
      <Button title={t('settings.deleteAll')} variant="danger" full icon={<Trash2 size={18} color="#E5484D" />} onPress={deleteAll} />
    </Screen>
  );
}
