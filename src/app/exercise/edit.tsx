import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { createExercise, getExercise, updateExercise } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import {
  EQUIPMENT,
  EXERCISE_TYPES,
  MUSCLE_GROUPS,
  type Equipment,
  type ExerciseType,
  type MuscleGroup,
} from '@/domain/types';
import { formatDuration } from '@/domain/units';
import { useActiveWorkout } from '@/store/activeWorkout';
import { Button, Chip, Input, Screen, SectionTitle, Text, radius, spacing, useColors } from '@/ui';

/** null means "use the default rest time from settings". */
const REST_TIME_OPTIONS_SECONDS = [null, 0, 30, 60, 90, 120, 180, 240];

/** Built-in exercises keep their library name, so the name field only starts filled for custom ones. */
function getInitialName(existingExercise: ExerciseRow | undefined): string {
  if (!existingExercise || !existingExercise.isCustom) return '';
  return existingExercise.nameEn;
}

function getBuiltinDescription(
  existingExercise: ExerciseRow | undefined,
  isRussianInterface: boolean,
): string {
  if (!existingExercise?.descriptionEn) return '';
  if (existingExercise.descriptionRu && isRussianInterface) return existingExercise.descriptionRu;
  return existingExercise.descriptionEn;
}

export default function ExerciseEditScreen() {
  const { id, addToWorkout } = useLocalSearchParams<{ id?: string; addToWorkout?: string }>();
  const { t: translate } = useTranslation();
  const colors = useColors();
  const existingExercise = id ? getExercise(id) : undefined;
  // Built-in exercises only allow editing the description and rest time.
  const isBuiltinExercise = !!existingExercise && !existingExercise.isCustom;
  const [name, setName] = useState(() => getInitialName(existingExercise));
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(existingExercise?.muscleGroup ?? 'chest');
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>(
    existingExercise?.secondaryMuscles ?? [],
  );
  const [equipment, setEquipment] = useState<Equipment>(existingExercise?.equipment ?? 'barbell');
  const [exerciseType, setExerciseType] = useState<ExerciseType>(existingExercise?.type ?? 'weight_reps');
  const [description, setDescription] = useState(existingExercise?.description ?? '');
  const [restSeconds, setRestSeconds] = useState<number | null>(existingExercise?.restSeconds ?? null);

  const canSave = isBuiltinExercise || name.trim().length > 0;
  // The Russian translation of the language name tells us the interface is in Russian.
  const isRussianInterface = translate('settings.langRu') === 'Русский';

  const getRestOptionLabel = (seconds: number | null) => {
    if (seconds == null) return translate('settings.themeSystem');
    if (seconds === 0) return translate('workout.restOff');
    return formatDuration(seconds);
  };

  const toggleSecondaryMuscle = (muscle: MuscleGroup) =>
    setSecondaryMuscles((previous) =>
      previous.includes(muscle)
        ? previous.filter((selectedMuscle) => selectedMuscle !== muscle)
        : [...previous, muscle],
    );

  const saveExercise = () => {
    const editableFields = {
      name,
      muscleGroup,
      secondaryMuscles,
      equipment,
      type: exerciseType,
      description,
      restSeconds,
    };
    if (existingExercise) {
      updateExercise(existingExercise.id, isBuiltinExercise ? { description, restSeconds } : editableFields);
      router.back();
      return;
    }
    const createdExercise = createExercise(editableFields);
    // Opened from the picker during a workout: add the new exercise straight to the workout.
    if (addToWorkout === 'true') {
      useActiveWorkout.getState().addExercises([createdExercise.id]);
      router.dismissTo('/workout/active');
      return;
    }
    router.back();
  };

  return (
    <Screen
      header={{
        backButton: 'close',
        title: existingExercise ? translate('exercise.edit') : translate('exercise.new'),
      }}
      footer={
        <Button
          title={translate('common.save')}
          size="lg"
          fullWidth
          disabled={!canSave}
          onPress={saveExercise}
        />
      }
    >
      {!isBuiltinExercise ? (
        <Input
          label={translate('exercise.name')}
          value={name}
          onChangeText={setName}
          placeholder={translate('exercise.namePlaceholder')}
          autoFocus={!existingExercise}
          containerStyle={{ marginTop: spacing.sm }}
        />
      ) : (
        <View style={[styles.builtinDescriptionBox, { backgroundColor: colors.surface }]}>
          <Text variant="caption" color="muted">
            {translate('exercise.descriptionBuiltin')}
          </Text>
          <Text variant="caption" color="faint" style={{ marginTop: 2 }}>
            {getBuiltinDescription(existingExercise, isRussianInterface)}
          </Text>
        </View>
      )}

      <SectionTitle title={translate('exercise.description')} />
      <Input
        value={description}
        onChangeText={setDescription}
        placeholder={translate('exercise.descriptionPlaceholder')}
        multiline
        hint={translate('exercise.descriptionHint')}
      />

      <SectionTitle title={translate('exercise.restSeconds')} />
      <View style={styles.chips}>
        {REST_TIME_OPTIONS_SECONDS.map((seconds) => (
          <Chip
            key={String(seconds)}
            label={getRestOptionLabel(seconds)}
            selected={restSeconds === seconds}
            onPress={() => setRestSeconds(seconds)}
          />
        ))}
      </View>
      <Text variant="caption" color="faint" style={{ marginTop: spacing.sm }}>
        {translate('exercise.restSecondsHint')}
      </Text>

      {!isBuiltinExercise ? (
        <>
          <SectionTitle title={translate('exercise.type')} />
          <View style={styles.chips}>
            {EXERCISE_TYPES.map((typeOption) => (
              <Chip
                key={typeOption}
                label={translate(`types.${typeOption}`)}
                selected={exerciseType === typeOption}
                onPress={() => setExerciseType(typeOption)}
              />
            ))}
          </View>
          <SectionTitle title={translate('exercise.muscleGroup')} />
          <View style={styles.chips}>
            {MUSCLE_GROUPS.map((muscle) => (
              <Chip
                key={muscle}
                label={translate(`muscles.${muscle}`)}
                selected={muscleGroup === muscle}
                onPress={() => setMuscleGroup(muscle)}
              />
            ))}
          </View>
          <SectionTitle title={translate('exercise.secondaryMuscles')} />
          <View style={styles.chips}>
            {MUSCLE_GROUPS.filter((muscle) => muscle !== muscleGroup).map((muscle) => (
              <Chip
                key={muscle}
                label={translate(`muscles.${muscle}`)}
                selected={secondaryMuscles.includes(muscle)}
                onPress={() => toggleSecondaryMuscle(muscle)}
              />
            ))}
          </View>
          <SectionTitle title={translate('exercise.equipment')} />
          <View style={styles.chips}>
            {EQUIPMENT.map((equipmentOption) => (
              <Chip
                key={equipmentOption}
                label={translate(`equipment.${equipmentOption}`)}
                selected={equipment === equipmentOption}
                onPress={() => setEquipment(equipmentOption)}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  builtinDescriptionBox: { padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm },
});
