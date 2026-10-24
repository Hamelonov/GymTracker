import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { exerciseName, getExerciseUsage, listExercises } from '@/db/repo/exercises';
import { useQuery } from '@/db/version';
import {
  prepareCandidates,
  type ExerciseCandidate,
  type PreparedCandidate,
} from '@/domain/quickEntry/matchExercise';
import { parseLine } from '@/domain/quickEntry/parseLine';
import { resolveLine, type ResolvedLine } from '@/domain/quickEntry/resolveLine';
import type { LineError, ParseOptions } from '@/domain/quickEntry/types';
import type { ExerciseType } from '@/domain/types';
import { useSettings } from '@/store/settings';

export interface PenLine {
  lineIndex: number;
  /** Название нового упражнения или исходный текст ошибочной строки. */
  title: string;
  status: 'matched' | 'new' | 'error';
  /** Готовая подсказка об ошибке на языке интерфейса. */
  errorText?: string;
}

export interface PenTextState {
  lines: PenLine[];
  /** Нужны экрану, чтобы применить текст теми же кандидатами, что и предпросмотр. */
  candidates: PreparedCandidate[];
  typeByExerciseId: Map<string, ExerciseType>;
  exerciseCount: number;
  /** Рабочие подходы: разминка не считается, как и в «Стандарте». */
  setCount: number;
  errorCount: number;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

function errorTextFor(error: LineError, translate: Translate): string {
  if (error.reason === 'missingName') return translate('workout.quickEntryErrorMissingName');
  if (error.reason === 'repsExpected') return translate('workout.quickEntryErrorRepsExpected');
  return translate('workout.quickEntryErrorUnexpected', { fragment: error.fragment ?? '' });
}

// Разбор одной строки зависит только от её текста и набора кандидатов, поэтому результат кэшируется
// на кандидатов: при наборе заново считается лишь изменённая строка, а не весь текст.
const resolvedByCandidates = new WeakMap<PreparedCandidate[], Map<string, ResolvedLine>>();

function resolveTextLine(
  lineText: string,
  lineIndex: number,
  candidates: PreparedCandidate[],
  typeByExerciseId: Map<string, ExerciseType>,
  parseOptions: ParseOptions,
): ResolvedLine {
  let cache = resolvedByCandidates.get(candidates);
  if (!cache) {
    cache = new Map();
    resolvedByCandidates.set(candidates, cache);
  }
  const cacheKey = `${parseOptions.weightUnit}|${parseOptions.distanceUnit}|${lineText}`;
  const cached = cache.get(cacheKey);
  if (cached) return withLineIndex(cached, lineIndex);
  const parsed = parseLine(lineText, lineIndex, parseOptions);
  const resolved: ResolvedLine = parsed.ok
    ? resolveLine(parsed.line, candidates, typeByExerciseId, parseOptions.distanceUnit)
    : { kind: 'error', error: parsed.error };
  cache.set(cacheKey, resolved);
  return resolved;
}

/** Одинаковые строки на разных позициях делят кэш, поэтому номер строки подставляется заново. */
function withLineIndex(resolved: ResolvedLine, lineIndex: number): ResolvedLine {
  if (resolved.kind === 'error') return { kind: 'error', error: { ...resolved.error, lineIndex } };
  return { ...resolved, lineIndex };
}

/** Разбирает текст «Ручки» на каждом символе: кандидаты считаются один раз на список упражнений. */
export function usePenText(text: string, exerciseIdsInWorkout: string[]): PenTextState {
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  const exerciseRows = useQuery(() => listExercises(), []);
  const usageByExerciseId = useQuery(() => getExerciseUsage(), []);

  const inWorkoutKey = exerciseIdsInWorkout.join(',');
  const candidates = useMemo(() => {
    const inWorkout = new Set(inWorkoutKey.split(',').filter(Boolean));
    const exerciseCandidates: ExerciseCandidate[] = exerciseRows.map((row, order) => ({
      id: row.id,
      names: [row.nameRu, row.nameEn],
      isCustom: row.isCustom,
      usageCount: usageByExerciseId.get(row.id)?.count ?? 0,
      isInWorkout: inWorkout.has(row.id),
      order,
    }));
    return prepareCandidates(exerciseCandidates);
  }, [exerciseRows, usageByExerciseId, inWorkoutKey]);

  const rowsById = useMemo(() => new Map(exerciseRows.map((row) => [row.id, row])), [exerciseRows]);
  const typeByExerciseId = useMemo(
    () => new Map(exerciseRows.map((row) => [row.id, row.type])),
    [exerciseRows],
  );

  return useMemo(() => {
    const parseOptions: ParseOptions = { weightUnit, distanceUnit };
    const resolvedLines = text
      .split('\n')
      .map((lineText, lineIndex) => ({ lineText, lineIndex }))
      .filter(({ lineText }) => lineText.trim().length > 0)
      .map(({ lineText, lineIndex }) =>
        resolveTextLine(lineText, lineIndex, candidates, typeByExerciseId, parseOptions),
      );

    const lines: PenLine[] = resolvedLines.map((resolved) => {
      if (resolved.kind === 'error') {
        return {
          lineIndex: resolved.error.lineIndex,
          title: resolved.error.rawText.trim(),
          status: 'error',
          errorText: errorTextFor(resolved.error, translate),
        };
      }
      if (resolved.kind === 'new') {
        return { lineIndex: resolved.lineIndex, title: resolved.name, status: 'new' };
      }
      const row = rowsById.get(resolved.exerciseId);
      return {
        lineIndex: resolved.lineIndex,
        title: row ? exerciseName(row, i18n.language) : resolved.exerciseId,
        status: 'matched',
      };
    });

    const goodLines = resolvedLines.filter((resolved) => resolved.kind !== 'error');
    const exerciseKeys = new Set(
      goodLines.map((resolved) =>
        resolved.kind === 'matched' ? resolved.exerciseId : `new:${resolved.name}`,
      ),
    );
    const setCount = goodLines.reduce(
      (total, resolved) => total + resolved.sets.filter((set) => set.type !== 'warmup').length,
      0,
    );
    return {
      lines,
      candidates,
      typeByExerciseId,
      exerciseCount: exerciseKeys.size,
      setCount,
      errorCount: resolvedLines.length - goodLines.length,
    };
  }, [text, weightUnit, distanceUnit, candidates, typeByExerciseId, rowsById, translate, i18n.language]);
}
