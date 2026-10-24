import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { exerciseName, getExerciseUsage, listExercises } from '@/db/repo/exercises';
import { useQuery } from '@/db/version';
import { prepareCandidates, type ExerciseCandidate } from '@/domain/quickEntry/matchExercise';
import { parseEntryText } from '@/domain/quickEntry/parseLine';
import { resolveLine, type ResolvedLine } from '@/domain/quickEntry/resolveLine';
import type { LineError, ParsedSet } from '@/domain/quickEntry/types';
import { formatSetsLine, type ValueFormatters } from '@/domain/summary';
import { getSetFieldsForExerciseType, type ExerciseType } from '@/domain/types';
import { formatDistance, formatDuration, formatWeight } from '@/domain/units';
import { useSettings } from '@/store/settings';

export interface PreviewLine {
  lineIndex: number;
  /** Что показать в предпросмотре: название, «Новое упражнение: …» или исходный текст ошибочной строки. */
  title: string;
  /** Чистое название упражнения для тоста. */
  name: string;
  /** «70 кг × 7 / 6 / 5» или '' для «только название». */
  setsText: string;
  status: 'matched' | 'new' | 'error';
  /** Готовая подсказка об ошибке на языке интерфейса. */
  errorText?: string;
}

export interface QuickEntryState {
  previewLines: PreviewLine[];
  resolvedLines: ResolvedLine[];
  /** Есть хотя бы одна строка и ни одной ошибки. */
  canSubmit: boolean;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

function errorTextFor(error: LineError, translate: Translate): string {
  if (error.reason === 'missingName') return translate('workout.quickEntryErrorMissingName');
  if (error.reason === 'repsExpected') return translate('workout.quickEntryErrorRepsExpected');
  return translate('workout.quickEntryErrorUnexpected', { fragment: error.fragment ?? '' });
}

function setsTextFor(sets: ParsedSet[], exerciseType: ExerciseType, formatters: ValueFormatters): string {
  if (sets.length === 0) return '';
  const lineSets = sets.map((set) => ({ ...set, rpe: null }));
  return formatSetsLine(lineSets, getSetFieldsForExerciseType(exerciseType), formatters);
}

/** Разбирает текст поля на каждом символе: кандидаты и их основы считаются один раз на список упражнений. */
export function useQuickEntry(text: string, exerciseIdsInWorkout: string[]): QuickEntryState {
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

  const formatters = useMemo<ValueFormatters>(
    () => ({
      weight: (weightKg) => formatWeight(weightKg, weightUnit),
      duration: (seconds) => formatDuration(seconds),
      distance: (meters) => formatDistance(meters, distanceUnit),
    }),
    [weightUnit, distanceUnit],
  );

  return useMemo(() => {
    const parseResults = parseEntryText(text, { weightUnit, distanceUnit });
    const resolvedLines: ResolvedLine[] = parseResults.map((result) =>
      result.ok
        ? resolveLine(result.line, candidates, typeByExerciseId, distanceUnit)
        : { kind: 'error', error: result.error },
    );

    const previewLines: PreviewLine[] = resolvedLines.map((resolved) => {
      if (resolved.kind === 'error') {
        return {
          lineIndex: resolved.error.lineIndex,
          title: resolved.error.rawText.trim(),
          name: resolved.error.rawText.trim(),
          setsText: '',
          status: 'error',
          errorText: errorTextFor(resolved.error, translate),
        };
      }
      if (resolved.kind === 'new') {
        return {
          lineIndex: resolved.lineIndex,
          title: `${translate('workout.quickEntryNewExercise')}: ${resolved.name}`,
          name: resolved.name,
          setsText: setsTextFor(resolved.sets, resolved.inferred.type, formatters),
          status: 'new',
        };
      }
      const row = rowsById.get(resolved.exerciseId);
      const name = row ? exerciseName(row, i18n.language) : resolved.exerciseId;
      return {
        lineIndex: resolved.lineIndex,
        title: name,
        name,
        setsText: setsTextFor(resolved.sets, row?.type ?? 'weight_reps', formatters),
        status: 'matched',
      };
    });

    const canSubmit =
      resolvedLines.length > 0 && resolvedLines.every((resolved) => resolved.kind !== 'error');
    return { previewLines, resolvedLines, canSubmit };
  }, [
    text,
    weightUnit,
    distanceUnit,
    candidates,
    typeByExerciseId,
    rowsById,
    formatters,
    translate,
    i18n.language,
  ]);
}
