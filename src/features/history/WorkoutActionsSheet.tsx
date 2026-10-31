import { push } from '@/lib/nav';
import { Pencil, Repeat, Save, Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { createRoutine, routineInputFromWorkout } from '@/db/repo/routines';
import { deleteWorkout, workoutToActiveWorkout, type WorkoutDetail } from '@/db/repo/workouts';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { Icon, ListItem, Sheet, confirm, spacing, toast, useColors } from '@/ui';

interface WorkoutActionsSheetProps {
  workout: WorkoutDetail;
  visible: boolean;
  onClose: () => void;
  /** Вызывается после удаления: экран решает, куда уйти. */
  onDeleted: () => void;
}

/** Меню завершённой тренировки: изменить, повторить, сохранить как программу, удалить. */
export function WorkoutActionsSheet({ workout, visible, onClose, onDeleted }: WorkoutActionsSheetProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const activeWorkout = useActiveWorkout((state) => state.workout);
  const session = useActiveWorkout((state) => state.session);

  /** Спрашивает, отбросить ли тренировку в процессе перед началом другой. Возвращает true, когда можно продолжать. */
  const ensureNoActiveWorkout = async () => {
    if (!activeWorkout || session.mode === 'edit') return true;
    const confirmed = await confirm({
      title: translate('home.inProgress'),
      message: translate('workout.discardConfirm'),
      destructive: true,
      confirmLabel: translate('common.discard'),
    });
    if (confirmed) {
      useRestTimer.getState().skip();
      useActiveWorkout.getState().clear();
    }
    return confirmed;
  };

  const editWorkout = async () => {
    onClose();
    if (!(await ensureNoActiveWorkout())) return;
    useActiveWorkout.getState().startFromActive(workoutToActiveWorkout(workout), {
      mode: 'edit',
      workoutId: workout.id,
      finishedAt: workout.finishedAt,
    });
    push('/workout/active');
  };

  // Начать новую тренировку с теми же упражнениями; значения этой тренировки станут «предыдущими».
  const repeatWorkout = async () => {
    onClose();
    if (!(await ensureNoActiveWorkout())) return;
    const workoutCopy = workoutToActiveWorkout(workout);
    useActiveWorkout.getState().startFromActive(
      {
        ...workoutCopy,
        id: `${Date.now().toString(36)}r`,
        startedAt: Date.now(),
        notes: '',
        exercises: workoutCopy.exercises.map((exercise) => ({
          ...exercise,
          id: `${exercise.id}r`,
          note: '',
          sets: exercise.sets.map((set) => ({
            ...set,
            id: `${set.id}r`,
            completed: false,
            completedAt: null,
            prTypes: undefined,
            previous: {
              weightKg: set.weightKg,
              reps: set.reps,
              durationSec: set.durationSec,
              distanceM: set.distanceM,
              rpe: set.rpe,
              rir: set.rir,
            },
          })),
        })),
      },
      { mode: 'new' },
    );
    push('/workout/active');
  };

  const saveAsRoutine = () => {
    onClose();
    const routineId = createRoutine(routineInputFromWorkout(workoutToActiveWorkout(workout)));
    toast(translate('routine.saved'));
    push({ pathname: '/routine/[id]', params: { id: routineId } });
  };

  const deleteThisWorkout = async () => {
    onClose();
    const confirmed = await confirm({
      title: translate('history.deleteConfirm'),
      destructive: true,
      confirmLabel: translate('common.delete'),
    });
    if (!confirmed) return;
    deleteWorkout(workout.id);
    onDeleted();
  };

  return (
    <Sheet visible={visible} onClose={onClose} unpadded>
      <View style={{ paddingHorizontal: spacing.sm }}>
        <ListItem title={translate('common.edit')} left={<Icon icon={Pencil} />} onPress={editWorkout} />
        <ListItem title={translate('history.repeat')} left={<Icon icon={Repeat} />} onPress={repeatWorkout} />
        <ListItem
          title={translate('history.saveAsRoutine')}
          left={<Icon icon={Save} />}
          onPress={saveAsRoutine}
        />
        <ListItem
          title={translate('common.delete')}
          titleColor={colors.danger}
          left={<Icon icon={Trash2} color="danger" />}
          onPress={deleteThisWorkout}
        />
      </View>
    </Sheet>
  );
}
