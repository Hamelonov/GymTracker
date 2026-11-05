import { Folder } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { RoutineFolderRow } from '@/db/schema';
import { Icon, ListItem, Sheet, spacing } from '@/ui';

interface MoveToFolderSheetProps {
  visible: boolean;
  folders: RoutineFolderRow[];
  onClose: () => void;
  /** `null` убирает шаблон из любой папки. */
  onSelectFolder: (folderId: string | null) => void;
}

export function MoveToFolderSheet({ visible, folders, onClose, onSelectFolder }: MoveToFolderSheetProps) {
  const { t: translate } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={translate('home.moveToFolder')} unpadded>
      <View style={styles.menu}>
        <ListItem title={translate('home.noFolder')} onPress={() => onSelectFolder(null)} />
        {folders.map((folder) => (
          <ListItem
            key={folder.id}
            title={folder.name}
            left={<Icon icon={Folder} />}
            onPress={() => onSelectFolder(folder.id)}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  menu: { paddingHorizontal: spacing.sm },
});
