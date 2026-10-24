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

/** Split rows into batches so a single INSERT never exceeds SQLite's variable limit. */
function splitIntoChunks<T>(items: T[], size = 200): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

/** Replace all data with the backup contents. Runs in a single transaction. */
export function restoreBackup(backup: Backup): void {
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
    transaction.delete(exercises).run();
    for (const chunk of splitIntoChunks(backup.exercises)) {
      transaction.insert(exercises).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(backup.routineFolders ?? [])) {
      transaction.insert(routineFolders).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(backup.routines ?? [])) {
      transaction.insert(routines).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(backup.routineExercises ?? [])) {
      transaction.insert(routineExercises).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(backup.routineSets ?? [])) {
      transaction.insert(routineSets).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(backup.workouts ?? [])) {
      transaction.insert(workouts).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(backup.workoutExercises ?? [])) {
      transaction.insert(workoutExercises).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(backup.sets ?? [])) {
      transaction.insert(sets).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(backup.measurements ?? [])) {
      transaction.insert(measurements).values(chunk).run();
    }
    for (const chunk of splitIntoChunks(backup.personalRecords ?? [])) {
      transaction.insert(personalRecords).values(chunk).run();
    }
  });
  notifyDatabaseChanged();
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

/** Flat CSV: one row per set. */
export function workoutsCsv(unit: WeightUnit, language: string): string {
  const backup = createBackup();
  const exercisesById = new Map(backup.exercises.map((exercise) => [exercise.id, exercise]));
  const workoutsById = new Map(backup.workouts.map((workout) => [workout.id, workout]));
  const workoutExercisesById = new Map(
    backup.workoutExercises.map((workoutExercise) => [workoutExercise.id, workoutExercise]),
  );
  const header = [
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
    'note',
  ];
  const lines = [header.join(',')];

  function workoutStartOfSet(set: (typeof backup.sets)[number]): number {
    const workoutId = workoutExercisesById.get(set.workoutExerciseId)?.workoutId ?? '';
    return workoutsById.get(workoutId)?.startedAt ?? 0;
  }

  const sortedSets = [...backup.sets].sort(
    (firstSet, secondSet) =>
      workoutStartOfSet(firstSet) - workoutStartOfSet(secondSet) || firstSet.position - secondSet.position,
  );
  for (const set of sortedSets) {
    const workoutExercise = workoutExercisesById.get(set.workoutExerciseId);
    if (!workoutExercise) continue;
    const workout = workoutsById.get(workoutExercise.workoutId);
    const exercise = exercisesById.get(workoutExercise.exerciseId);
    if (!workout || !exercise) continue;
    const weightInUnit = set.weightKg != null ? Math.round(kgToUnit(set.weightKg, unit) * 100) / 100 : '';
    lines.push(
      [
        new Date(workout.startedAt).toISOString(),
        csvCell(workout.name),
        formatDuration(workout.durationSec),
        csvCell(exerciseName(exercise, language)),
        set.position + 1,
        set.type,
        weightInUnit,
        set.reps ?? '',
        set.durationSec ?? '',
        set.distanceM ?? '',
        set.rpe ?? '',
        csvCell(workoutExercise.note),
      ].join(','),
    );
  }
  return lines.join('\n');
}
