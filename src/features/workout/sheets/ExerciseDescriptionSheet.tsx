import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { updateExercise } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise } from '@/domain/types';
import { Button, Input, Sheet, Text, spacing } from '@/ui';
import { exerciseDisplayDescription, exerciseDisplayName } from '../exerciseDisplayName';

interface ExerciseDescriptionSheetProps {
  visible: boolean;
  onClose: () => void;
  workoutExercise: ActiveExercise | undefined;
  exerciseDetails: ExerciseRow | undefined;
}

/** The exercise's permanent description, readable and editable in place. */
export function ExerciseDescriptionSheet({
  visible,
  onClose,
  workoutExercise,
  exerciseDetails,
}: ExerciseDescriptionSheetProps) {
  const { t: translate, i18n } = useTranslation();
  // null while reading; a string while the user edits the description.
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);
  const description = exerciseDisplayDescription(exerciseDetails, i18n.language);

  const closeAndDiscardDraft = () => {
    setDescriptionDraft(null);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={closeAndDiscardDraft} title={translate('workout.description')}>
      {workoutExercise ? (
        <View>
          <Text variant="caption" color="muted" style={{ marginBottom: spacing.sm }}>
            {exerciseDisplayName(exerciseDetails, i18n.language)}
          </Text>
          {descriptionDraft != null ? (
            <>
              <Input
                value={descriptionDraft}
                onChangeText={setDescriptionDraft}
                placeholder={translate('exercise.descriptionPlaceholder')}
                multiline
              />
              <Button
                title={translate('common.save')}
                size="lg"
                fullWidth
                onPress={() => {
                  updateExercise(workoutExercise.exerciseId, { description: descriptionDraft });
                  closeAndDiscardDraft();
                }}
                style={{ marginTop: spacing.lg }}
              />
            </>
          ) : (
            <>
              {description ? (
                <Text style={{ lineHeight: 22 }}>{description}</Text>
              ) : (
                <Text color="faint">{translate('workout.noDescription')}</Text>
              )}
              <Button
                title={translate('common.edit')}
                variant="secondary"
                fullWidth
                onPress={() => setDescriptionDraft(description)}
                style={{ marginTop: spacing.lg }}
              />
            </>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
