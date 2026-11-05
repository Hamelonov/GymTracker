import React from 'react';
import { useTranslation } from 'react-i18next';
import { exerciseName } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { NEW_SUPERSET_GROUP, useRoutineDraft, type DraftExercise } from '@/store/routineDraft';
import { ListItem, Sheet } from '@/ui';

const UNKNOWN_EXERCISE = { nameEn: '', nameRu: '', isCustom: true };

interface SupersetPickerSheetProps {
  visible: boolean;
  /** Упражнение, которое пользователь хочет объединить; в списке его нет. */
  draftExercise: DraftExercise | undefined;
  allDraftExercises: DraftExercise[];
  exercisesById: Map<string, ExerciseRow>;
  onClose: () => void;
}

/** Список остальных упражнений шаблона, чтобы объединить их в суперсет с выбранным. */
export function SupersetPickerSheet({
  visible,
  draftExercise,
  allDraftExercises,
  exercisesById,
  onClose,
}: SupersetPickerSheetProps) {
  const { t: translate, i18n } = useTranslation();
  const setSupersetGroup = useRoutineDraft((state) => state.setSupersetGroup);
  const otherExercises = allDraftExercises.filter((other) => other.id !== draftExercise?.id);

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.createSuperset')} unpadded>
      {otherExercises.map((otherExercise) => (
        <ListItem
          key={otherExercise.id}
          title={exerciseName(exercisesById.get(otherExercise.exerciseId) ?? UNKNOWN_EXERCISE, i18n.language)}
          onPress={() => {
            // Присоединиться к существующему суперсету партнёра или создать новый, если его нет.
            if (draftExercise) {
              setSupersetGroup(
                [draftExercise.id, otherExercise.id],
                otherExercise.supersetGroup ?? NEW_SUPERSET_GROUP,
              );
            }
            onClose();
          }}
        />
      ))}
    </Sheet>
  );
}
