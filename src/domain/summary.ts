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

/** Sets done at one weight: "80 × 8/7/6". `weightKg` is null for bodyweight or cardio. */
export interface SetGroup {
  weightKg: number | null;
  /** Reps per set, or formatted time / distance for cardio. */
  values: string[];
}

/**
 * Working sets of one exercise grouped the way people write them on a board:
 * consecutive sets with the same weight form one group. Warm-ups are left out.
 */
export function groupSets(sets: LineSet[], fields: SetFields, fmt: LineFormat): SetGroup[] {
  const working = sets.filter((s) => s.type !== 'warmup');
  if (working.length === 0) return [];

  if (fields.distance || (fields.duration && !fields.reps)) {
    const values = working.map((s) => {
      const parts: string[] = [];
      if (fields.distance && s.distanceM != null) parts.push(fmt.distance(s.distanceM));
      if (fields.duration && s.durationSec != null) parts.push(fmt.duration(s.durationSec));
      return parts.join(' ') || '—';
    });
    return [{ weightKg: null, values }];
  }

  const reps = (x: LineSet) => (x.reps != null ? String(x.reps) : '—');
  if (!fields.weight) return [{ weightKg: null, values: working.map(reps) }];

  const groups: SetGroup[] = [];
  for (const x of working) {
    const w = x.weightKg != null && x.weightKg > 0 ? x.weightKg : null;
    const last = groups[groups.length - 1];
    if (last && last.weightKg === w) last.values.push(reps(x));
    else groups.push({ weightKg: w, values: [reps(x)] });
  }
  return groups;
}

/** One group as text: "80 × 8/7/6" or "8/7/7". */
export function formatGroup(g: SetGroup, weight: (kg: number) => string): string {
  const joined = g.values.join(g.values.some((v) => v.includes(' ')) ? ' · ' : '/');
  return g.weightKg == null ? joined : `${weight(g.weightKg)} × ${joined}`;
}

/**
 * Whole exercise on one line, groups separated by commas:
 *   "82.5 × 7/6, 80 × 8", "8/7/7", "1:00/0:45".
 */
export function formatSetsLine(sets: LineSet[], fields: SetFields, fmt: LineFormat): string {
  const groups = groupSets(sets, fields, fmt);
  if (groups.length === 0) return '—';
  return groups.map((g) => formatGroup(g, fmt.weight)).join(', ');
}

/** A set counts as filled when at least one of the exercise's fields has a value above zero. */
export function isSetFilled(v: SetValues, fields: SetFields): boolean {
  const pos = (n: number | null) => n != null && n > 0;
  return (fields.weight && pos(v.weightKg)) || (fields.reps && pos(v.reps)) || (fields.duration && pos(v.durationSec)) || (fields.distance && pos(v.distanceM));
}
