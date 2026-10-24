import { getExercisesByIds, getLastPerformances } from '@/db/repo/exercises';
import type { PreparedCandidate } from '@/domain/quickEntry/matchExercise';
import { parseEntryText } from '@/domain/quickEntry/parseLine';
import { resolveLine, type ResolvedLine } from '@/domain/quickEntry/resolveLine';
import type {
  ActiveExercise,
  ActiveWorkout,
  DistanceUnit,
  ExerciseType,
  ExtraField,
  WeightUnit,
} from '@/domain/types';
import { rebuildWorkoutFromLines } from '@/store/activeWorkoutPen';
import { commitQuickEntry } from './commitQuickEntry';

export type ApplyPenTextResult =
  { ok: true; exercises: ActiveExercise[] } | { ok: false; errorLineCount: number };

interface ApplyPenTextOptions {
  text: string;
  workout: ActiveWorkout;
  candidates: PreparedCandidate[];
  typeByExerciseId: Map<string, ExerciseType>;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  now: number;
}

/**
 * Текст «Ручки» → карточки: разбор, подбор упражнений, создание новых в библиотеке и пересборка
 * тренировки. Строки с ошибками блокируют применение целиком, чтобы ничего не потерять.
 */
export function applyPenText(options: ApplyPenTextOptions): ApplyPenTextResult {
  const { text, workout, candidates, typeByExerciseId, weightUnit, distanceUnit, now } = options;
  const parseResults = parseEntryText(text, { weightUnit, distanceUnit });
  const resolvedLines: ResolvedLine[] = parseResults.map((result) =>
    result.ok
      ? resolveLine(result.line, candidates, typeByExerciseId, distanceUnit)
      : { kind: 'error', error: result.error },
  );
  const errorLineCount = resolvedLines.filter((resolved) => resolved.kind === 'error').length;
  if (errorLineCount > 0) return { ok: false, errorLineCount };

  const commits = commitQuickEntry(resolvedLines);
  const exerciseIds = commits.map((commit) => commit.exerciseId);
  const lastPerformanceByExerciseId = getLastPerformances(exerciseIds);
  const rows = getExercisesByIds(exerciseIds);
  const rememberedExtraFieldsByExerciseId = new Map<string, ExtraField[]>(
    exerciseIds.map((exerciseId) => [exerciseId, rows.get(exerciseId)?.rememberedExtraFields ?? []]),
  );
  const rebuilt = rebuildWorkoutFromLines(
    workout,
    commits,
    lastPerformanceByExerciseId,
    rememberedExtraFieldsByExerciseId,
    now,
  );
  return { ok: true, exercises: rebuilt.exercises };
}
