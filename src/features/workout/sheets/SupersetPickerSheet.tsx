import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise } from '@/domain/types';
import { ListItem, Sheet, spacing } from '@/ui';
import { exerciseDisplayName } from '../exerciseDisplayName';

interface SupersetPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Every exercise of the workout except the one the superset starts from. */
  partnerCandidates: ActiveExercise[];
  exercisesById: Map<string, ExerciseRow>;
  onPartnerPress: (partner: ActiveExercise) => void;
}

/** Lists the other exercises of the workout to pair into a superset. */
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
      <View style={styles.menuList}>
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
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  menuList: { paddingHorizontal: spacing.sm },
});
