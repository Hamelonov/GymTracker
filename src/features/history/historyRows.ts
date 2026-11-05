import { format, startOfMonth } from 'date-fns';
import type { WorkoutSummary } from '@/db/repo/workouts';

export type MonthRow = { kind: 'month'; key: string; monthStart: number; workoutCount: number };

export type HistoryRow = MonthRow | { kind: 'workout'; key: string; workout: WorkoutSummary };

/**
 * Превращает список тренировок (новые сверху) в плоский список строк: перед каждым месяцем
 * идёт строка-заголовок с числом тренировок.
 */
export function buildHistoryRows(workouts: WorkoutSummary[]): HistoryRow[] {
  const rows: HistoryRow[] = [];
  let currentMonthRow: MonthRow | null = null;

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

export function isMonthRow(row: HistoryRow): row is MonthRow {
  return row.kind === 'month';
}

/** Месяц, которому принадлежит строка: она сама или ближайшая строка-месяц выше неё. */
export function findMonthRowForIndex(rows: HistoryRow[], index: number): MonthRow | undefined {
  for (let rowIndex = index; rowIndex >= 0; rowIndex -= 1) {
    const row = rows[rowIndex];
    if (row && isMonthRow(row)) return row;
  }
  return undefined;
}
