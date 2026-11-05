import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { push } from '@/lib/nav';
import { Plus } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { getExercisesByIds } from '@/db/repo/exercises';
import { createRoutine, getRoutine, listFolders, updateRoutine, type RoutineInput } from '@/db/repo/routines';
import { useQuery } from '@/db/version';
import { newId } from '@/domain/ids';
import { RoutineExerciseEditor } from '@/features/routines/RoutineExerciseEditor';
import { RoutineExerciseMenuSheet } from '@/features/routines/RoutineExerciseMenuSheet';
import { SupersetPickerSheet } from '@/features/routines/SupersetPickerSheet';
import { RestTimerPickerSheet } from '@/features/workout/sheets/RestTimerPickerSheet';
import { SetTypePickerSheet } from '@/features/workout/sheets/SetTypePickerSheet';
import { usePickerResult } from '@/store/picker';
import { useRoutineDraft } from '@/store/routineDraft';
import { useSettings } from '@/store/settings';
import { Button, Chip, Icon, Input, Screen, SectionTitle, spacing, toast } from '@/ui';

/** Какой нижний лист открыт в редакторе шаблона (только один за раз). */
type OpenSheet =
  | { kind: 'none' }
  | { kind: 'exerciseMenu'; draftExerciseId: string }
  | { kind: 'restTime'; draftExerciseId: string }
  | { kind: 'setType'; draftExerciseId: string; setId: string }
  | { kind: 'supersetPicker'; draftExerciseId: string };

