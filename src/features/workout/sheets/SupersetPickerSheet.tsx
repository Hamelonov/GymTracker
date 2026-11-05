import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise } from '@/domain/types';
import { ListItem, Sheet } from '@/ui';
import { exerciseDisplayName } from '../exerciseDisplayName';

interface SupersetPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Все упражнения тренировки, кроме того, с которого начинается суперсет. */
  partnerCandidates: ActiveExercise[];
  exercisesById: Map<string, ExerciseRow>;
  onPartnerPress: (partner: ActiveExercise) => void;
}

/** Список остальных упражнений тренировки, чтобы объединить их в суперсет. */
export function SupersetPickerSheet({
  visible,
  onClose,
  partnerCandidates,
  exercisesById,
  onPartnerPress,
}: SupersetPickerSheetProps) {
  const { t: translate, i18n } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.createSuperset')} unpadded>
      {partnerCandidates.map((partner) => (
        <ListItem
          key={partner.id}
          title={exerciseDisplayName(exercisesById.get(partner.exerciseId), i18n.language)}
          subtitle={
            partner.supersetGroup != null
              ? `${translate('workout.superset')} ${partner.supersetGroup}`
              : undefined
          }
          onPress={() => onPartnerPress(partner)}
        />
      ))}
    </Sheet>
  );
}
