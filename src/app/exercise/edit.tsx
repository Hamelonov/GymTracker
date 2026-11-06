import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  createExercise,
  deleteExercise,
  exerciseDescription,
  exerciseName,
  getExercise,
  updateExercise,
} from '@/db/repo/exercises';
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
import { useSettings } from '@/store/settings';
import { Button, Input, Screen, SelectInput, confirm, spacing, useColors } from '@/ui';

/** null означает «использовать время отдыха по умолчанию из настроек». */
const REST_TIME_OPTIONS_SECONDS = [null, 0, 30, 45, 60, 90, 120, 150, 180, 240];

type SelectKey = 'rest' | 'type' | 'muscle' | 'secondaryMuscles' | 'equipment';

/** Встроенные упражнения сохраняют название из библиотеки, поэтому поле названия заполнено только у своих. */
function getInitialName(existingExercise: ExerciseRow | undefined): string {
  if (!existingExercise || !existingExercise.isCustom) return '';
  return existingExercise.nameEn;
}

export default function ExerciseEditScreen() {
  const { id, addToWorkout } = useLocalSearchParams<{ id?: string; addToWorkout?: string }>();
  const { t: translate, i18n } = useTranslation();
  const colors = useColors();
  const defaultRestSeconds = useSettings((state) => state.defaultRestSeconds);
  const existingExercise = id ? getExercise(id) : undefined;
  // У встроенных упражнений можно менять только описание и время отдыха.
  const isBuiltinExercise = !!existingExercise && !existingExercise.isCustom;
  const builtinDescription = existingExercise
    ? exerciseDescription({ ...existingExercise, description: null }, i18n.language)
    : '';
  const [name, setName] = useState(() => getInitialName(existingExercise));
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(existingExercise?.muscleGroup ?? 'chest');
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>(
    existingExercise?.secondaryMuscles ?? [],
  );
  const [equipment, setEquipment] = useState<Equipment>(existingExercise?.equipment ?? 'barbell');
  const [exerciseType, setExerciseType] = useState<ExerciseType>(existingExercise?.type ?? 'weight_reps');
  const [description, setDescription] = useState(() =>
    existingExercise ? exerciseDescription(existingExercise, i18n.language) : '',
  );
  const [restSeconds, setRestSeconds] = useState<number | null>(existingExercise?.restSeconds ?? null);
  const [openSelect, setOpenSelect] = useState<SelectKey | null>(null);

  const canSave = isBuiltinExercise || name.trim().length > 0;

  const getRestOptionLabel = (seconds: number | null) => {
    if (seconds == null)
      return translate('exercise.restDefault', { time: formatDuration(defaultRestSeconds) });
    if (seconds === 0) return translate('workout.restOff');
    return formatDuration(seconds);
  };

  /** Открыт только один список: новый закрывает прошлый, повторное нажатие закрывает свой. */
  const getSelectState = (selectKey: SelectKey) => ({
    isOpen: openSelect === selectKey,
    onToggle: () => setOpenSelect((currentKey) => (currentKey === selectKey ? null : selectKey)),
  });

  const toggleSecondaryMuscle = (muscle: MuscleGroup) =>
    setSecondaryMuscles((previous) =>
      previous.includes(muscle)
        ? previous.filter((selectedMuscle) => selectedMuscle !== muscle)
        : [...previous, muscle],
    );

  const saveExercise = () => {
    // Текст из библиотеки не копируем к себе: иначе описание перестанет меняться вместе с языком.
    const descriptionToSave = description.trim() === builtinDescription.trim() ? '' : description;
    const editableFields = {
      name,
      muscleGroup,
      secondaryMuscles,
      equipment,
      type: exerciseType,
      description: descriptionToSave,
      restSeconds,
    };
    if (existingExercise) {
      updateExercise(
        existingExercise.id,
        isBuiltinExercise ? { description: descriptionToSave, restSeconds } : editableFields,
      );
      router.back();
      return;
    }
    const createdExercise = createExercise(editableFields);
    // Открыто из выбора упражнения во время тренировки: сразу добавляем новое упражнение в тренировку.
    if (addToWorkout === 'true') {
      useActiveWorkout.getState().addExercises([createdExercise.id]);
      router.dismissTo('/workout/active');
      return;
    }
    router.back();
  };

  const deleteAfterConfirm = async () => {
    if (!existingExercise) return;
    const isConfirmed = await confirm({
      title: translate('exercise.deleteConfirm', { name: exerciseName(existingExercise, i18n.language) }),
      destructive: true,
      confirmLabel: translate('common.delete'),
    });
    if (!isConfirmed) return;
    deleteExercise(existingExercise.id);
    // Экран упражнения под этим окном больше нечего показывать, поэтому уходим сразу к списку.
    router.dismissTo('/exercises');
  };

  const muscleItems = MUSCLE_GROUPS.map((muscle) => ({
    id: muscle,
    name: translate(`muscles.${muscle}`),
  }));

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
          containerStyle={styles.firstField}
        />
      ) : null}

      <Input
        label={translate('exercise.description')}
        value={description}
        onChangeText={setDescription}
        placeholder={translate('exercise.descriptionPlaceholder')}
        multiline
        containerStyle={isBuiltinExercise ? styles.firstField : styles.field}
      />

      <SelectInput
        {...getSelectState('rest')}
        label={translate('exercise.restSeconds')}
        items={REST_TIME_OPTIONS_SECONDS.map((seconds) => ({
          id: String(seconds),
          name: getRestOptionLabel(seconds),
        }))}
        selectedIds={[String(restSeconds)]}
        onSelect={(selectedId) => {
          setRestSeconds(REST_TIME_OPTIONS_SECONDS.find((seconds) => String(seconds) === selectedId) ?? null);
          setOpenSelect(null);
        }}
        containerStyle={styles.field}
      />

      {!isBuiltinExercise ? (
        <>
          <SelectInput
            {...getSelectState('type')}
            label={translate('exercise.type')}
            items={EXERCISE_TYPES.map((type) => ({ id: type, name: translate(`types.${type}`) }))}
            selectedIds={[exerciseType]}
            onSelect={(selectedId) => {
              const selectedType = EXERCISE_TYPES.find((type) => type === selectedId);
              if (selectedType) setExerciseType(selectedType);
              setOpenSelect(null);
            }}
            containerStyle={styles.field}
          />
          <SelectInput
            {...getSelectState('muscle')}
            label={translate('exercise.muscleGroup')}
            items={muscleItems}
            selectedIds={[muscleGroup]}
            onSelect={(selectedId) => {
              const selectedMuscle = MUSCLE_GROUPS.find((muscle) => muscle === selectedId);
              if (selectedMuscle) setMuscleGroup(selectedMuscle);
              setOpenSelect(null);
            }}
            containerStyle={styles.field}
          />
          {/* Выбор нескольких: список не закрывается после нажатия. */}
          <SelectInput
            {...getSelectState('secondaryMuscles')}
            label={translate('exercise.secondaryMuscles')}
            items={muscleItems.filter((item) => item.id !== muscleGroup)}
            selectedIds={secondaryMuscles}
            placeholder={translate('exercise.noSecondaryMuscles')}
            onSelect={(selectedId) => {
              const selectedMuscle = MUSCLE_GROUPS.find((muscle) => muscle === selectedId);
              if (selectedMuscle) toggleSecondaryMuscle(selectedMuscle);
            }}
            containerStyle={styles.field}
          />
          <SelectInput
            {...getSelectState('equipment')}
            label={translate('exercise.equipment')}
            items={EQUIPMENT.map((option) => ({ id: option, name: translate(`equipment.${option}`) }))}
            selectedIds={[equipment]}
            onSelect={(selectedId) => {
              const selectedEquipment = EQUIPMENT.find((option) => option === selectedId);
              if (selectedEquipment) setEquipment(selectedEquipment);
              setOpenSelect(null);
            }}
            containerStyle={styles.field}
          />
        </>
      ) : null}

      {existingExercise?.isCustom ? (
        <View style={styles.field}>
          <Button
            title={translate('exercise.deleteExercise')}
            variant="ghost"
            textColor={colors.danger}
            fullWidth
            onPress={deleteAfterConfirm}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  firstField: { marginTop: spacing.sm },
  field: { marginTop: spacing.lg },
});
