import { useRestTimer } from '@/store/restTimer';
import { useActiveWorkout } from '@/store/activeWorkout';
import { confirm } from '@/ui';

/**
 * Перед началом новой тренировки спрашивает, отбросить ли незавершённую.
 * Возвращает false, если пользователь отказался. Правка уже сохранённой тренировки не спрашивает.
 */
export async function discardActiveWorkoutIfConfirmed(translate: (key: string) => string): Promise<boolean> {
  const { workout, session } = useActiveWorkout.getState();
  if (!workout || session.mode === 'edit') return true;

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
}
