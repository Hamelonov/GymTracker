import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ExerciseRow } from '@/db/schema';
import { availableExtraFields } from '@/domain/extraFields';
import {
  getSetFieldsForExerciseType,
  type ActiveExercise,
  type ExtraField,
  type WeightUnit,
} from '@/domain/types';
import { unitLabels } from '@/domain/units';
import { SettingSwitchRow } from '@/features/settings/SettingSwitchRow';
import { Checkbox, ListItem, Sheet, Text, spacing, useColors } from '@/ui';

interface ExtraFieldsSheetProps {
  visible: boolean;
  onClose: () => void;
  workoutExercise: ActiveExercise | undefined;
  exerciseDetails: ExerciseRow | undefined;
  weightUnit: WeightUnit;
  onToggleField: (workoutExerciseId: string, field: ExtraField) => void;
  onRememberChange: (exerciseId: string, remember: boolean) => void;
}

const LABEL_KEY_BY_FIELD: Record<ExtraField, string> = {
  weight: 'workout.extraFieldWeight',
  rir: 'workout.extraFieldRir',
  rpe: 'workout.extraFieldRpe',
};

/** Шторка «Дополнительные поля»: галочки колонок этой карточки и переключатель запоминания для упражнения. */
export function ExtraFieldsSheet({
  visible,
  onClose,
  workoutExercise,
  exerciseDetails,
  weightUnit,
  onToggleField,
  onRememberChange,
}: ExtraFieldsSheetProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const fields = getSetFieldsForExerciseType(exerciseDetails?.type ?? 'weight_reps');
  const enabledFields = workoutExercise?.extraFields ?? [];
  // «Запоминать» включено ровно тогда, когда у упражнения есть запомненный список полей.
  const isRemembered = (exerciseDetails?.rememberedExtraFields.length ?? 0) > 0;

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.extraFieldsTitle')} unpadded>
      <View style={styles.list}>
        {availableExtraFields(fields).map((field) => (
          <ListItem
            key={field}
            title={translate(LABEL_KEY_BY_FIELD[field], { unit: unitLabels[weightUnit] ?? weightUnit })}
            right={<Checkbox checked={enabledFields.includes(field)} />}
            onPress={() => {
              if (workoutExercise) onToggleField(workoutExercise.id, field);
            }}
          />
        ))}
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <SettingSwitchRow
        title={translate('workout.rememberExtraFields')}
        value={isRemembered}
        disabled={enabledFields.length === 0 && !isRemembered}
        onChange={(remember) => {
          if (exerciseDetails) onRememberChange(exerciseDetails.id, remember);
        }}
      />
      <Text variant="caption" color="muted" style={styles.hint}>
        {translate('workout.rememberExtraFieldsHint')}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm, marginHorizontal: spacing.lg },
  hint: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
