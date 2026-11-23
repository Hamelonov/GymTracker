import { nextWorkoutNumber, numberedWorkoutName } from '@/db/renameDefaultWorkoutNames';
import { newId } from '@/domain/ids';
import { discardActiveWorkoutIfConfirmed } from '@/features/workout/discardActiveWorkout';
import { push } from '@/lib/nav';
import { startTimeOnDay } from './calendarGrid';
import { useActiveWorkout } from '@/store/activeWorkout';

const DEFAULT_PAST_WORKOUT_DURATION_MS = 60 * 60 * 1000;

/**
 * Открывает ввод тренировки на выбранный день. Это правка новой записи: длительность фиксирована,
 * а сохранение вставляет тренировку в базу, а не завершает «живую».
 */
export async function logWorkoutOnDay(day: Date, translate: (key: string) => string): Promise<void> {
  if (!(await discardActiveWorkoutIfConfirmed(translate))) return;

  const workoutId = newId();
  const startedAt = startTimeOnDay(day, Date.now());
  useActiveWorkout.getState().startFromActive(
    {
      id: workoutId,
      name: numberedWorkoutName(nextWorkoutNumber()),
      startedAt,
      routineId: null,
      notes: '',
      exercises: [],
    },
    {
      mode: 'edit',
      workoutId,
      finishedAt: startedAt + DEFAULT_PAST_WORKOUT_DURATION_MS,
      isNewEntry: true,
    },
  );
  push('/workout/active');
}
