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
const DUPLICATE_WINDOW_MS = 60_000;

function toParsedSets(workout: ImportedWorkout['exercises'][number]): ParsedSet[] {
  return workout.sets.map((set) => ({
    type: set.type,
    weightKg: set.weightKg,
    weightSign: null,
    reps: set.reps,
    durationSec: set.durationSec,
    distanceM: set.distanceM,
    rir: null,
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
  const rows = listExercises({ includeArchived: true });
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
      rir: null,
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
export function importWorkouts(importedWorkouts: ImportedWorkout[]): ImportSummary {
  const existingStartTimes = listWorkoutStartTimes();
  const isDuplicate = (startedAt: number) =>
    existingStartTimes.some((existing) => Math.abs(existing - startedAt) < DUPLICATE_WINDOW_MS);

  const resolver = createExerciseResolver();
  const touchedExerciseIds = new Set<string>();
  let importedCount = 0;
  let duplicateCount = 0;

  // Старые тренировки первыми: так рекорды «тогда» не сравниваются с результатами «потом».
  const sorted = [...importedWorkouts].sort((left, right) => left.startedAt - right.startedAt);
  for (const imported of sorted) {
    if (imported.exercises.length === 0) continue;
    if (isDuplicate(imported.startedAt)) {
      duplicateCount += 1;
      continue;
    }
    const activeWorkout = toActiveWorkout(imported, resolver.resolve);
    saveWorkout(activeWorkout, imported.finishedAt);
    existingStartTimes.push(imported.startedAt);
    activeWorkout.exercises.forEach((exercise) => touchedExerciseIds.add(exercise.exerciseId));
    importedCount += 1;
  }
  rebuildRecords([...touchedExerciseIds]);
  return { importedCount, duplicateCount, createdExerciseNames: resolver.createdNames };
}
