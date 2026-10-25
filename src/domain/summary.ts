import type { RecordHit, RecordType, SetFields, SetValues } from './types';

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

export interface ValueFormatters {
  weight: (kg: number) => string;
  duration: (seconds: number) => string;
  distance: (meters: number) => string;
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