export default function RoutineEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t: translate } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  const defaultRestSeconds = useSettings((state) => state.defaultRestSeconds);
  const draft = useRoutineDraft();
  // Ленивый инициализатор состояния: сбрасывает черновик один раз при монтировании экрана и создаёт токен выбора.
  const [pickerToken] = useState(() => {
    useRoutineDraft.getState().reset(id ? getRoutine(id) : undefined);
    return newId();
  });
  const [openSheet, setOpenSheet] = useState<OpenSheet>({ kind: 'none' });
  const folders = useQuery(() => listFolders(), []);

  useFocusEffect(
    useCallback(() => {
      const pickedExerciseIds = usePickerResult.getState().consume(pickerToken);
      if (pickedExerciseIds && pickedExerciseIds.length) {
        useRoutineDraft.getState().addExercises(pickedExerciseIds);
      }
    }, [pickerToken]),
  );

  const exerciseIds = useMemo(
    () => draft.exercises.map((draftExercise) => draftExercise.exerciseId),
    [draft.exercises],
  );
  const exercisesById = useQuery(() => getExercisesByIds(exerciseIds), [exerciseIds.join(',')]);
  const units = useMemo(() => ({ weight: weightUnit, distance: distanceUnit }), [weightUnit, distanceUnit]);
  const selectedExercise =
    'draftExerciseId' in openSheet
      ? draft.exercises.find((draftExercise) => draftExercise.id === openSheet.draftExerciseId)
      : undefined;
  const selectedExerciseIndex = selectedExercise ? draft.exercises.indexOf(selectedExercise) : -1;
  const hasNoExercises = draft.exercises.length === 0;

  const closeSheet = () => setOpenSheet({ kind: 'none' });

  const saveRoutine = () => {
    const routineInput: RoutineInput = {
      name: draft.name,
      notes: draft.notes,
      folderId: draft.folderId,
      exercises: draft.exercises.map((draftExercise) => ({
        exerciseId: draftExercise.exerciseId,
        supersetGroup: draftExercise.supersetGroup,
        restSeconds: draftExercise.restSeconds,
        note: draftExercise.note,
        // Id подходов, существующие только в черновике, отбрасываются; база данных создаёт свои.
        sets: draftExercise.sets.map(({ id: _draftSetId, ...setValues }) => setValues),
      })),
    };
    if (draft.id) updateRoutine(draft.id, routineInput);
    else createRoutine(routineInput);
    toast(translate('routine.saved'));
    router.back();
  };

  return (
    <Screen
      header={{
        backButton: 'close',
        title: draft.id ? translate('routine.editTitle') : translate('routine.newTitle'),
      }}
      footer={
        <Button
          title={translate('common.save')}
          size="lg"
          fullWidth
          disabled={!draft.name.trim()}
          onPress={saveRoutine}
        />
      }
    >
      <Input
        label={translate('routine.name')}
        value={draft.name}
        onChangeText={draft.setName}
        placeholder={translate('routine.namePlaceholder')}
        autoFocus={!draft.id}
        containerStyle={{ marginTop: spacing.sm }}
      />
      <Input
        label={translate('routine.notes')}
        value={draft.notes}
        onChangeText={draft.setNotes}
        placeholder={translate('routine.notesPlaceholder')}
        multiline
        containerStyle={{ marginTop: spacing.lg }}
      />
      {folders.length > 0 ? (
        <>
          <SectionTitle title={translate('routine.folder')} />
          <View style={styles.folderChips}>
            <Chip
              label={translate('home.noFolder')}
              selected={draft.folderId == null}
              onPress={() => draft.setFolderId(null)}
            />
            {folders.map((folder) => (
              <Chip
                key={folder.id}
                label={folder.name}
                selected={draft.folderId === folder.id}
                onPress={() => draft.setFolderId(folder.id)}
              />
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle title={translate('routine.exercises')} />
      {draft.exercises.map((draftExercise) => (
        <RoutineExerciseEditor
          key={draftExercise.id}
          draftExercise={draftExercise}
          exercise={exercisesById.get(draftExercise.exerciseId)}
          units={units}
          defaultRestSeconds={defaultRestSeconds}
          onOpenRestSheet={(draftExerciseId) => setOpenSheet({ kind: 'restTime', draftExerciseId })}
          onOpenMenuSheet={(draftExerciseId) => setOpenSheet({ kind: 'exerciseMenu', draftExerciseId })}
          onOpenSetTypeSheet={(draftExerciseId, setId) =>
            setOpenSheet({ kind: 'setType', draftExerciseId, setId })
          }
        />
      ))}
      <Button
        title={translate('workout.addExercise')}
        size="lg"
        fullWidth
        variant={hasNoExercises ? 'primary' : 'secondary'}
        icon={<Icon icon={Plus} size={20} color={hasNoExercises ? 'onAccent' : 'text'} strokeWidth={2.5} />}
        onPress={() =>
          push({ pathname: '/exercise/picker', params: { mode: 'routine', token: pickerToken } })
        }
      />

      <RoutineExerciseMenuSheet
        visible={openSheet.kind === 'exerciseMenu'}
        draftExercise={selectedExercise}
        exerciseIndex={selectedExerciseIndex}
        exerciseCount={draft.exercises.length}
        onClose={closeSheet}
        onOpenSupersetPicker={(draftExerciseId) => setOpenSheet({ kind: 'supersetPicker', draftExerciseId })}
      />

      <SupersetPickerSheet
        visible={openSheet.kind === 'supersetPicker'}
        draftExercise={selectedExercise}
        allDraftExercises={draft.exercises}
        exercisesById={exercisesById}
        onClose={closeSheet}
      />

      <RestTimerPickerSheet
        visible={openSheet.kind === 'restTime'}
        selectedSeconds={selectedExercise?.restSeconds ?? null}
        defaultRestSeconds={defaultRestSeconds}
        onClose={closeSheet}
        onRestSelect={(restSeconds) => {
          if (selectedExercise) draft.setRestSeconds(selectedExercise.id, restSeconds);
          closeSheet();
        }}
      />

      <SetTypePickerSheet
        visible={openSheet.kind === 'setType'}
        onClose={closeSheet}
        onSetTypeSelect={(setType) => {
          if (openSheet.kind === 'setType') {
            draft.updateSet(openSheet.draftExerciseId, openSheet.setId, { type: setType });
          }
          closeSheet();
        }}
        onDeleteSetPress={() => {
          if (openSheet.kind === 'setType') draft.removeSet(openSheet.draftExerciseId, openSheet.setId);
          closeSheet();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  folderChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
