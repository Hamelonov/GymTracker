import { push } from '@/lib/nav';
import { Dumbbell, Ellipsis, Folder, FolderPlus, Play, Plus } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
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
import { RoutineMenuSheet } from '@/features/home/RoutineMenuSheet';
import { WeekSummaryCard } from '@/features/home/WeekSummaryCard';
import { RoutineCard } from '@/features/routines/RoutineCard';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { nextWorkoutNumber, numberedWorkoutName } from '@/db/renameDefaultWorkoutNames';
import { useNow } from '@/lib/useNow';
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  FastPressable,
  ListGroup,
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

export default function HomeTab() {
  const { t: translate } = useTranslation();
  const now = useNow();
  const [openSheet, setOpenSheet] = useState<OpenSheet>({ kind: 'none' });
  const [folderName, setFolderName] = useState('');
  const routines = useQuery(() => listRoutines(), []);
  const folders = useQuery(() => listFolders(), []);
  const exerciseIds = useMemo(
    () => [...new Set(routines.flatMap((routine) => routine.exerciseIds))],
    [routines],
  );
  const exercisesById = useQuery(() => getExercisesByIds(exerciseIds), [exerciseIds.join(',')]);

  const closeSheet = () => setOpenSheet({ kind: 'none' });

  /** Спрашивает, отбросить ли незавершённую тренировку перед началом новой. Возвращает false, если пользователь отменил. */
  const discardActiveWorkoutIfConfirmed = useCallback(async () => {
    // Состояние читаем в момент нажатия: так колбэки остаются стабильными и строки шаблонов не перерисовываются.
    const { workout: activeWorkout, session } = useActiveWorkout.getState();
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
  }, [translate]);

  const startEmptyWorkout = async () => {
    if (!(await discardActiveWorkoutIfConfirmed())) return;
    useActiveWorkout.getState().startEmpty(numberedWorkoutName(nextWorkoutNumber()));
    push('/workout/active');
  };

  const startRoutine = useCallback(
    async (routineId: string) => {
      if (!(await discardActiveWorkoutIfConfirmed())) return;
      const routine = getRoutine(routineId);
      if (!routine) return;
      useActiveWorkout.getState().startFromRoutine(routine);
      push('/workout/active');
    },
    [discardActiveWorkoutIfConfirmed],
  );

  const openRoutineMenu = useCallback(
    (routineId: string) => setOpenSheet({ kind: 'routineMenu', routineId }),
    [],
  );
  const openRoutine = useCallback(
    (routineId: string) => push({ pathname: '/routine/[id]', params: { id: routineId } }),
    [],
  );

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
      onStart={startRoutine}
      onMenu={openRoutineMenu}
      onPress={openRoutine}
    />
  );

  return (
    <Screen header={{ title: translate('home.title'), large: true }} tabScreen>
      <WeekSummaryCard now={now} />

      <Button
        title={translate('home.startEmpty')}
        size="lg"
        fullWidth
        icon={<Icon icon={Play} size={20} color="onAccent" strokeWidth={2.5} />}
        onPress={startEmptyWorkout}
        style={styles.startEmptyButton}
      />

      <SectionTitle
        title={translate('home.routines')}
        right={
          <View style={styles.sectionActions}>
            <IconButton
              icon={FolderPlus}
              size={18}
              label={translate('home.newFolder')}
              onPress={openNewFolderSheet}
              haptic="selection"
            />
            <IconButton
              icon={Plus}
              size={18}
              variant="filled"
              label={translate('home.newRoutine')}
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
          <View key={folder.id} style={styles.folderBlock}>
            <FastPressable
              onPress={() => setOpenSheet({ kind: 'folderMenu', folderId: folder.id })}
              style={styles.folderHeader}
            >
              <Icon icon={Folder} size={16} color="muted" />
              <Text variant="caption" color="muted" style={styles.folderName}>
                {folder.name}
              </Text>
              <Text variant="caption" color="muted" tabular>
                {routinesInFolder.length}
              </Text>
              <Icon icon={Ellipsis} size={20} color="muted" />
            </FastPressable>
            {routinesInFolder.length > 0 ? (
              <ListGroup>{routinesInFolder.map(renderRoutineCard)}</ListGroup>
            ) : null}
          </View>
        );
      })}
      {routinesWithoutFolder.length > 0 ? (
        <ListGroup>{routinesWithoutFolder.map(renderRoutineCard)}</ListGroup>
      ) : null}

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
  startEmptyButton: { marginTop: spacing.lg },
  sectionActions: { flexDirection: 'row', gap: spacing.xs },
  folderBlock: { marginBottom: spacing.sm },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 2,
  },
  folderName: { flex: 1 },
});
