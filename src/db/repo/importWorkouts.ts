import { newId } from '@/domain/ids';
import { extraFieldsForSets } from '@/domain/quickEntry/extraFieldsForSets';
import { inferExerciseFromLine } from '@/domain/quickEntry/inferExercise';
import { matchExerciseName, prepareCandidates } from '@/domain/quickEntry/matchExercise';
import type { ParsedSet } from '@/domain/quickEntry/types';
import type { ImportedWorkout } from '@/domain/hevyCsv';
import {
  EXTRA_FIELDS,
  type ActiveExercise,
  type ActiveSet,
  type ActiveWorkout,
  type ExerciseType,
  type ExtraField,
} from '@/domain/types';
import { createExercise, getExerciseUsage, listExercises } from './exercises';
import { listWorkoutStartTimes, rebuildRecords, saveWorkout } from './workouts';

export interface ImportSummary {
  importedCount: number;
  /** Тренировки с тем же временем начала уже были в базе и пропущены. */
  duplicateCount: number;
  createdExerciseNames: string[];
}

/** Две тренировки считаются одной, если начались в одну и ту же минуту. */
export const DUPLICATE_WINDOW_MS = 60_000;

/**
 * Как узнать тренировку, которая уже есть в базе:
 * по минуте начала (CSV и JSON хранят точное время) или по дню (в Excel есть только дата).
 */
export type DuplicateRule = 'sameStartMinute' | 'sameDay';

function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function createDuplicateCheck(rule: DuplicateRule): {
  isDuplicate: (startedAt: number) => boolean;
  remember: (startedAt: number) => void;
} {
  const startTimes = listWorkoutStartTimes();
  if (rule === 'sameDay') {
    const dayKeys = new Set(startTimes.map(localDayKey));
    return {
      isDuplicate: (startedAt) => dayKeys.has(localDayKey(startedAt)),
      remember: (startedAt) => dayKeys.add(localDayKey(startedAt)),
    };
  }
  return {
    isDuplicate: (startedAt) =>
      startTimes.some((existing) => Math.abs(existing - startedAt) < DUPLICATE_WINDOW_MS),
    remember: (startedAt) => startTimes.push(startedAt),
  };
}

function toParsedSets(workout: ImportedWorkout['exercises'][number]): ParsedSet[] {
  return workout.sets.map((set) => ({
    type: set.type,
    weightKg: set.weightKg,
    weightSign: null,
    reps: set.reps,
    durationSec: set.durationSec,
    distanceM: set.distanceM,
    rir: set.rir,
  }));
}

/** Подбирает упражнение библиотеки по названию из Hevy; незнакомое создаёт как пользовательское. */
function createExerciseResolver(): {
  resolve: (
    title: string,
    exercise: ImportedWorkout['exercises'][number],
  ) => { id: string; type: ExerciseType };
  createdNames: string[];
} {
  const rows = listExercises();
  const usage = getExerciseUsage();
  let candidates = prepareCandidates(
    rows.map((row, order) => ({
      id: row.id,
      names: [row.nameRu, row.nameEn],
      isCustom: row.isCustom,
      usageCount: usage.get(row.id)?.count ?? 0,
      isInWorkout: false,
      order,
    })),
  );
  const typeById = new Map<string, ExerciseType>(rows.map((row) => [row.id, row.type]));
  const resolvedByTitle = new Map<string, { id: string; type: ExerciseType }>();
  const createdNames: string[] = [];

  const resolve = (title: string, exercise: ImportedWorkout['exercises'][number]) => {
    const cached = resolvedByTitle.get(title);
    if (cached) return cached;
    const match = matchExerciseName(title, candidates);
    if (match) {
      const resolved = { id: match.candidate.id, type: typeById.get(match.candidate.id) ?? 'weight_reps' };
      resolvedByTitle.set(title, resolved);
      return resolved;
    }
    const inferred = inferExerciseFromLine(title, toParsedSets(exercise));
    const created = createExercise({
      name: title,
      muscleGroup: inferred.muscleGroup,
      secondaryMuscles: [],
      equipment: inferred.equipment,
      type: inferred.type,
      description: '',
      restSeconds: null,
    });
    createdNames.push(title);
    // Новое упражнение сразу попадает в кандидаты: следующая тренировка с тем же названием найдёт его.
    candidates = prepareCandidates([
      ...candidates,
      {
        id: created.id,
        names: [created.nameRu, created.nameEn],
        isCustom: true,
        usageCount: 0,
        isInWorkout: false,
        order: candidates.length,
      },
    ]);
    typeById.set(created.id, created.type);
    const resolved = { id: created.id, type: created.type };
    resolvedByTitle.set(title, resolved);
    return resolved;
  };

  return { resolve, createdNames };
}

