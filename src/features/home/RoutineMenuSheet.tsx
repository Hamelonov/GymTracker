import { Copy, Pencil, Play, Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { deleteRoutine, duplicateRoutine, type RoutineSummary } from '@/db/repo/routines';
import { push } from '@/lib/nav';
import { Icon, ListItem, Sheet, confirm, spacing, useColors } from '@/ui';

interface RoutineMenuSheetProps {
  visible: boolean;
  routine: RoutineSummary | undefined;
  onClose: () => void;
  onStartRoutine: (routineId: string) => void;
}

/** Действия для карточки шаблона: начать, изменить, дублировать, удалить. */
export function RoutineMenuSheet({ visible, routine, onClose, onStartRoutine }: RoutineMenuSheetProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={routine?.name} unpadded>
      {routine ? (
        <View style={styles.menu}>
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
          <ListItem
            title={translate('common.delete')}
            titleColor={colors.danger}
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
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  menu: { paddingHorizontal: spacing.sm },
});
