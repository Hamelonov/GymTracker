import { Download, Trash2, Upload } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import {
  EXPORT_TITLE_KEYS,
  IMPORT_TITLE_KEYS,
  useDataTransfer,
  type DataFormat,
} from '@/features/settings/useDataTransfer';
import { Button, Card, Screen, SectionTitle, Text, spacing } from '@/ui';

// У каждого формата пара кнопок: «Экспорт в …» в своей секции и «Импорт из …» в своей.
const FORMATS: DataFormat[] = ['json', 'csv', 'xlsx'];

export default function DataScreen() {
  const { t: translate } = useTranslation();
  const { busyAction, exportData, importData, deleteAllData } = useDataTransfer();

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
            icon={<Upload size={18} />}
            loading={busyAction === `export:${format}`}
            onPress={() => exportData(format)}
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
            icon={<Download size={18} />}
            loading={busyAction === `import:${format}`}
            onPress={() => importData(format)}
          />
        ))}
        <Text variant="caption" color="faint">
          {translate('settings.importHint')}
        </Text>
      </Card>

      <SectionTitle title={translate('settings.deleteAll')} />
      <Button
        title={translate('settings.deleteAll')}
        variant="danger"
        fullWidth
        contentAlign="start"
        icon={<Trash2 size={18} color="#E5484D" />}
        onPress={deleteAllData}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonsCard: { gap: spacing.sm },
});
