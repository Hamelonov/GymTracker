import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { createExercise, getExercise, updateExercise } from '@/db/repo/exercises';
import { EQUIPMENT, EXERCISE_TYPES, MUSCLE_GROUPS, type Equipment, type ExerciseType, type MuscleGroup } from '@/domain/types';
import { formatDuration } from '@/domain/units';
import { useActiveWorkout } from '@/store/activeWorkout';
import { Button, Chip, Input, Screen, SectionTitle, Text, radius, spacing, useColors } from '@/ui';

const REST_OPTIONS = [null, 0, 30, 60, 90, 120, 180, 240];

export default function ExerciseEditScreen() {
  const { id, pick } = useLocalSearchParams<{ id?: string; pick?: string }>();
  const { t } = useTranslation();
  const c = useColors();
  const existing = id ? getExercise(id) : undefined;
  const locked = !!existing && !existing.isCustom;
  const [name, setName] = useState(existing ? (existing.isCustom ? existing.nameEn : '') : '');
  const [muscle, setMuscle] = useState<MuscleGroup>(existing?.muscleGroup ?? 'chest');
  const [secondary, setSecondary] = useState<MuscleGroup[]>(existing?.secondaryMuscles ?? []);
  const [equipment, setEquipment] = useState<Equipment>(existing?.equipment ?? 'barbell');
  const [type, setType] = useState<ExerciseType>(existing?.type ?? 'weight_reps');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [rest, setRest] = useState<number | null>(existing?.restSeconds ?? null);

  const valid = locked || name.trim().length > 0;

  const save = () => {
    if (existing) {
      updateExercise(existing.id, locked ? { description, restSeconds: rest } : { name, muscleGroup: muscle, secondaryMuscles: secondary, equipment, type, description, restSeconds: rest });
      router.back();
      return;
    }
    const row = createExercise({ name, muscleGroup: muscle, secondaryMuscles: secondary, equipment, type, description, restSeconds: rest });
    if (pick === '1') {
      useActiveWorkout.getState().addExercises([row.id]);
      router.dismissTo('/workout/active');
      return;
    }
    router.back();
  };

  return (
    <Screen
      header={{ back: 'close', title: existing ? t('exercise.edit') : t('exercise.new') }}
      footer={<Button title={t('common.save')} size="lg" full disabled={!valid} onPress={save} />}
    >
      {!locked ? (
        <Input label={t('exercise.name')} value={name} onChangeText={setName} placeholder={t('exercise.namePlaceholder')} autoFocus={!existing} containerStyle={{ marginTop: spacing.sm }} />
      ) : (
        <View style={[styles.lockedBox, { backgroundColor: c.surface }]}>
          <Text variant="caption" color="muted">
            {t('exercise.descriptionBuiltin')}
          </Text>
          <Text variant="caption" color="faint" style={{ marginTop: 2 }}>
            {existing?.descriptionEn ? (existing.descriptionRu && t('settings.langRu') === 'Русский' ? existing.descriptionRu : existing.descriptionEn) : ''}
          </Text>
        </View>
      )}

      <SectionTitle title={t('exercise.description')} />
      <Input value={description} onChangeText={setDescription} placeholder={t('exercise.descriptionPlaceholder')} multiline hint={t('exercise.descriptionHint')} />

      <SectionTitle title={t('exercise.restSeconds')} />
      <View style={styles.chips}>
        {REST_OPTIONS.map((r) => (
          <Chip key={String(r)} label={r == null ? t('settings.themeSystem') : r === 0 ? t('workout.restOff') : formatDuration(r)} selected={rest === r} onPress={() => setRest(r)} />
        ))}
      </View>
      <Text variant="caption" color="faint" style={{ marginTop: spacing.sm }}>
        {t('exercise.restSecondsHint')}
      </Text>

      {!locked ? (
        <>
          <SectionTitle title={t('exercise.type')} />
          <View style={styles.chips}>
            {EXERCISE_TYPES.map((x) => (
              <Chip key={x} label={t(`types.${x}`)} selected={type === x} onPress={() => setType(x)} />
            ))}
          </View>
          <SectionTitle title={t('exercise.muscleGroup')} />
          <View style={styles.chips}>
            {MUSCLE_GROUPS.map((m) => (
              <Chip key={m} label={t(`muscles.${m}`)} selected={muscle === m} onPress={() => setMuscle(m)} />
            ))}
          </View>
          <SectionTitle title={t('exercise.secondaryMuscles')} />
          <View style={styles.chips}>
            {MUSCLE_GROUPS.filter((m) => m !== muscle).map((m) => (
              <Chip key={m} label={t(`muscles.${m}`)} selected={secondary.includes(m)} onPress={() => setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))} />
            ))}
          </View>
          <SectionTitle title={t('exercise.equipment')} />
          <View style={styles.chips}>
            {EQUIPMENT.map((e) => (
              <Chip key={e} label={t(`equipment.${e}`)} selected={equipment === e} onPress={() => setEquipment(e)} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lockedBox: { padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm },
});
