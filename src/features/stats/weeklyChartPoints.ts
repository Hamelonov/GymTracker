import { addDays } from 'date-fns';
import type { WorkoutRow } from '@/db/schema';
import { formatShortDate, toWeekKey, getWeekStart } from '@/domain/dates';
import type { ChartPoint } from '@/features/charts/LineChart';

export type WeeklyMetric = 'workouts' | 'duration' | 'sets';

interface WeekTotals {
  weekStartTime: number;
  workouts: number;
  durationSec: number;
  sets: number;
}

const MAX_WEEKS_SHOWN = 26;
/** Примерно сколько подписей дат помещается под графиком. */
const CHART_LABEL_COUNT = 6;

function getMetricValue(week: WeekTotals, metric: WeeklyMetric): number {
  switch (metric) {
    case 'workouts':
      return week.workouts;
    case 'duration':
      return Math.round(week.durationSec / 60);
    case 'sets':
      return week.sets;
  }
}

interface WeeklyChartOptions {
  /** Тренировки за период, от старых к новым. */
  workouts: WorkoutRow[];
  /** Начало периода или 0 для «за всё время» (тогда началом считается первая тренировка). */
  periodStart: number;
  now: number;
  metric: WeeklyMetric;
  language: string;
}

/** Один столбец на неделю от начала периода до сегодня; недели без тренировок показываются нулём. */
export function buildWeeklyChartPoints({
  workouts,
  periodStart,
  now,
  metric,
  language,
}: WeeklyChartOptions): ChartPoint[] {
  const firstWorkout = workouts[0];
  if (!firstWorkout) return [];

  const totalsByWeek = new Map<string, WeekTotals>();
  const firstWeek = getWeekStart(periodStart || firstWorkout.startedAt);
  const lastWeek = getWeekStart(now);
  for (let week = firstWeek; week <= lastWeek; week = addDays(week, 7)) {
    totalsByWeek.set(toWeekKey(week), {
      weekStartTime: week.getTime(),
      workouts: 0,
      durationSec: 0,
      sets: 0,
    });
  }

  for (const workout of workouts) {
    const weekTotals = totalsByWeek.get(toWeekKey(workout.startedAt));
    if (!weekTotals) continue;
    weekTotals.workouts += 1;
    weekTotals.durationSec += workout.durationSec;
    weekTotals.sets += workout.setCount;
  }

  const shownWeeks = [...totalsByWeek.values()].slice(-MAX_WEEKS_SHOWN);
  const labelEvery = Math.max(1, Math.ceil(shownWeeks.length / CHART_LABEL_COUNT));
  return shownWeeks.map((week, index) => ({
    x: index,
    y: getMetricValue(week, metric),
    label: index % labelEvery === 0 ? formatShortDate(week.weekStartTime, language) : '',
  }));
}
