import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { NEW_SUPERSET_GROUP, useRoutineDraft, type DraftExercise } from '@/store/routineDraft';
import { ListItem, Sheet, spacing } from '@/ui';

const UNKNOWN_EXERCISE = { nameEn: '', nameRu: '', isCustom: true };

interface SupersetPickerSheetProps {
  visible: boolean;
  /** The exercise the user wants to pair; it is left out of the list. */
  draftExercise: DraftExercise | undefined;
  allDraftExercises: DraftExercise[];
  exercisesById: Map<string, ExerciseRow>;
  onClose: () => void;
}

/** Lists the other exercises of the routine to join into a superset with the selected one. */
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
      <View style={{ paddingHorizontal: spacing.sm }}>
        {otherExercises.map((otherExercise) => (
          <ListItem
            key={otherExercise.id}
            title={exerciseName(
              exercisesById.get(otherExercise.exerciseId) ?? UNKNOWN_EXERCISE,
              i18n.language,
            )}
            onPress={() => {
              // Join the partner's existing superset, or start a new one if it has none.
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
      </View>
    </Sheet>
  );
}
