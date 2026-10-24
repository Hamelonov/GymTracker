import type { RecordHit, RecordType, SetFields, SetType, SetValues } from './types';

/** Какое значение должна показывать строка рекорда для упражнения. */
export type RecordMetric = 'weight' | 'reps' | 'duration' | 'distance';

/**
 * Выбирает значение для плитки «новые рекорды».
 *
 * - Упражнения с весом показывают вес, если рекорд веса сдвинулся; если улучшились только повторы
 *   (тот же вес, больше повторов), показывают повторы.
 * - Упражнения без веса вес не показывают: дистанция, время или повторы,
 *   что из этого сдвинулось, в таком порядке.
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
  /** Старый рекорд до этой тренировки или null, если его не было. */
  previous: number | null;
  /** Новое лучшее значение, достигнутое в этой тренировке. */
  best: number;
}

/** Старое и новое значение для одного типа рекорда или null, если рекорд не сдвинулся. */
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

/** Подходы с одним весом: «80 × 8/7/6». `weightKg` равен null для собственного веса или кардио. */
export interface SetGroup {
  weightKg: number | null;
  /** Повторы по подходам или отформатированные время / дистанция для кардио. */
  values: string[];
}

/** «9» или «9(1)» — повторы и RIR в скобках, в той же записи, что принимает быстрый ввод. */
function formatReps(set: LineSet): string {
  if (set.reps == null) return '—';
  return set.rir != null ? `${set.reps}(${set.rir})` : String(set.reps);
}

/**
 * Рабочие подходы одного упражнения, сгруппированные так, как их пишут на доске:
 * подряд идущие подходы с одним весом образуют группу. Разминка не учитывается.
 */
export function groupSets(sets: LineSet[], fields: SetFields, formatters: ValueFormatters): SetGroup[] {
  const workingSets = sets.filter((set) => set.type !== 'warmup');
  if (workingSets.length === 0) return [];

  const isCardio = fields.distance || (fields.duration && !fields.reps);
  const formatValue = (set: LineSet): string => {
    if (!isCardio) return formatReps(set);
    const parts: string[] = [];
    if (fields.distance && set.distanceM != null) parts.push(formatters.distance(set.distanceM));
    if (fields.duration && set.durationSec != null) parts.push(formatters.duration(set.durationSec));
    return parts.join(' ') || '—';
  };

  // Вес группирует подходы и у упражнений без поля веса: дополнительный вес у подтягиваний — «10 кг × 8 / 8».
  const groups: SetGroup[] = [];
  for (const set of workingSets) {
    const weightKg = set.weightKg != null && set.weightKg > 0 ? set.weightKg : null;
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.weightKg === weightKg) lastGroup.values.push(formatValue(set));
    else groups.push({ weightKg, values: [formatValue(set)] });
  }
  return groups;
}

/** Одна группа текстом: «80 × 8 / 7 / 6» или «8 / 7 / 7». */
export function formatGroup(group: SetGroup, formatWeight: (kg: number) => string): string {
  // Значения кардио вроде «1 km 5:00» содержат пробелы, поэтому слэш между ними плохо читался бы.
  const separator = group.values.some((value) => value.includes(' ')) ? ' · ' : ' / ';
  const joinedValues = group.values.join(separator);
  return group.weightKg == null ? joinedValues : `${formatWeight(group.weightKg)} × ${joinedValues}`;
}

/**
 * Всё упражнение в одной строке, группы через запятую:
 *   "82.5 × 7/6, 80 × 8", "8/7/7", "1:00/0:45".
 */
export function formatSetsLine(sets: LineSet[], fields: SetFields, formatters: ValueFormatters): string {
  const groups = groupSets(sets, fields, formatters);
  if (groups.length === 0) return '—';
  return groups.map((group) => formatGroup(group, formatters.weight)).join(', ');
}

/** Подход считается заполненным, если хотя бы одно поле упражнения больше нуля. */
export function isSetFilled(values: SetValues, fields: SetFields): boolean {
  const isPositive = (value: number | null) => value != null && value > 0;
  return (
    (fields.weight && isPositive(values.weightKg)) ||
    (fields.reps && isPositive(values.reps)) ||
    (fields.duration && isPositive(values.durationSec)) ||
    (fields.distance && isPositive(values.distanceM))
  );
}
