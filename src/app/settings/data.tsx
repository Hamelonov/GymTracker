import { Download, FolderDown, Share, Trash2, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  EXPORT_TITLE_KEYS,
  IMPORT_TITLE_KEYS,
  type ExportDestination,
  useDataTransfer,
  type DataFormat,
} from '@/features/settings/useDataTransfer';
import { TransferProgressModal } from '@/features/settings/TransferProgressModal';
import { Button, Card, Icon, Screen, SectionTitle, Sheet, Text, spacing } from '@/ui';

// У каждого формата пара кнопок: «Экспорт в …» в своей секции и «Импорт из …» в своей.
const FORMATS: DataFormat[] = ['json', 'csv', 'xlsx'];

export default function DataScreen() {
  const { t: translate } = useTranslation();
  const { busyAction, transferProgress, exportData, importData, deleteAllData } = useDataTransfer();
  const [selectedExportFormat, setSelectedExportFormat] = useState<DataFormat | null>(null);

  const startExport = (destination: ExportDestination) => {
    if (!selectedExportFormat) return;
    const format = selectedExportFormat;
    setSelectedExportFormat(null);
    void exportData(format, destination);
  };

  return (
    <Screen header={{ backButton: true, title: translate('profile.data') }}>
      <SectionTitle title={translate('settings.exportSection')} first />
      <Card style={styles.buttonsCard}>
        {FORMATS.map((format) => (
          <Button
            key={format}
            title={translate(EXPORT_TITLE_KEYS[format])}
            variant="secondary"
            fullWidth
            contentAlign="start"
            // Стрелка из лотка — файл уходит из приложения.
            icon={<Icon icon={Upload} size={20} />}
            disabled={busyAction != null}
            onPress={() => setSelectedExportFormat(format)}
          />
        ))}
      </Card>

      <SectionTitle title={translate('settings.importSection')} />
      <Card style={styles.buttonsCard}>
        {FORMATS.map((format) => (
          <Button
            key={format}
            title={translate(IMPORT_TITLE_KEYS[format])}
            variant="outline"
            fullWidth
            contentAlign="start"
            // Стрелка в лоток — файл приходит в приложение.
            icon={<Icon icon={Download} size={20} />}
            disabled={busyAction != null}
            onPress={() => importData(format)}
          />
        ))}
        <Text variant="caption" color="faint">
          {translate('settings.importHint')}
        </Text>
      </Card>

      <SectionTitle title={translate('settings.clearSection')} />
      <Button
        title={translate('settings.deleteAll')}
        variant="danger"
        fullWidth
        contentAlign="start"
        icon={<Icon icon={Trash2} size={20} color="danger" />}
        onPress={deleteAllData}
      />

      <Sheet
        visible={selectedExportFormat != null}
        title={translate('settings.exportDestinationTitle')}
        onClose={() => setSelectedExportFormat(null)}
      >
        <Text color="muted" style={styles.destinationDescription}>
          {translate('settings.exportDestinationHint')}
        </Text>
        <View style={styles.destinationActions}>
          <Button
            title={translate('settings.exportShare')}
            variant="secondary"
            fullWidth
            contentAlign="start"
            icon={<Icon icon={Share} size={20} />}
            onPress={() => startExport('share')}
          />
          <Button
            title={translate('settings.exportToDevice')}
            variant="outline"
            fullWidth
            contentAlign="start"
            icon={<Icon icon={FolderDown} size={20} />}
            onPress={() => startExport('device')}
          />
          <Button
            title={translate('common.cancel')}
            variant="ghost"
            fullWidth
            onPress={() => setSelectedExportFormat(null)}
          />
        </View>
      </Sheet>

      <TransferProgressModal progressState={transferProgress} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonsCard: { gap: spacing.sm },
  destinationDescription: { marginBottom: spacing.md },
  destinationActions: { gap: spacing.sm },
});
