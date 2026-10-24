import { push } from '@/lib/nav';
import { Dumbbell, Folder, FolderPlus, Play, Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { getExercisesByIds } from '@/db/repo/exercises';
import {
  createFolder,
  deleteFolder,
  getRoutine,
  listFolders,
  listRoutines,
  moveRoutineToFolder,
  renameFolder,
  type RoutineSummary,
} from '@/db/repo/routines';
import { useQuery } from '@/db/version';
import { FolderMenuSheet } from '@/features/home/FolderMenuSheet';
import { FolderNameSheet } from '@/features/home/FolderNameSheet';
import { MoveToFolderSheet } from '@/features/home/MoveToFolderSheet';
import { ResumeWorkoutBanner } from '@/features/home/ResumeWorkoutBanner';
import { RoutineMenuSheet } from '@/features/home/RoutineMenuSheet';
import { WeekSummaryCard } from '@/features/home/WeekSummaryCard';
import { RoutineCard } from '@/features/routines/RoutineCard';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { useNow } from '@/lib/useNow';
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Pressable,
  Screen,
  SectionTitle,
  Text,
  confirm,
  spacing,
} from '@/ui';

/** Какой нижний лист открыт на главном экране (только один за раз). */
type OpenSheet =
  | { kind: 'none' }
  | { kind: 'routineMenu'; routineId: string }
  | { kind: 'moveToFolder'; routineId: string }
  | { kind: 'folderName'; folderId?: string }
  | { kind: 'folderMenu'; folderId: string };

function getWorkoutNameForTimeOfDay(translate: (key: string) => string, now: number): string {
  const hour = new Date(now).getHours();
  if (hour < 12) return translate('workout.morning');
  if (hour < 17) return translate('workout.afternoon');
  if (hour < 22) return translate('workout.evening');
  return translate('workout.night');
}

