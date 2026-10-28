import { database, sqlite } from '../client';
import {
  exercises,
  measurements,
  personalRecords,
  routineExercises,
  routineFolders,
  routineSets,
  routines,
  sets,
  workoutExercises,
  workouts,
} from '../schema';
import { notifyDatabaseChanged } from '../version';
import { formatDuration, kgToUnit } from '@/domain/units';
import type { WeightUnit } from '@/domain/types';
import { exerciseName } from './exercises';

export { stringifyBackupAsync } from './backupSerialization';

export const BACKUP_VERSION = 1;

export interface Backup {
  app: 'gymtracker';
  version: number;
  exportedAt: number;
  exercises: (typeof exercises.$inferSelect)[];
  routineFolders: (typeof routineFolders.$inferSelect)[];
  routines: (typeof routines.$inferSelect)[];
  routineExercises: (typeof routineExercises.$inferSelect)[];
  routineSets: (typeof routineSets.$inferSelect)[];
  workouts: (typeof workouts.$inferSelect)[];
  workoutExercises: (typeof workoutExercises.$inferSelect)[];
  sets: (typeof sets.$inferSelect)[];
  measurements: (typeof measurements.$inferSelect)[];
  personalRecords: (typeof personalRecords.$inferSelect)[];
}

export function createBackup(): Backup {
  return {
    app: 'gymtracker',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    exercises: database.select().from(exercises).all(),
    routineFolders: database.select().from(routineFolders).all(),
    routines: database.select().from(routines).all(),
    routineExercises: database.select().from(routineExercises).all(),
    routineSets: database.select().from(routineSets).all(),
    workouts: database.select().from(workouts).all(),
    workoutExercises: database.select().from(workoutExercises).all(),
    sets: database.select().from(sets).all(),
    measurements: database.select().from(measurements).all(),
    personalRecords: database.select().from(personalRecords).all(),
  };
}

export function isBackup(value: unknown): value is Backup {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.app === 'gymtracker' &&
    typeof candidate.version === 'number' &&
    Array.isArray(candidate.workouts) &&
    Array.isArray(candidate.exercises)
  );
}

/** Делит строки на пачки, чтобы один INSERT не превышал лимит переменных `SQLite`. */
export function splitIntoChunks<T>(items: T[], size = 200): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export function deleteAllUserData(): void {
  database.transaction((transaction) => {
    transaction.delete(personalRecords).run();
    transaction.delete(sets).run();
    transaction.delete(workoutExercises).run();
    transaction.delete(workouts).run();
    transaction.delete(routineSets).run();
    transaction.delete(routineExercises).run();
    transaction.delete(routines).run();
    transaction.delete(routineFolders).run();
    transaction.delete(measurements).run();
  });
  sqlite.execSync('VACUUM;');
  notifyDatabaseChanged();
}

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const text = String(value);
  const needsQuotes = /[",\n]/.test(text);
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Плоский CSV: одна строка на подход. */
function createWorkoutsCsvContext(backup: Backup, unit: WeightUnit, language: string) {
  const exercisesById = new Map(backup.exercises.map((exercise) => [exercise.id, exercise]));
  const workoutsById = new Map(backup.workouts.map((workout) => [workout.id, workout]));
  const workoutExercisesById = new Map(
    backup.workoutExercises.map((workoutExercise) => [workoutExercise.id, workoutExercise]),
  );

  function workoutStartOfSet(set: (typeof backup.sets)[number]): number {
    const workoutId = workoutExercisesById.get(set.workoutExerciseId)?.workoutId ?? '';
    return workoutsById.get(workoutId)?.startedAt ?? 0;
  }

  const sortedSets = [...backup.sets].sort(
    (firstSet, secondSet) =>
      workoutStartOfSet(firstSet) - workoutStartOfSet(secondSet) || firstSet.position - secondSet.position,
  );
  return { backup, exercisesById, workoutsById, workoutExercisesById, sortedSets, unit, language };
}

function formatWorkoutCsvSet(
  set: Backup['sets'][number],
  context: ReturnType<typeof createWorkoutsCsvContext>,
): string | null {
  const workoutExercise = context.workoutExercisesById.get(set.workoutExerciseId);
  if (!workoutExercise) return null;
  const workout = context.workoutsById.get(workoutExercise.workoutId);
  const exercise = context.exercisesById.get(workoutExercise.exerciseId);
  if (!workout || !exercise) return null;
  const weightInUnit =
    set.weightKg != null ? Math.round(kgToUnit(set.weightKg, context.unit) * 100) / 100 : '';
  return [
    new Date(workout.startedAt).toISOString(),
    csvCell(workout.name),
    formatDuration(workout.durationSec),
    csvCell(exerciseName(exercise, context.language)),
    set.position + 1,
    set.type,
    weightInUnit,
    set.reps ?? '',
    set.durationSec ?? '',
    set.distanceM ?? '',
    set.rpe ?? '',
    set.rir ?? '',
    csvCell(workoutExercise.note),
  ].join(',');
}

function createWorkoutsCsvHeader(unit: WeightUnit): string {
  return [
    'date',
    'workout',
    'duration',
    'exercise',
    'set',
    'type',
    `weight_${unit}`,
    'reps',
    'duration_sec',
    'distance_m',
    'rpe',
    'rir',
    'note',
  ].join(',');
}

export function workoutsCsv(unit: WeightUnit, language: string): string {
  const context = createWorkoutsCsvContext(createBackup(), unit, language);
  const lines = [createWorkoutsCsvHeader(unit)];
  for (const set of context.sortedSets) {
    const row = formatWorkoutCsvSet(set, context);
    if (row) lines.push(row);
  }
  return lines.join('\n');
}

export async function workoutsCsvAsync(
  unit: WeightUnit,
  language: string,
  onProgress?: (current: number, total: number) => void,
): Promise<string> {
  const context = createWorkoutsCsvContext(createBackup(), unit, language);
  const lines = [createWorkoutsCsvHeader(unit)];

  for (const [index, set] of context.sortedSets.entries()) {
    const row = formatWorkoutCsvSet(set, context);
    if (row) lines.push(row);
    if ((index + 1) % 200 === 0 || index === context.sortedSets.length - 1) {
      onProgress?.(index + 1, context.sortedSets.length);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  if (context.sortedSets.length === 0) onProgress?.(0, 0);
  return lines.join('\n');
}
