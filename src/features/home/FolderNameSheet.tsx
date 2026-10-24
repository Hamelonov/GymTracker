import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Sheet, spacing } from '@/ui';

interface FolderNameSheetProps {
  visible: boolean;
  /** True when renaming an existing folder, false when creating a new one. */
  isRenaming: boolean;
  folderName: string;
  onChangeFolderName: (folderName: string) => void;
  onClose: () => void;
  onSave: () => void;
}

/** Name input for creating or renaming a routine folder. */
export function FolderNameSheet({
  visible,
  isRenaming,
  folderName,
  onChangeFolderName,
  onClose,
  onSave,
}: FolderNameSheetProps) {
  const { t: translate } = useTranslation();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isRenaming ? translate('common.rename') : translate('home.newFolder')}
    >
      <Input
        value={folderName}
        onChangeText={onChangeFolderName}
        placeholder={translate('home.folderName')}
        autoFocus
        returnKeyType="done"
      />
      <Button
        title={translate('common.save')}
        size="lg"
        fullWidth
        disabled={!folderName.trim()}
        onPress={onSave}
        style={{ marginTop: spacing.lg }}
      />
    </Sheet>
  );
}
