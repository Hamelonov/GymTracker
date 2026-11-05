import { Copy, FolderInput, Pencil, Play, Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { deleteRoutine, duplicateRoutine, type RoutineSummary } from '@/db/repo/routines';
import { push } from '@/lib/nav';
import { Icon, ListItem, Sheet, confirm } from '@/ui';

interface RoutineMenuSheetProps {
  visible: boolean;
  routine: RoutineSummary | undefined;
  hasFolders: boolean;
  onClose: () => void;
  onStartRoutine: (routineId: string) => void;
  onOpenMoveToFolder: (routineId: string) => void;
}

/** Действия для карточки шаблона: начать, изменить, дублировать, переместить в папку, удалить. */
export function RoutineMenuSheet({
  visible,
  routine,
  hasFolders,
  onClose,
  onStartRoutine,
  onOpenMoveToFolder,
}: RoutineMenuSheetProps) {
  const { t: translate } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={routine?.name} unpadded>
      {routine ? (
        <>
          <ListItem
            title={translate('home.startRoutine')}
            left={<Icon icon={Play} />}
            onPress={() => {
              onClose();
              onStartRoutine(routine.id);
            }}
          />
          <ListItem
            title={translate('common.edit')}
            left={<Icon icon={Pencil} />}
            onPress={() => {
              onClose();
              push({ pathname: '/routine/edit', params: { id: routine.id } });
            }}
          />
          <ListItem
            title={translate('common.duplicate')}
            left={<Icon icon={Copy} />}
            onPress={() => {
              duplicateRoutine(routine.id, `${routine.name} (2)`);
              onClose();
            }}
          />
          {hasFolders ? (
            <ListItem
              title={translate('home.moveToFolder')}
              left={<Icon icon={FolderInput} />}
              onPress={() => onOpenMoveToFolder(routine.id)}
            />
          ) : null}
          <ListItem
            title={translate('common.delete')}
            tone="danger"
            left={<Icon icon={Trash2} color="danger" />}
            onPress={async () => {
              onClose();
              const isConfirmed = await confirm({
                title: translate('routine.deleteConfirm', { name: routine.name }),
                destructive: true,
                confirmLabel: translate('common.delete'),
              });
              if (isConfirmed) deleteRoutine(routine.id);
            }}
          />
        </>
      ) : null}
    </Sheet>
  );
}
