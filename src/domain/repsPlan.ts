/**
 * Подсказки для упражнений со своим весом: от максимума повторений до отказа считаем,
 * сколько делать в рабочих подходах.
 */

/** Рабочий диапазон в процентах от максимума: тяжело, но без отказа. */
export const WORK_RANGE_PERCENT = { low: 70, high: 85 } as const;

export const REPS_PERCENT_TABLE = [100, 90, 85, 80, 75, 70, 60, 50] as const;

/** Повторения на заданный процент от максимума, не меньше одного. */
export function repsAtPercentOfMax(maxReps: number, percent: number): number {
  if (maxReps <= 0) return 0;
  return Math.max(1, Math.round((maxReps * percent) / 100));
}

export interface PlannedSet {
  percent: number;
  reps: number;
}

/**
 * План подходов: первый на верхней границе диапазона, последний на нижней.
 * С каждым подходом копится усталость, поэтому повторов к концу меньше.
 */
export function buildRepsPlan(maxReps: number, setCount: number): PlannedSet[] {
  if (maxReps <= 0 || setCount <= 0) return [];
  const { low, high } = WORK_RANGE_PERCENT;
  const step = setCount > 1 ? (high - low) / (setCount - 1) : 0;
  return Array.from({ length: setCount }, (_, index) => {
    const percent = Math.round(high - step * index);
    return { percent, reps: repsAtPercentOfMax(maxReps, percent) };
  });
}
