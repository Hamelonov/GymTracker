import type { SetValues, SetFields, WeightUnit, DistanceUnit } from '@/domain/types';
import {
  formatDistance,
  formatDuration,
  formatNumberWithoutTrailingZeros,
  formatWeight,
} from '@/domain/units';

type Units = { weight: WeightUnit; distance: DistanceUnit };

/** Короткая сводка подхода вида «60 kg × 8» с учётом полей упражнения. */
export function formatSetValues(
  values: SetValues,
  fields: SetFields,
  units: Units,
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
    // Дополнительный вес у упражнений со своим весом: «+10 kg × 8».
    const extraWeightText =
      values.weightKg != null ? `+${formatWeight(values.weightKg, units.weight, showUnitLabel)} × ` : '';
    parts.push(`${extraWeightText}${values.reps}`);
  } else if (values.weightKg != null) {
    // Планка с блином: «+20 kg · 1:00».
    parts.push(`+${formatWeight(values.weightKg, units.weight, showUnitLabel)}`);
  }
  if (fields.distance && values.distanceM != null)
    parts.push(formatDistance(values.distanceM, units.distance, showUnitLabel));
  if (fields.duration && values.durationSec != null) parts.push(formatDuration(values.durationSec));
  return parts.length ? parts.join(' · ') : '—';
}

/**
 * Строка подхода для истории: основные значения плюс RIR и RPE, если они записаны.
 * Пустые дополнительные поля не показываются вовсе — ни нулями, ни прочерками.
 */
export function formatSetLineWithExtras(values: SetValues, fields: SetFields, units: Units): string {
  const parts = [formatSetValues(values, fields, units)];
  if (values.rir != null) parts.push(`RIR ${values.rir}`);
  if (values.rpe != null) parts.push(`@${formatNumberWithoutTrailingZeros(values.rpe)}`);
  return parts.join(' · ');
}
