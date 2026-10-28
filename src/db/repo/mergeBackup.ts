import { database } from '../client';
import {
  exercises,
  measurements,
  routineExercises,
  routineFolders,
  routineSets,
  routines,
  sets,
  workoutExercises,
  workouts,
} from '../schema';
import { notifyDatabaseChanged } from '../version';
import { splitIntoChunks, type Backup } from './backup';
import { DUPLICATE_WINDOW_MS } from './importWorkouts';
import { listWorkoutStartTimes, rebuildRecords } from './workouts';

export interface BackupMergeSummary {
  importedCount: number;
  /** Тренировки, которые уже есть: та же запись или то же время начала. */
  duplicateCount: number;
  createdExerciseCount: number;
}

type TableWithId =
  typeof exercises | typeof workouts | typeof routines | typeof routineFolders | typeof measurements;

function existingIds(table: TableWithId): Set<string> {
  return new Set(
    database
      .select({ id: table.id })
      .from(table)
      .all()
      .map((row) => row.id),
  );
}

/**
 * Добавляет резервную копию к текущим данным, ничего не удаляя и не перезаписывая.
 * У каждой записи постоянный id, поэтому добавляется только то, чего ещё нет.
 * Рекорды не копируются, а пересчитываются по объединённой истории.
 */
export function mergeBackup(backup: Backup): BackupMergeSummary {
  const knownExerciseIds = existingIds(exercises);
  const knownWorkoutIds = existingIds(workouts);
  const knownRoutineIds = existingIds(routines);
  const knownFolderIds = existingIds(routineFolders);
  const knownMeasurementIds = existingIds(measurements);
  const startTimes = listWorkoutStartTimes();

  // Встроенные упражнения везде с одинаковыми id, поэтому добавятся только свои упражнения из копии.
  const exercisesToAdd = backup.exercises.filter((exercise) => !knownExerciseIds.has(exercise.id));

  // Тренировка уже есть, если совпал id (та же копия) или минута начала (та же тренировка из CSV или Hevy).
  const workoutsToAdd: Backup['workouts'] = [];
  let duplicateCount = 0;
  for (const workout of backup.workouts ?? []) {
    const isSameStart = startTimes.some(
      (startedAt) => Math.abs(startedAt - workout.startedAt) < DUPLICATE_WINDOW_MS,
    );
    if (knownWorkoutIds.has(workout.id) || isSameStart) {
      duplicateCount += 1;
      continue;
    }
    workoutsToAdd.push(workout);
    startTimes.push(workout.startedAt);
  }
  const addedWorkoutIds = new Set(workoutsToAdd.map((workout) => workout.id));
  const workoutExercisesToAdd = (backup.workoutExercises ?? []).filter((workoutExercise) =>
    addedWorkoutIds.has(workoutExercise.workoutId),
  );
  const addedWorkoutExerciseIds = new Set(workoutExercisesToAdd.map((workoutExercise) => workoutExercise.id));
  const setsToAdd = (backup.sets ?? []).filter((set) => addedWorkoutExerciseIds.has(set.workoutExerciseId));

  const foldersToAdd = (backup.routineFolders ?? []).filter((folder) => !knownFolderIds.has(folder.id));
  const routinesToAdd = (backup.routines ?? []).filter((routine) => !knownRoutineIds.has(routine.id));
  const addedRoutineIds = new Set(routinesToAdd.map((routine) => routine.id));
  const routineExercisesToAdd = (backup.routineExercises ?? []).filter((routineExercise) =>
    addedRoutineIds.has(routineExercise.routineId),
  );
  const addedRoutineExerciseIds = new Set(routineExercisesToAdd.map((routineExercise) => routineExercise.id));
  const routineSetsToAdd = (backup.routineSets ?? []).filter((routineSet) =>
    addedRoutineExerciseIds.has(routineSet.routineExerciseId),
  );
  const measurementsToAdd = (backup.measurements ?? []).filter(
    (measurement) => !knownMeasurementIds.has(measurement.id),
  );

  // Порядок вставки — от родителей к детям, иначе SQLite отклонит ссылки на ещё не добавленные записи.
  database.transaction((transaction) => {
    for (const chunk of splitIntoChunks(exercisesToAdd)) transaction.insert(exercises).values(chunk).run();
    for (const chunk of splitIntoChunks(foldersToAdd)) transaction.insert(routineFolders).values(chunk).run();
    for (const chunk of splitIntoChunks(routinesToAdd)) transaction.insert(routines).values(chunk).run();
    for (const chunk of splitIntoChunks(routineExercisesToAdd)) {
      transaction.insert(routineExercises).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(routineSetsToAdd))
      transaction.insert(routineSets).values(chunk).run();
    for (const chunk of splitIntoChunks(workoutsToAdd)) transaction.insert(workouts).values(chunk).run();
    for (const chunk of splitIntoChunks(workoutExercisesToAdd)) {
      transaction.insert(workoutExercises).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(setsToAdd)) transaction.insert(sets).values(chunk).run();
    for (const chunk of splitIntoChunks(measurementsToAdd))
      transaction.insert(measurements).values(chunk).run();
  });

  rebuildRecords([...new Set(workoutExercisesToAdd.map((workoutExercise) => workoutExercise.exerciseId))]);
  notifyDatabaseChanged();
  return {
    importedCount: workoutsToAdd.length,
    duplicateCount,
    createdExerciseCount: exercisesToAdd.length,
  };
}

export async function mergeBackupAsync(
  backup: Backup,
  onProgress?: (progressRatio: number, current?: number, total?: number) => void,
): Promise<BackupMergeSummary> {
  onProgress?.(0);
  // Даём модальному окну отрисоваться перед синхронной транзакцией слияния.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const summary = mergeBackup(backup);
  onProgress?.(1, backup.workouts.length, backup.workouts.length);
  return summary;
}
