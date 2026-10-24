import { getWeekStart } from '@/domain/dates';

const WEEK_MS = 7 * 86400000;

export interface WeekStreak {
  /** Weeks in a row with at least one workout, ending this week or last week. */
  current: number;
  /** Longest run of weeks in a row with at least one workout. */
  best: number;
}

export function calculateWeekStreak(workoutStartTimes: number[], now: number): WeekStreak {
  const trainedWeekStarts = [
    ...new Set(workoutStartTimes.map((startTime) => getWeekStart(startTime).getTime())),
  ].sort((first, second) => first - second);

  let best = 0;
  let runLength = 0;
  let previousWeekStart: number | null = null;
  for (const thisWeekStart of trainedWeekStarts) {
    const followsPreviousWeek = previousWeekStart != null && thisWeekStart - previousWeekStart === WEEK_MS;
    runLength = followsPreviousWeek ? runLength + 1 : 1;
    best = Math.max(best, runLength);
    previousWeekStart = thisWeekStart;
  }

  const trainedWeeks = new Set(trainedWeekStarts);
  let weekCursor = getWeekStart(now).getTime();
  // This week is still in progress, so a streak that ended last week is still current.
  if (!trainedWeeks.has(weekCursor)) weekCursor -= WEEK_MS;
  let current = 0;
  while (trainedWeeks.has(weekCursor)) {
    current += 1;
    weekCursor -= WEEK_MS;
  }
  return { current, best };
}
