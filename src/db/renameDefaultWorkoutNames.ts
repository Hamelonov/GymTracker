import { asc, count, eq } from 'drizzle-orm';
import Storage from 'expo-sqlite/kv-store';
import i18n from '@/i18n';
import { useActiveWorkout } from '@/store/activeWorkout';
import { database } from './client';
import { workouts } from './schema';
import { notifyDatabaseChanged } from './version';

// Флаг в хранилище: переименование делается один раз.
const DONE_KEY = 'workout_names_numbered_v3';

const NUMBERED_NAME_KEY = 'workout.numberedName';

const WEEKDAYS_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const WEEKDAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Названия, которые приложение раньше подставляло само. Свои названия пользователя не трогаем. */
const OLD_DEFAULT_NAMES = new Set([
  'Утренняя тренировка',
  'Дневная тренировка',
  'Вечерняя тренировка',
  'Ночная тренировка',
  'Morning workout',
  'Afternoon workout',
  'Evening workout',
  'Night workout',
  ...WEEKDAYS_RU,
  ...WEEKDAYS_EN,
  ...WEEKDAYS_RU.map((day) => `Тренировка в ${day.toLowerCase()}`),
  ...WEEKDAYS_EN.map((day) => `${day} workout`),
  'Тренировка во вторник',
  'Тренировка в среду',
  'Тренировка в пятницу',
  'Тренировка в субботу',
]);

// Уже пронумерованные названия («День №3», «Тренировка №3», «Workout #3») тоже пересчитываем.
const OLD_NUMBERED_NAME = /^(День|Day|Тренировка|Workout) ?(№|#) ?\d+$/;

// Сырой ключ перевода мог попасть в базу, если словарь ещё не содержал новую строку.
function isDefaultName(name: string): boolean {
  return name === NUMBERED_NAME_KEY || OLD_DEFAULT_NAMES.has(name) || OLD_NUMBERED_NAME.test(name);
}

/** «Тренировка №27» в русском интерфейсе, «Workout #27» в английском. */
export function numberedWorkoutName(workoutNumber: number): string {
  return i18n.t(NUMBERED_NAME_KEY, { number: workoutNumber });
}

/** Номер следующей тренировки: все сохранённые тренировки плюс одна, включая переименованные. */
export function nextWorkoutNumber(): number {
  const result = database.select({ total: count() }).from(workouts).get();
  return (result?.total ?? 0) + 1;
}

/**
 * Один раз переименовывает тренировки со старыми стандартными названиями в «Тренировка №N»,
 * где N — порядковый номер тренировки в истории по дате начала.
 * Тренировки, которые пользователь назвал сам, тоже занимают свой номер.
 */
export function renameDefaultWorkoutNames(): void {
  if (Storage.getItemSync(DONE_KEY) === '1') return;
  // Без перевода в базу записался бы сырой ключ вместо названия, поэтому ждём следующего запуска.
  if (!i18n.exists(NUMBERED_NAME_KEY)) return;

  const allWorkouts = database
    .select({ id: workouts.id, name: workouts.name })
    .from(workouts)
    .orderBy(asc(workouts.startedAt))
    .all();

  let renamedCount = 0;
  database.transaction((transaction) => {
    allWorkouts.forEach((workout, index) => {
      if (!isDefaultName(workout.name)) return;
      transaction
        .update(workouts)
        .set({ name: numberedWorkoutName(index + 1) })
        .where(eq(workouts.id, workout.id))
        .run();
      renamedCount += 1;
    });
  });

  // Тренировка, которая идёт прямо сейчас, ещё не сохранена: её номер следующий после всех.
  const activeWorkout = useActiveWorkout.getState().workout;
  if (activeWorkout && isDefaultName(activeWorkout.name)) {
    useActiveWorkout.getState().rename(numberedWorkoutName(allWorkouts.length + 1));
  }

  Storage.setItemSync(DONE_KEY, '1');
  if (renamedCount > 0) notifyDatabaseChanged();
}
