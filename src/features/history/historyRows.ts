import { format, startOfMonth } from 'date-fns';
import type { WorkoutSummary } from '@/db/repo/workouts';

export type HistoryRow =
  | { kind: 'month'; key: string; monthStart: number; workoutCount: number }
  | { kind: 'workout'; key: string; workout: WorkoutSummary };

/**
 * Превращает список тренировок (новые сверху) в плоский список строк: перед каждым месяцем
 * идёт строка-заголовок с числом тренировок. Так FlashList может закрепить месяц при прокрутке.
 */
export function buildHistoryRows(workouts: WorkoutSummary[]): HistoryRow[] {
  const rows: HistoryRow[] = [];
  let currentMonthRow: Extract<HistoryRow, { kind: 'month' }> | null = null;

  for (const workout of workouts) {
    const monthKey = format(workout.startedAt, 'yyyy-MM');
    if (!currentMonthRow || currentMonthRow.key !== monthKey) {
      currentMonthRow = {
        kind: 'month',
        key: monthKey,
        monthStart: startOfMonth(workout.startedAt).getTime(),
        workoutCount: 0,
      };
      rows.push(currentMonthRow);
    }
    currentMonthRow.workoutCount += 1;
    rows.push({ kind: 'workout', key: workout.id, workout });
  }
  return rows;
}

/** Индексы строк-месяцев для `stickyHeaderIndices`. */
export function findMonthRowIndices(rows: HistoryRow[]): number[] {
  const indices: number[] = [];
  rows.forEach((row, index) => {
    if (row.kind === 'month') indices.push(index);
  });
  return indices;
}
