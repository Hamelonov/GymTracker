import type { RecordHit, RecordType, SetFields, SetType, SetValues } from './types';

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
export function pickRecordMetric(fields: SetFields, hits: RecordHit[]): RecordMetric {
  const hasHit = (type: RecordType) => hits.some((hit) => hit.type === type);
  if (fields.weight) {
    if (hasHit('weight')) return 'weight';
    if (hasHit('reps')) return 'reps';
    return 'weight';
  }
  if (fields.distance && hasHit('distance')) return 'distance';
  if (fields.duration && hasHit('duration')) return 'duration';
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
export function recordGain(hits: RecordHit[], type: RecordMetric): RecordGain | null {
  const hitsOfType = hits.filter((hit) => hit.type === type);
  if (hitsOfType.length === 0) return null;
  return {
    previous: hitsOfType[0]?.previous ?? null,
    best: Math.max(...hitsOfType.map((hit) => hit.value)),
  };
}

export interface LineSet extends SetValues {
  type: SetType;
}

export interface ValueFormatters {
  weight: (kg: number) => string;
  duration: (seconds: number) => string;
  distance: (meters: number) => string;
}

/** Sets done at one weight: "80 × 8/7/6". `weightKg` is null for bodyweight or cardio. */
export interface SetGroup {
  weightKg: number | null;
  /** Reps per set, or formatted time / distance for cardio. */
  values: string[];
}

function formatReps(set: LineSet): string {
  return set.reps != null ? String(set.reps) : '—';
}

/**
 * Working sets of one exercise grouped the way people write them on a board:
 * consecutive sets with the same weight form one group. Warm-ups are left out.
 */
export function groupSets(sets: LineSet[], fields: SetFields, formatters: ValueFormatters): SetGroup[] {
  const workingSets = sets.filter((set) => set.type !== 'warmup');
  if (workingSets.length === 0) return [];

  const isCardio = fields.distance || (fields.duration && !fields.reps);
  if (isCardio) {
    const values = workingSets.map((set) => {
      const parts: string[] = [];
      if (fields.distance && set.distanceM != null) parts.push(formatters.distance(set.distanceM));
      if (fields.duration && set.durationSec != null) parts.push(formatters.duration(set.durationSec));
      return parts.join(' ') || '—';
    });
    return [{ weightKg: null, values }];
  }

  if (!fields.weight) return [{ weightKg: null, values: workingSets.map(formatReps) }];

  const groups: SetGroup[] = [];
  for (const set of workingSets) {
    const weightKg = set.weightKg != null && set.weightKg > 0 ? set.weightKg : null;
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.weightKg === weightKg) lastGroup.values.push(formatReps(set));
    else groups.push({ weightKg, values: [formatReps(set)] });
  }
  return groups;
}

/** One group as text: "80 × 8/7/6" or "8/7/7". */
export function formatGroup(group: SetGroup, formatWeight: (kg: number) => string): string {
  // Cardio values like "1 km 5:00" contain spaces, so a slash between them would be hard to read.
  const separator = group.values.some((value) => value.includes(' ')) ? ' · ' : '/';
  const joinedValues = group.values.join(separator);
  return group.weightKg == null ? joinedValues : `${formatWeight(group.weightKg)} × ${joinedValues}`;
}

/**
 * Whole exercise on one line, groups separated by commas:
 *   "82.5 × 7/6, 80 × 8", "8/7/7", "1:00/0:45".
 */
export function formatSetsLine(sets: LineSet[], fields: SetFields, formatters: ValueFormatters): string {
  const groups = groupSets(sets, fields, formatters);
  if (groups.length === 0) return '—';
  return groups.map((group) => formatGroup(group, formatters.weight)).join(', ');
}

/** A set counts as filled when at least one of the exercise's fields has a value above zero. */
export function isSetFilled(values: SetValues, fields: SetFields): boolean {
  const isPositive = (value: number | null) => value != null && value > 0;
  return (
    (fields.weight && isPositive(values.weightKg)) ||
    (fields.reps && isPositive(values.reps)) ||
    (fields.duration && isPositive(values.durationSec)) ||
    (fields.distance && isPositive(values.distanceM))
  );
}
