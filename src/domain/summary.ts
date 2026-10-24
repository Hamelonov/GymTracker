import type { PrHit, PrType, SetFields, SetType, SetValues } from './types';

/** Which value a record row should show for an exercise. */
export type RecordMetric = 'weight' | 'reps' | 'duration' | 'distance';

/**
 * Pick the value to show in the "new records" tile.
 *
 * - Weighted exercises show weight when the weight record moved; if only reps
 *   improved (same weight, more reps) they show reps instead.
 * - Exercises without weight never show weight: distance, time or reps,
 *   whichever record moved, in that order.
 */
export function pickRecordMetric(fields: SetFields, hits: PrHit[]): RecordMetric {
  const has = (t: PrType) => hits.some((h) => h.type === t);
  if (fields.weight) {
    if (has('weight')) return 'weight';
    if (has('reps')) return 'reps';
    return 'weight';
  }
  if (fields.distance && has('distance')) return 'distance';
  if (fields.duration && has('duration')) return 'duration';
  if (fields.reps) return 'reps';
  if (fields.distance) return 'distance';
  return 'duration';
}

export interface RecordGain {
  /** Old record before this workout, or null when there was none. */
  previous: number | null;
  /** New best value reached in this workout. */
  best: number;
}

/** Old and new value for one record type, or null if that record did not move. */
export function recordGain(hits: PrHit[], type: RecordMetric): RecordGain | null {
  const of = hits.filter((h) => h.type === type);
  if (of.length === 0) return null;
  return { previous: of[0]?.previous ?? null, best: Math.max(...of.map((h) => h.value)) };
}

export interface LineSet extends SetValues {
  type: SetType;
}

export interface LineFormat {
  weight: (kg: number) => string;
  duration: (sec: number) => string;
  distance: (m: number) => string;
}

/**
 * Compact one-line summary of an exercise's working sets, e.g.
 *   "80 kg × 8/7/6", "80 kg × 8/7 · 85 kg × 5", "8/7/7", "1:00/0:45".
 * Warm-up sets are left out. Consecutive sets with the same weight are grouped.
 */
export function formatSetsLine(sets: LineSet[], fields: SetFields, fmt: LineFormat): string {
  const working = sets.filter((s) => s.type !== 'warmup');
  if (working.length === 0) return '—';

  if (fields.distance || (fields.duration && !fields.reps)) {
    return working
      .map((s) => {
        const parts: string[] = [];
        if (fields.distance && s.distanceM != null) parts.push(fmt.distance(s.distanceM));
        if (fields.duration && s.durationSec != null) parts.push(fmt.duration(s.durationSec));
        return parts.join(' ') || '—';
      })
      .join(fields.distance ? ' · ' : '/');
  }

  const reps = (s: LineSet) => (s.reps != null ? String(s.reps) : '—');
  if (!fields.weight) return working.map(reps).join('/');

  const groups: { weightKg: number | null; reps: string[] }[] = [];
  for (const s of working) {
    const w = s.weightKg != null && s.weightKg > 0 ? s.weightKg : null;
    const last = groups[groups.length - 1];
    if (last && last.weightKg === w) last.reps.push(reps(s));
    else groups.push({ weightKg: w, reps: [reps(s)] });
  }
  return groups.map((g) => (g.weightKg == null ? g.reps.join('/') : `${fmt.weight(g.weightKg)} × ${g.reps.join('/')}`)).join(' · ');
}

/** A set counts as filled when at least one of the exercise's fields has a value above zero. */
export function isSetFilled(v: SetValues, fields: SetFields): boolean {
  const pos = (n: number | null) => n != null && n > 0;
  return (fields.weight && pos(v.weightKg)) || (fields.reps && pos(v.reps)) || (fields.duration && pos(v.durationSec)) || (fields.distance && pos(v.distanceM));
}
