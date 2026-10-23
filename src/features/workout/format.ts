import type { SetValues, SetFields, WeightUnit, DistanceUnit } from '@/domain/types';
import { formatDistance, formatDuration, formatWeight } from '@/domain/units';

/** Short "60 kg × 8" style summary of a set, respecting the exercise's fields. */
export function formatSetValues(
  v: SetValues,
  fields: SetFields,
  units: { weight: WeightUnit; distance: DistanceUnit },
  opts: { unitLabel?: boolean } = {},
): string {
  const parts: string[] = [];
  const unitLabel = opts.unitLabel ?? true;
  if (fields.weight) {
    if (v.weightKg == null && v.reps == null) return '—';
    const w = v.weightKg != null ? formatWeight(v.weightKg, units.weight, unitLabel) : '—';
    const r = v.reps != null ? `${v.reps}` : '—';
    parts.push(`${w} × ${r}`);
  } else if (fields.reps) {
    if (v.reps == null) return '—';
    parts.push(`${v.reps}`);
  }
  if (fields.distance && v.distanceM != null) parts.push(formatDistance(v.distanceM, units.distance, unitLabel));
  if (fields.duration && v.durationSec != null) parts.push(formatDuration(v.durationSec));
  return parts.length ? parts.join(' · ') : '—';
}
