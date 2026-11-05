import { router } from 'expo-router';
import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { deleteExercise, setExerciseArchived } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { push } from '@/lib/nav';
import { Icon, ListItem, Sheet, confirm, useColors } from '@/ui';

interface ExerciseMenuSheetProps {
  visible: boolean;
  exercise: ExerciseRow;
  exerciseDisplayName: string;
  onClose: () => void;
}

/** Действия на экране упражнения: изменить, архивировать и (для своих упражнений) удалить. */
export function ExerciseMenuSheet({
  visible,
  exercise,
  exerciseDisplayName,
  onClose,
}: ExerciseMenuSheetProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();

  const deleteAfterConfirm = async () => {
    onClose();
    const isConfirmed = await confirm({
      title: translate('exercise.deleteConfirm', { name: exerciseDisplayName }),
      destructive: true,
      confirmLabel: translate('common.delete'),
    });
    if (isConfirmed) {
      deleteExercise(exercise.id);
      router.back();
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} unpadded>
      <ListItem
        title={translate('exercise.edit')}
        left={<Icon icon={Pencil} />}
        onPress={() => {
          onClose();
          push({ pathname: '/exercise/edit', params: { id: exercise.id } });
        }}
      />
      <ListItem
        title={exercise.archived ? translate('exercise.unarchive') : translate('exercise.archive')}
        left={<Icon icon={exercise.archived ? ArchiveRestore : Archive} />}
        onPress={() => {
          setExerciseArchived(exercise.id, !exercise.archived);
          onClose();
        }}
      />
      {/* Встроенные упражнения можно только архивировать, но не удалять. */}
      {exercise.isCustom ? (
        <ListItem
          title={translate('common.delete')}
          titleColor={colors.danger}
          left={<Icon icon={Trash2} color="danger" />}
          onPress={deleteAfterConfirm}
        />
      ) : null}
    </Sheet>
  );
}
