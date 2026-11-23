import { formatSetValue, formatSetWeight, getTimesSign } from '@/domain/setFormatting';
import type { ExerciseType, SetType, SetValues, SetFields, WeightUnit, DistanceUnit } from '@/domain/types';
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
    // Дополнительный вес у упражнений со своим весом: «10 kg × 8». Без знака «+» — это просто число.
    const extraWeightText =
      values.weightKg != null ? `${formatWeight(values.weightKg, units.weight, showUnitLabel)} × ` : '';
    parts.push(`${extraWeightText}${values.reps}`);
  } else if (values.weightKg != null) {
    // Планка с блином: «20 kg · 1:00».
    parts.push(formatWeight(values.weightKg, units.weight, showUnitLabel));
  }
  if (fields.distance && values.distanceM != null)
    parts.push(formatDistance(values.distanceM, units.distance, showUnitLabel));
  if (fields.duration && values.durationSec != null) parts.push(formatDuration(values.durationSec));
  return parts.length ? parts.join(' · ') : '—';
}

/**
 * Строка подхода для истории: «70кг х 8(1)», «10кг х 8», «1:00»;
 * RPE дописывается как «@8». Пустые дополнительные поля не показываются вовсе.
 * Знака «+»/«-» у добавленного веса нет.
 */
export function formatSetLineWithExtras(
  set: SetValues & { type: SetType },
  exerciseType: ExerciseType,
  units: Units,
  language: string,
): string {
  const options = { weightUnit: units.weight, distanceUnit: units.distance, language };
  const value = formatSetValue(set, exerciseType, options);
  const weight = set.weightKg != null ? formatSetWeight(set.weightKg, options) : null;
  let text = value || '—';
  if (weight && value) text = `${weight} ${getTimesSign(language)} ${value}`;
  else if (weight) text = weight;
  if (set.rpe != null) text = `${text} @${formatNumberWithoutTrailingZeros(set.rpe)}`;
  return text;
}