function toActiveWorkout(
  imported: ImportedWorkout,
  resolve: ReturnType<typeof createExerciseResolver>['resolve'],
): ActiveWorkout {
  const exercises: ActiveExercise[] = imported.exercises.map((exercise) => {
    const resolved = resolve(exercise.title, exercise);
    const parsedSets = toParsedSets(exercise);
    const hasRpe = exercise.sets.some((set) => set.rpe != null);
    // Колонки карточки: вес у упражнений без веса — как в быстрой записи, RPE — если он был в Hevy.
    const fieldsFromSets = extraFieldsForSets(parsedSets, resolved.type);
    const extraFields: ExtraField[] = EXTRA_FIELDS.filter(
      (field) => fieldsFromSets.includes(field) || (field === 'rpe' && hasRpe),
    );
    const sets: ActiveSet[] = exercise.sets.map((set, index) => ({
      id: newId(),
      type: set.type,
      completed: true,
      // Время подхода неизвестно: раскладываем их по минуте, чтобы порядок сохранился в истории.
      completedAt: imported.startedAt + index * 60_000,
      previous: null,
      weightKg: set.weightKg,
      reps: set.reps,
      durationSec: set.durationSec,
      distanceM: set.distanceM,
      rpe: set.rpe,
      rir: set.rir,
    }));
    return {
      id: newId(),
      exerciseId: resolved.id,
      supersetGroup: exercise.supersetGroup,
      note: exercise.note,
      restSeconds: null,
      extraFields,
      sets,
    };
  });
  return {
    id: newId(),
    name: imported.title,
    startedAt: imported.startedAt,
    routineId: null,
    notes: imported.notes,
    exercises,
  };
}

/**
 * Слияние тренировок из Hevy с базой: существующие записи не трогаются, тренировки с тем же временем
 * начала пропускаются, незнакомые упражнения создаются. Рекорды пересчитываются по всей истории.
 */
export function importWorkouts(
  importedWorkouts: ImportedWorkout[],
  duplicateRule: DuplicateRule = 'sameStartMinute',
): ImportSummary {
  const duplicates = createDuplicateCheck(duplicateRule);

  const resolver = createExerciseResolver();
  const touchedExerciseIds = new Set<string>();
  let importedCount = 0;
  let duplicateCount = 0;

  // Старые тренировки первыми: так рекорды «тогда» не сравниваются с результатами «потом».
  const sorted = [...importedWorkouts].sort((left, right) => left.startedAt - right.startedAt);
  for (const imported of sorted) {
    if (imported.exercises.length === 0) continue;
    if (duplicates.isDuplicate(imported.startedAt)) {
      duplicateCount += 1;
      continue;
    }
    const activeWorkout = toActiveWorkout(imported, resolver.resolve);
    saveWorkout(activeWorkout, imported.finishedAt);
    duplicates.remember(imported.startedAt);
    activeWorkout.exercises.forEach((exercise) => touchedExerciseIds.add(exercise.exerciseId));
    importedCount += 1;
  }
  rebuildRecords([...touchedExerciseIds]);
  return { importedCount, duplicateCount, createdExerciseNames: resolver.createdNames };
}

export async function importWorkoutsAsync(
  importedWorkouts: ImportedWorkout[],
  duplicateRule: DuplicateRule = 'sameStartMinute',
  onProgress?: (progress: { current: number; total: number }) => void,
): Promise<ImportSummary> {
  const duplicates = createDuplicateCheck(duplicateRule);
  const resolver = createExerciseResolver();
  const touchedExerciseIds = new Set<string>();
  const sorted = [...importedWorkouts].sort((left, right) => left.startedAt - right.startedAt);
  let importedCount = 0;
  let duplicateCount = 0;

  for (const [index, imported] of sorted.entries()) {
    if (imported.exercises.length > 0) {
      if (duplicates.isDuplicate(imported.startedAt)) {
        duplicateCount += 1;
      } else {
        const activeWorkout = toActiveWorkout(imported, resolver.resolve);
        saveWorkout(activeWorkout, imported.finishedAt);
        duplicates.remember(imported.startedAt);
        activeWorkout.exercises.forEach((exercise) => touchedExerciseIds.add(exercise.exerciseId));
        importedCount += 1;
      }
    }

    onProgress?.({ current: index + 1, total: sorted.length });
    if (index + 1 < sorted.length) {
      // Интерфейс должен отрисовать шаг прогресса до обработки следующей тренировки.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  rebuildRecords([...touchedExerciseIds]);
  return { importedCount, duplicateCount, createdExerciseNames: resolver.createdNames };
}
