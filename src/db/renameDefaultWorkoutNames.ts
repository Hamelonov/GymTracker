import { eq, inArray } from 'drizzle-orm';
import Storage from 'expo-sqlite/kv-store';
import { weekdayName } from '@/domain/dates';
import { useActiveWorkout } from '@/store/activeWorkout';
import { database } from './client';
import { workouts } from './schema';
import { notifyDatabaseChanged } from './version';

// Флаг в хранилище: переименование делается один раз.
const DONE_KEY = 'workout_names_by_weekday_v1';

/** Стандартные названия, которые раньше подставлялись автоматически. Свои названия не трогаем. */
const OLD_DEFAULT_NAMES = [
  'Утренняя тренировка',
  'Дневная тренировка',
  'Вечерняя тренировка',
  'Ночная тренировка',
  'Morning workout',
  'Afternoon workout',
  'Evening workout',
  'Night workout',
  'Тренировка в понедельник',
  'Тренировка во вторник',
  'Тренировка в среду',
  'Тренировка в четверг',
  'Тренировка в пятницу',
  'Тренировка в субботу',
  'Тренировка в воскресенье',
  'Monday workout',
  'Tuesday workout',
  'Wednesday workout',
  'Thursday workout',
  'Friday workout',
  'Saturday workout',
  'Sunday workout',
];

/**
 * Один раз переименовывает тренировки со старыми стандартными названиями
 * («Дневная тренировка» и т. п.) в день недели, когда они были сделаны: «Суббота».
 */
export function renameDefaultWorkoutNames(language: string): void {
  if (Storage.getItemSync(DONE_KEY) === '1') return;

  const workoutsToRename = database
    .select({ id: workouts.id, startedAt: workouts.startedAt })
    .from(workouts)
    .where(inArray(workouts.name, OLD_DEFAULT_NAMES))
    .all();

  database.transaction((transaction) => {
    for (const workout of workoutsToRename) {
      transaction
        .update(workouts)
        .set({ name: weekdayName(workout.startedAt, language) })
        .where(eq(workouts.id, workout.id))
        .run();
    }
  });

  // Тренировка, которая идёт прямо сейчас, тоже получает новое название.
  const activeWorkout = useActiveWorkout.getState().workout;
  if (activeWorkout && OLD_DEFAULT_NAMES.includes(activeWorkout.name)) {
    useActiveWorkout.getState().rename(weekdayName(activeWorkout.startedAt, language));
  }

  Storage.setItemSync(DONE_KEY, '1');
  if (workoutsToRename.length > 0) notifyDatabaseChanged();
}
