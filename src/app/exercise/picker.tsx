import { router, useLocalSearchParams } from 'expo-router';
import { push } from '@/lib/nav';
import { Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { useActiveWorkout } from '@/store/activeWorkout';
import { usePickerResult } from '@/store/picker';
import { Button, Header, spacing, useColors } from '@/ui';

/** workout: add to the active workout; routine: hand back to the routine editor; replace: swap one exercise. */
type PickerMode = 'workout' | 'routine' | 'replace';

export default function ExercisePickerScreen() {
  const params = useLocalSearchParams<{ mode?: PickerMode; token?: string; target?: string }>();
  const mode: PickerMode = params.mode ?? 'workout';
  const isReplaceMode = mode === 'replace';
  const { t: translate } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const selectedExerciseIdSet = useMemo(() => new Set(selectedExerciseIds), [selectedExerciseIds]);
  const addExercises = useActiveWorkout((state) => state.addExercises);
  const replaceExercise = useActiveWorkout((state) => state.replaceExercise);
  const publishPickerResult = usePickerResult((state) => state.publish);

  const finishWithExercises = (exerciseIds: string[]) => {
    if (exerciseIds.length === 0) return;
    if (mode === 'workout') addExercises(exerciseIds);
    else if (isReplaceMode && params.target) replaceExercise(params.target, exerciseIds[0] ?? '');
    else if (mode === 'routine' && params.token) publishPickerResult(params.token, exerciseIds);
    router.back();
  };

  const toggleExerciseSelection = (exerciseId: string) =>
    setSelectedExerciseIds((previous) =>
      previous.includes(exerciseId)
        ? previous.filter((selectedId) => selectedId !== exerciseId)
        : [...previous, exerciseId],
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Header
        title={isReplaceMode ? translate('workout.replaceExercise') : translate('workout.addExercises')}
        backButton="close"
      />
      <ExerciseList
        selectedIds={isReplaceMode ? undefined : selectedExerciseIdSet}
        onCreate={() =>
          push({ pathname: '/exercise/edit', params: { addToWorkout: isReplaceMode ? 'false' : 'true' } })
        }
        bottomPadding={selectedExerciseIds.length > 0 ? 90 : 0}
        onPress={(exercise) => {
          // Replacing takes exactly one exercise, so a tap finishes right away.
          if (isReplaceMode) {
            finishWithExercises([exercise.id]);
            return;
          }
          toggleExerciseSelection(exercise.id);
        }}
      />
      {selectedExerciseIds.length > 0 ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + spacing.md,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Button
            title={translate('exercise.addSelected', { count: selectedExerciseIds.length })}
            size="lg"
            fullWidth
            icon={<Plus size={20} color={colors.onAccent} strokeWidth={2.5} />}
            onPress={() => finishWithExercises(selectedExerciseIds)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
