import { FileSpreadsheet, FileText, FolderDown, Share, Table2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Sheet, Text, spacing } from '@/ui';
import type { DataFormat, ExportDestination } from './useDataTransfer';

interface ExportSheetProps {
  visible: boolean;
  onClose: () => void;
  onExport: (format: DataFormat, destination: ExportDestination) => void;
}

const FORMATS: DataFormat[] = ['json', 'csv', 'xlsx'];

const FORMAT_TITLE_KEYS: Record<DataFormat, string> = {
  json: 'settings.exportJsonTitle',
  csv: 'settings.exportCsvTitle',
  xlsx: 'settings.exportXlsxTitle',
};

const FORMAT_HINT_KEYS: Record<DataFormat, string> = {
  json: 'settings.exportJsonHint',
  csv: 'settings.exportCsvHint',
  xlsx: 'settings.exportXlsxHint',
};

const FORMAT_ICONS: Record<DataFormat, React.ReactNode> = {
  json: <FileText size={18} />,
  csv: <Table2 size={18} />,
  xlsx: <FileSpreadsheet size={18} />,
};

/** Экспорт в два шага: сначала что выгружаем, потом куда сохраняем. */
export function ExportSheet({ visible, onClose, onExport }: ExportSheetProps) {
  const { t: translate } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<DataFormat | null>(null);

  const closeSheet = () => {
    setSelectedFormat(null);
    onClose();
  };

  const exportToDestination = (destination: ExportDestination) => {
    if (!selectedFormat) return;
    const format = selectedFormat;
    closeSheet();
    onExport(format, destination);
  };

  if (!selectedFormat) {
    return (
      <Sheet visible={visible} title={translate('settings.exportFormatTitle')} onClose={closeSheet}>
        <Text color="muted" style={styles.description}>
          {translate('settings.exportFormatHint')}
        </Text>
        <View style={styles.actions}>
          {FORMATS.map((format) => (
            <View key={format} style={styles.formatOption}>
              <Button
                title={translate(FORMAT_TITLE_KEYS[format])}
                variant="secondary"
                fullWidth
                contentAlign="start"
                icon={FORMAT_ICONS[format]}
                onPress={() => setSelectedFormat(format)}
              />
              <Text variant="caption" color="faint">
                {translate(FORMAT_HINT_KEYS[format])}
              </Text>
            </View>
          ))}
          <Button title={translate('common.cancel')} variant="ghost" fullWidth onPress={closeSheet} />
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} title={translate('settings.exportDestinationTitle')} onClose={closeSheet}>
      <Text color="muted" style={styles.description}>
        {translate('settings.exportDestinationHint')}
      </Text>
      <View style={styles.actions}>
        <Button
          title={translate('settings.exportShare')}
          variant="secondary"
          fullWidth
          contentAlign="start"
          icon={<Share size={18} />}
          onPress={() => exportToDestination('share')}
        />
        <Button
          title={translate('settings.exportToDevice')}
          variant="outline"
          fullWidth
          contentAlign="start"
          icon={<FolderDown size={18} />}
          onPress={() => exportToDestination('device')}
        />
        <Button title={translate('common.cancel')} variant="ghost" fullWidth onPress={closeSheet} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: spacing.md },
  actions: { gap: spacing.sm },
  formatOption: { gap: spacing.xs },
});
