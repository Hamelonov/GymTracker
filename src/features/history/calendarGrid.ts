import { addDays, addMonths, differenceInCalendarDays, endOfMonth, getDay, startOfMonth } from 'date-fns';
import { toDayKey } from '@/domain/dates';

const DAYS_IN_WEEK = 7;

/**
 * Недели месяца, начиная с понедельника. Ячейки до первого и после последнего дня месяца пустые (`null`),
 * чтобы дни каждого месяца стояли в своих колонках дня недели.
 */
export function buildMonthWeeks(monthStart: Date): (Date | null)[][] {
  const firstDay = startOfMonth(monthStart);
  const lastDay = endOfMonth(firstDay);
  // getDay() считает неделю с воскресенья, а в приложении она начинается с понедельника.
  const emptyCellsBeforeFirstDay = (getDay(firstDay) + 6) % DAYS_IN_WEEK;
  const cells: (Date | null)[] = Array.from({ length: emptyCellsBeforeFirstDay }, () => null);
  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) cells.push(day);
  while (cells.length % DAYS_IN_WEEK !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let weekStart = 0; weekStart < cells.length; weekStart += DAYS_IN_WEEK) {
    weeks.push(cells.slice(weekStart, weekStart + DAYS_IN_WEEK));
  }
  return weeks;
}

/** Месяцы от самого нового к самому старому: от текущего до месяца первой тренировки. */
export function listMonthsNewestFirst(
  now: number,
  earliestWorkoutAt: number | null,
  latestWorkoutAt: number | null,
): Date[] {
  // Тренировка из будущего (например, из импорта) тоже должна попасть в календарь.
  const newestMonth = startOfMonth(Math.max(now, latestWorkoutAt ?? now));
  const oldestMonth = startOfMonth(Math.min(now, earliestWorkoutAt ?? now));
  const months: Date[] = [];
  for (let month = newestMonth; month >= oldestMonth; month = addMonths(month, -1)) months.push(month);
  return months;
}

/** Годы от самого нового к самому старому, по тем же правилам, что и месяцы. */
export function listYearsNewestFirst(
  now: number,
  earliestWorkoutAt: number | null,
  latestWorkoutAt: number | null,
): number[] {
  const newestYear = new Date(Math.max(now, latestWorkoutAt ?? now)).getFullYear();
  const oldestYear = new Date(Math.min(now, earliestWorkoutAt ?? now)).getFullYear();
  const years: number[] = [];
  for (let year = newestYear; year >= oldestYear; year -= 1) years.push(year);
  return years;
}

/** Сколько дней прошло с последней тренировки; без тренировок отдыхом считать нечего. */
export function countRestDays(lastWorkoutAt: number | null, now: number): number {
  if (lastWorkoutAt == null) return 0;
  return Math.max(0, differenceInCalendarDays(now, lastWorkoutAt));
}

/** Ключи дней, в которые была хотя бы одна тренировка. */
export function buildWorkoutDayKeys(workoutStartTimes: number[]): Set<string> {
  return new Set(workoutStartTimes.map((startTime) => toDayKey(startTime)));
}

/** Начало тренировки на выбранный день: время суток берётся от текущего момента. */
export function startTimeOnDay(day: Date, now: number): number {
  const startedAt = new Date(day);
  const current = new Date(now);
  startedAt.setHours(current.getHours(), current.getMinutes(), 0, 0);
  return startedAt.getTime();
}
