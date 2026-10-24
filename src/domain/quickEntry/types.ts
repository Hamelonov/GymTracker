import type { DistanceUnit, SetType, WeightUnit } from '@/domain/types';

/** «+10кг» — дополнительный вес, «-20кг» — помощь, без знака — обычный вес. */
export type WeightSign = 'extra' | 'assist' | null;

export interface ParsedSet {
  type: SetType;
  /** Уже в килограммах; знак отдельно, число всегда положительное. */
  weightKg: number | null;
  weightSign: WeightSign;
  reps: number | null;
  durationSec: number | null;
  /** Уже в метрах. */
  distanceM: number | null;
}

export interface ParsedLine {
  lineIndex: number;
  rawText: string;
  name: string;
  sets: ParsedSet[];
}

export type LineErrorReason = 'missingName' | 'unexpectedText' | 'repsExpected';

export interface LineError {
  lineIndex: number;
  rawText: string;
  reason: LineErrorReason;
  /** Непонятый кусок строки для подсказки «Не понял: «…»». */
  fragment?: string;
}

export interface ParseOptions {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
}
