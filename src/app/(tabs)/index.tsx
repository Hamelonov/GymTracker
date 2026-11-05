import { push } from '@/lib/nav';
import { Dumbbell, Play, Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getExercisesByIds } from '@/db/repo/exercises';
import { getRoutine, listRoutines, type RoutineSummary } from '@/db/repo/routines';
import { useQuery } from '@/db/version';
import { ResumeWorkoutBanner } from '@/features/home/ResumeWorkoutBanner';
import { RoutineMenuSheet } from '@/features/home/RoutineMenuSheet';
import { WeekSummaryCard } from '@/features/home/WeekSummaryCard';
import { RoutineCard } from '@/features/routines/RoutineCard';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { nextWorkoutNumber, numberedWorkoutName } from '@/db/renameDefaultWorkoutNames';
import { useNow } from '@/lib/useNow';
import { Button, EmptyState, Icon, IconButton, Screen, SectionTitle, confirm } from '@/ui';

/** Какой нижний лист открыт на главном экране (только один за раз). */
type OpenSheet = { kind: 'none' } | { kind: 'routineMenu'; routineId: string };

export default function HomeTab() {
  const { t: translate } = useTranslation();
  const now = useNow();
  const [openSheet, setOpenSheet] = useState<OpenSheet>({ kind: 'none' });
  const activeWorkout = useActiveWorkout((state) => state.workout);
  const session = useActiveWorkout((state) => state.session);
  // Только после ухода с экрана тренировки, но не во время его открытия.
  const isResumeBannerVisible = useActiveWorkout(
    (state) => !!state.workout && state.minimized && state.session.mode === 'new',
  );
  const routines = useQuery(() => listRoutines(), []);
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
    useActiveWorkout.getState().startEmpty(numberedWorkoutName(nextWorkoutNumber()));
    push('/workout/active');
  };

  const startRoutine = async (routineId: string) => {
    if (!(await discardActiveWorkoutIfConfirmed())) return;
    const routine = getRoutine(routineId);
    if (!routine) return;
    useActiveWorkout.getState().startFromRoutine(routine);
    push('/workout/active');
  };

  const selectedRoutine =
    openSheet.kind === 'routineMenu'
      ? routines.find((routine) => routine.id === openSheet.routineId)
      : undefined;

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
          <IconButton
            icon={Plus}
            size={18}
            variant="filled"
            onPress={() => push('/routine/edit')}
            haptic="selection"
          />
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
      {routines.map(renderRoutineCard)}

      <RoutineMenuSheet
        visible={openSheet.kind === 'routineMenu'}
        routine={selectedRoutine}
        onClose={closeSheet}
        onStartRoutine={(routineId) => void startRoutine(routineId)}
      />
    </Screen>
  );
}
