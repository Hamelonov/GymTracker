import type { SetValues, SetFields, WeightUnit, DistanceUnit } from '@/domain/types';
import { formatDistance, formatDuration, formatWeight } from '@/domain/units';

/** Short "60 kg × 8" style summary of a set, respecting the exercise's fields. */
export function formatSetValues(
  values: SetValues,
  fields: SetFields,
  units: { weight: WeightUnit; distance: DistanceUnit },
  options: { unitLabel?: boolean } = {},
): string {
  const parts: string[] = [];
  const showUnitLabel = options.unitLabel ?? true;
  if (fields.weight) {
    if (values.weightKg == null && values.reps == null) return '—';
    const weightText =
      values.weightKg != null ? formatWeight(values.weightKg, units.weight, showUnitLabel) : '—';
    const repsText = values.reps != null ? `${values.reps}` : '—';
    parts.push(`${weightText} × ${repsText}`);
  } else if (fields.reps) {
    if (values.reps == null) return '—';
    parts.push(`${values.reps}`);
  }
  if (fields.distance && values.distanceM != null)
    parts.push(formatDistance(values.distanceM, units.distance, showUnitLabel));
  if (fields.duration && values.durationSec != null) parts.push(formatDuration(values.durationSec));
  return parts.length ? parts.join(' · ') : '—';
}