export default function HomeTab() {
  const { t: translate } = useTranslation();
  const now = useNow();
  const [openSheet, setOpenSheet] = useState<OpenSheet>({ kind: 'none' });
  const [folderName, setFolderName] = useState('');
  const activeWorkout = useActiveWorkout((state) => state.workout);
  const session = useActiveWorkout((state) => state.session);
  // Только после ухода с экрана тренировки, но не во время его открытия.
  const isResumeBannerVisible = useActiveWorkout(
    (state) => !!state.workout && state.minimized && state.session.mode === 'new',
  );
  const routines = useQuery(() => listRoutines(), []);
  const folders = useQuery(() => listFolders(), []);
  const exerciseIds = useMemo(
    () => [...new Set(routines.flatMap((routine) => routine.exerciseIds))],
    [routines],
  );
  const exercisesById = useQuery(() => getExercisesByIds(exerciseIds), [exerciseIds.join(',')]);

  const closeSheet = () => setOpenSheet({ kind: 'none' });

  /** Спрашивает, отбросить ли незавершённую тренировку перед началом новой. Возвращает false, если пользователь отменил. */
  const discardActiveWorkoutIfConfirmed = async () => {
    if (!activeWorkout || session.mode === 'edit') return true;
    const isConfirmed = await confirm({
      title: translate('home.inProgress'),
      message: translate('workout.discardConfirm'),
      destructive: true,
      confirmLabel: translate('common.discard'),
    });
    if (isConfirmed) {
      useRestTimer.getState().skip();
      useActiveWorkout.getState().clear();
    }
    return isConfirmed;
  };

  const startEmptyWorkout = async () => {
    if (!(await discardActiveWorkoutIfConfirmed())) return;
    useActiveWorkout.getState().startEmpty(getWorkoutNameForTimeOfDay(translate, Date.now()));
    push('/workout/active');
  };

  const startRoutine = async (routineId: string) => {
    if (!(await discardActiveWorkoutIfConfirmed())) return;
    const routine = getRoutine(routineId);
    if (!routine) return;
    useActiveWorkout.getState().startFromRoutine(routine);
    push('/workout/active');
  };

  const openNewFolderSheet = () => {
    setFolderName('');
    setOpenSheet({ kind: 'folderName' });
  };

  const saveFolderName = () => {
    if (openSheet.kind === 'folderName' && openSheet.folderId) renameFolder(openSheet.folderId, folderName);
    else createFolder(folderName);
    closeSheet();
  };

  const selectedRoutine =
    openSheet.kind === 'routineMenu' || openSheet.kind === 'moveToFolder'
      ? routines.find((routine) => routine.id === openSheet.routineId)
      : undefined;
  const selectedFolder =
    openSheet.kind === 'folderMenu' ? folders.find((folder) => folder.id === openSheet.folderId) : undefined;
  // Шаблоны с удалённой папкой показываются вместе с шаблонами без папки.
  const routinesWithoutFolder = routines.filter(
    (routine) => routine.folderId == null || !folders.some((folder) => folder.id === routine.folderId),
  );

  const renderRoutineCard = (routine: RoutineSummary) => (
    <RoutineCard
      key={routine.id}
      routine={routine}
      exercises={exercisesById}
      onStart={() => startRoutine(routine.id)}
      onMenu={() => setOpenSheet({ kind: 'routineMenu', routineId: routine.id })}
      onPress={() => push({ pathname: '/routine/[id]', params: { id: routine.id } })}
    />
  );

  return (
    <Screen header={{ title: translate('home.title'), large: true }} contentStyle={{ paddingBottom: 120 }}>
      {isResumeBannerVisible ? (
        <ResumeWorkoutBanner workoutName={activeWorkout?.name} onPress={() => push('/workout/active')} />
      ) : null}

      <WeekSummaryCard now={now} />

      <SectionTitle title={translate('home.quickStart')} />
      <Button
        title={translate('home.startEmpty')}
        size="lg"
        fullWidth
        icon={<Icon icon={Play} size={20} color="onAccent" strokeWidth={2.5} />}
        onPress={startEmptyWorkout}
      />

      <SectionTitle
        title={translate('home.routines')}
        right={
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <IconButton icon={FolderPlus} size={18} onPress={openNewFolderSheet} haptic="selection" />
            <IconButton
              icon={Plus}
              size={18}
              variant="filled"
              onPress={() => push('/routine/edit')}
              haptic="selection"
            />
          </View>
        }
      />
      {routines.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={translate('home.noRoutines')}
          hint={translate('home.noRoutinesHint')}
          action={
            <Button
              title={translate('home.newRoutine')}
              variant="secondary"
              onPress={() => push('/routine/edit')}
            />
          }
        />
      ) : null}
      {folders.map((folder) => {
        const routinesInFolder = routines.filter((routine) => routine.folderId === folder.id);
        return (
          <View key={folder.id} style={{ marginBottom: spacing.sm }}>
            <Pressable
              onPress={() => setOpenSheet({ kind: 'folderMenu', folderId: folder.id })}
              style={styles.folderHeader}
              haptic="selection"
            >
              <Icon icon={Folder} size={16} color="muted" />
              <Text variant="caption" color="muted" style={{ flex: 1 }}>
                {folder.name}
              </Text>
              <Text variant="caption" color="faint">
                {routinesInFolder.length}
              </Text>
            </Pressable>
            {routinesInFolder.map(renderRoutineCard)}
          </View>
        );
      })}
      {routinesWithoutFolder.map(renderRoutineCard)}

      <RoutineMenuSheet
        visible={openSheet.kind === 'routineMenu'}
        routine={selectedRoutine}
        hasFolders={folders.length > 0}
        onClose={closeSheet}
        onStartRoutine={(routineId) => void startRoutine(routineId)}
        onOpenMoveToFolder={(routineId) => setOpenSheet({ kind: 'moveToFolder', routineId })}
      />

      <MoveToFolderSheet
        visible={openSheet.kind === 'moveToFolder'}
        folders={folders}
        onClose={closeSheet}
        onSelectFolder={(folderId) => {
          if (selectedRoutine) moveRoutineToFolder(selectedRoutine.id, folderId);
          closeSheet();
        }}
      />

      <FolderNameSheet
        visible={openSheet.kind === 'folderName'}
        isRenaming={openSheet.kind === 'folderName' && Boolean(openSheet.folderId)}
        folderName={folderName}
        onChangeFolderName={setFolderName}
        onClose={closeSheet}
        onSave={saveFolderName}
      />

      <FolderMenuSheet
        visible={openSheet.kind === 'folderMenu'}
        folderName={selectedFolder?.name}
        onClose={closeSheet}
        onRename={() => {
          if (openSheet.kind !== 'folderMenu') return;
          setFolderName(selectedFolder?.name ?? '');
          setOpenSheet({ kind: 'folderName', folderId: openSheet.folderId });
        }}
        onDelete={() => {
          if (openSheet.kind === 'folderMenu') deleteFolder(openSheet.folderId);
          closeSheet();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
  },
});
