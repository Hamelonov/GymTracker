import { Pencil, Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, ListItem, Sheet, useColors } from '@/ui';

interface FolderMenuSheetProps {
  visible: boolean;
  folderName: string | undefined;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

/** Действия для заголовка папки шаблонов: переименовать или удалить. */
export function FolderMenuSheet({ visible, folderName, onClose, onRename, onDelete }: FolderMenuSheetProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={folderName} unpadded>
      <ListItem title={translate('common.rename')} left={<Icon icon={Pencil} />} onPress={onRename} />
      <ListItem
        title={translate('home.deleteFolder')}
        subtitle={translate('home.deleteFolderHint')}
        titleColor={colors.danger}
        left={<Icon icon={Trash2} color="danger" />}
        onPress={onDelete}
      />
    </Sheet>
  );
}
