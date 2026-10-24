import {
  getSetFieldsForExerciseType,
  type DistanceUnit,
  type ExerciseType,
  type SetFields,
} from '@/domain/types';
import { unitToMeters } from '@/domain/units';
import { inferExerciseFromLine, type InferredExercise } from './inferExercise';
import { matchExerciseName, type PreparedCandidate } from './matchExercise';
import type { LineError, LineErrorReason, ParsedLine, ParsedSet } from './types';

export type ResolvedLine =
  | { kind: 'matched'; lineIndex: number; exerciseId: string; exerciseType: ExerciseType; sets: ParsedSet[] }
  | { kind: 'new'; lineIndex: number; name: string; inferred: InferredExercise; sets: ParsedSet[] }
  | { kind: 'error'; error: LineError };

type AdaptResult = { sets: ParsedSet[] } | { error: LineErrorReason };

/** Подгоняет подходы под поля упражнения; возвращает причину ошибки, если не сходится. */
export function adaptSetsToFields(
  sets: ParsedSet[],
  fields: SetFields,
  distanceUnit: DistanceUnit,
): AdaptResult {
  const countsOnlyTime = fields.duration && !fields.reps && !fields.distance;
  const countsOnlyReps = fields.reps && !fields.duration;

  const adaptedSets: ParsedSet[] = [];
  for (const set of sets) {
    const isBareNumber = set.reps != null && set.durationSec == null && set.distanceM == null;
    // «Планка 60»: у упражнения на время голое число — это секунды.
    if (countsOnlyTime && isBareNumber) {
      adaptedSets.push({ ...set, reps: null, durationSec: set.reps });
      continue;
    }
    // «Бег 5»: у бега голое число — дистанция в единицах пользователя, а не пять секунд.
    if (fields.distance && isBareNumber) {
      adaptedSets.push({ ...set, reps: null, distanceM: unitToMeters(set.reps ?? 0, distanceUnit) });
      continue;
    }
    const hasOnlyTimeOrDistance = set.reps == null && (set.durationSec != null || set.distanceM != null);
    if (countsOnlyReps && hasOnlyTimeOrDistance) return { error: 'repsExpected' };
    adaptedSets.push(set);
  }
  return { sets: adaptedSets };
}

function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Находит упражнение по названию строки или описывает новое; подходы подгоняются под его тип. */
export function resolveLine(
  line: ParsedLine,
  candidates: PreparedCandidate[],
  typeByExerciseId: Map<string, ExerciseType>,
  distanceUnit: DistanceUnit,
): ResolvedLine {
  const match = matchExerciseName(line.name, candidates);
  if (!match) {
    const name = capitalizeFirstLetter(line.name.trim());
    return {
      kind: 'new',
      lineIndex: line.lineIndex,
      name,
      inferred: inferExerciseFromLine(name, line.sets),
      sets: line.sets,
    };
  }

  const exerciseId = match.candidate.id;
  const exerciseType = typeByExerciseId.get(exerciseId) ?? 'weight_reps';
  const adapted = adaptSetsToFields(line.sets, getSetFieldsForExerciseType(exerciseType), distanceUnit);
  if ('error' in adapted) {
    return {
      kind: 'error',
      error: { lineIndex: line.lineIndex, rawText: line.rawText, reason: adapted.error },
    };
  }
  return { kind: 'matched', lineIndex: line.lineIndex, exerciseId, exerciseType, sets: adapted.sets };
}
