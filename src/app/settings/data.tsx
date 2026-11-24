import { Download, Trash2, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { ExportSheet } from '@/features/settings/ExportSheet';
import { TransferProgressModal } from '@/features/settings/TransferProgressModal';
import { useDataTransfer } from '@/features/settings/useDataTransfer';
import { Button, Card, Screen, SectionTitle, spacing } from '@/ui';

export default function DataScreen() {
  const { t: translate } = useTranslation();
  const { busyAction, transferProgress, exportData, importData, deleteAllData } = useDataTransfer();
  const [isExportSheetVisible, setIsExportSheetVisible] = useState(false);

  return (
    <Screen header={{ backButton: true, title: translate('profile.data') }}>
      <SectionTitle title={translate('settings.transferSection')} first />
      <Card style={styles.buttonsCard}>
        <Button
          title={translate('settings.exportButton')}
          variant="outline"
          fullWidth
          contentAlign="start"
          // Стрелка из лотка — файл уходит из приложения.
          icon={<Upload size={18} />}
          disabled={busyAction != null}
          onPress={() => setIsExportSheetVisible(true)}
        />
        <Button
          title={translate('settings.importButton')}
          variant="outline"
          fullWidth
          contentAlign="start"
          // Стрелка в лоток — файл приходит в приложение.
          icon={<Download size={18} />}
          disabled={busyAction != null}
          onPress={importData}
        />
      </Card>

      <SectionTitle title={translate('settings.clearSection')} />
      <Button
        title={translate('settings.deleteAll')}
        variant="danger"
        fullWidth
        contentAlign="start"
        icon={<Trash2 size={18} color="#E5484D" />}
        onPress={deleteAllData}
      />

      <ExportSheet
        visible={isExportSheetVisible}
        onClose={() => setIsExportSheetVisible(false)}
        onExport={exportData}
      />

      <TransferProgressModal progressState={transferProgress} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonsCard: { gap: spacing.sm },
});
