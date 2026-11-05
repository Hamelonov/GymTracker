import { push } from '@/lib/nav';
import { Pencil, Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { deleteWorkout, workoutToActiveWorkout, type WorkoutDetail } from '@/db/repo/workouts';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { Icon, ListItem, Sheet, confirm } from '@/ui';

interface WorkoutActionsSheetProps {
  workout: WorkoutDetail;
  visible: boolean;
  onClose: () => void;
  /** Вызывается после удаления: экран решает, куда уйти. */
  onDeleted: () => void;
}

/** Меню завершённой тренировки: только исправить ошибочную запись или удалить её. */
export function WorkoutActionsSheet({ workout, visible, onClose, onDeleted }: WorkoutActionsSheetProps) {
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
    push({ pathname: '/workout/active', params: { mode: 'edit' } });
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
      <ListItem title={translate('common.edit')} left={<Icon icon={Pencil} />} onPress={editWorkout} />
      <ListItem
        title={translate('common.delete')}
        tone="danger"
        left={<Icon icon={Trash2} color="danger" />}
        onPress={deleteThisWorkout}
      />
    </Sheet>
  );
}
