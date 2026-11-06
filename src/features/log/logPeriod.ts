import { startOfDay, subMonths } from 'date-fns';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';

export const LOG_PERIODS = ['all', 'month', 'quarter', 'halfYear', 'year'] as const;
export type LogPeriod = (typeof LOG_PERIODS)[number];

const MONTHS_IN_PERIOD: Record<Exclude<LogPeriod, 'all'>, number> = {
  month: 1,
  quarter: 3,
  halfYear: 6,
  year: 12,
};

function getPeriodStart(period: LogPeriod, now: number): number {
  if (period === 'all') return 0;
  // От начала дня: иначе тренировка месячной давности то входила бы в период, то нет, смотря по часу.
  return startOfDay(subMonths(now, MONTHS_IN_PERIOD[period])).getTime();
}

export function filterEntriesByPeriod(
  entries: ExerciseHistoryEntry[],
  period: LogPeriod,
  now: number,
): ExerciseHistoryEntry[] {
  const periodStart = getPeriodStart(period, now);
  return entries.filter((entry) => entry.startedAt >= periodStart);
}
