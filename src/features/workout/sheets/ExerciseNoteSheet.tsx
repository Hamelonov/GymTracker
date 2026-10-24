import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise } from '@/domain/types';
import { Button, Input, Pressable, Sheet, Text, spacing } from '@/ui';
import { exerciseDisplayName } from '../exerciseDisplayName';

interface ExerciseNoteSheetProps {
  visible: boolean;
  workoutExercise: ActiveExercise | undefined;
  exerciseDetails: ExerciseRow | undefined;
  noteDraft: string;
  onNoteDraftChange: (note: string) => void;
  /** Заметка к этому упражнению с прошлого раза, предлагается скопировать одним нажатием. */
  lastNote: string | undefined;
  /** Сохраняет черновик и закрывает лист. Закрытие листа любым другим способом тоже сохраняет. */
  onSave: () => void;
}

/** Сегодняшняя заметка к одному упражнению тренировки. */
export function ExerciseNoteSheet({
  visible,
  workoutExercise,
  exerciseDetails,
  noteDraft,
  onNoteDraftChange,
  lastNote,
  onSave,
}: ExerciseNoteSheetProps) {
  const { t: translate, i18n } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onSave} title={translate('workout.exerciseNote')}>
      {workoutExercise ? (
        <View>
          <Text variant="caption" color="muted" style={{ marginBottom: spacing.sm }}>
            {exerciseDisplayName(exerciseDetails, i18n.language)}
          </Text>
          <Input
            value={noteDraft}
            onChangeText={onNoteDraftChange}
            placeholder={translate('workout.exerciseNotePlaceholder')}
            multiline
          />
          {lastNote && !noteDraft ? (
            <Pressable
              onPress={() => onNoteDraftChange(lastNote)}
              style={{ marginTop: spacing.md }}
              haptic="selection"
            >
              <Text variant="caption" color="muted">
                {translate('workout.copyLastNote')}: {lastNote}
              </Text>
            </Pressable>
          ) : null}
          <Button
            title={translate('common.save')}
            size="lg"
            fullWidth
            onPress={onSave}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      ) : null}
    </Sheet>
  );
}
