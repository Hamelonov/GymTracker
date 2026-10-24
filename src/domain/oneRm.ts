/**
 * Расчётный одноповторный максимум. При малых повторах смешивает Эпли и Бжицки (там оба
 * точны), а при больших повторах использует только Эпли.
 */
export function estimateOneRm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  const cappedReps = Math.min(reps, 30);
  const epley = weightKg * (1 + cappedReps / 30);
  if (cappedReps > 10) return epley;
  const brzycki = weightKg * (36 / (37 - cappedReps));
  return (epley + brzycki) / 2;
}

/** Вес, который можно поднять на `targetReps` при известном 1RM (обратная формула Эпли). */
export function weightForReps(oneRm: number, targetReps: number): number {
  if (targetReps <= 1) return oneRm;
  return oneRm / (1 + targetReps / 30);
}

export const PERCENT_TABLE = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50] as const;

export function repsAtPercent(percent: number): number {
  if (percent >= 100) return 1;
  return Math.max(1, Math.round(30 * (100 / percent - 1)));
}
