import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Sheet, spacing } from '@/ui';

interface FolderNameSheetProps {
  visible: boolean;
  /** True при переименовании существующей папки, false при создании новой. */
  isRenaming: boolean;
  folderName: string;
  onChangeFolderName: (folderName: string) => void;
  onClose: () => void;
  onSave: () => void;
}

/** Ввод названия для создания или переименования папки шаблонов. */
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
