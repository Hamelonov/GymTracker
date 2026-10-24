import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { database } from '../client';
import {
  exercises,
  personalRecords,
  sets,
  workoutExercises,
  workouts,
  type ExerciseRow,
  type SetRow,
} from '../schema';
import { notifyDatabaseChanged } from '../version';
import { newId } from '@/domain/ids';
import type { Equipment, ExerciseType, MuscleGroup, RecordType, SetValues } from '@/domain/types';
import type { RecordTable } from '@/domain/records';

export function exerciseName(
  exercise: Pick<ExerciseRow, 'nameEn' | 'nameRu' | 'isCustom'>,
  language: string,
): string {
  if (exercise.isCustom) return exercise.nameEn;
  return language.startsWith('ru') ? exercise.nameRu : exercise.nameEn;
}

export function exerciseDescription(
  exercise: Pick<ExerciseRow, 'description' | 'descriptionEn' | 'descriptionRu'>,
  language: string,
): string {
  if (exercise.description && exercise.description.trim()) return exercise.description;
  return language.startsWith('ru') ? exercise.descriptionRu : exercise.descriptionEn;
}

export function listExercises(options: { includeArchived?: boolean } = {}): ExerciseRow[] {
  const query = database.select().from(exercises);
  if (options.includeArchived) return query.all();
  return query.where(eq(exercises.archived, false)).all();
}

export function getExercise(id: string): ExerciseRow | undefined {
  return database.select().from(exercises).where(eq(exercises.id, id)).get();
}

export function getExercisesByIds(ids: string[]): Map<string, ExerciseRow> {
  if (ids.length === 0) return new Map();
  const rows = database.select().from(exercises).where(inArray(exercises.id, ids)).all();
  return new Map(rows.map((row) => [row.id, row]));
}

export interface ExerciseInput {
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  type: ExerciseType;
  description: string;
  restSeconds: number | null;
}

export function createExercise(input: ExerciseInput): ExerciseRow {
  const row: ExerciseRow = {
    id: newId(),
    nameEn: input.name.trim(),
    nameRu: input.name.trim(),
    muscleGroup: input.muscleGroup,
    secondaryMuscles: input.secondaryMuscles,
    equipment: input.equipment,
    type: input.type,
    descriptionEn: '',
    descriptionRu: '',
    description: input.description.trim() || null,
    isCustom: true,
    restSeconds: input.restSeconds,
    archived: false,
    createdAt: Date.now(),
  };
  database.insert(exercises).values(row).run();
  notifyDatabaseChanged();
  return row;
}

export function updateExercise(id: string, patch: Partial<ExerciseInput>): void {
  const existing = getExercise(id);
  if (!existing) return;
  const values: Partial<ExerciseRow> = {};
  if (patch.name != null) {
    values.nameEn = patch.name.trim();
    if (existing.isCustom) values.nameRu = patch.name.trim();
  }
  if (patch.muscleGroup != null) values.muscleGroup = patch.muscleGroup;
  if (patch.secondaryMuscles != null) values.secondaryMuscles = patch.secondaryMuscles;
  if (patch.equipment != null) values.equipment = patch.equipment;
  if (patch.type != null) values.type = patch.type;
  if (patch.description !== undefined) values.description = patch.description.trim() || null;
  if (patch.restSeconds !== undefined) values.restSeconds = patch.restSeconds;
  database.update(exercises).set(values).where(eq(exercises.id, id)).run();
  notifyDatabaseChanged();
}

export function setExerciseArchived(id: string, archived: boolean): void {
  database.update(exercises).set({ archived }).where(eq(exercises.id, id)).run();
  notifyDatabaseChanged();
}

export function deleteExercise(id: string): void {
  database.delete(exercises).where(eq(exercises.id, id)).run();
  notifyDatabaseChanged();
}

/** В скольких тренировках участвовало каждое упражнение, для сортировки «недавние» / «частые». */
export function getExerciseUsage(): Map<string, { count: number; lastAt: number }> {
  const rows = database
    .select({
      exerciseId: workoutExercises.exerciseId,
      count: sql<number>`count(*)`,
      lastAt: sql<number>`max(${workouts.startedAt})`,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .groupBy(workoutExercises.exerciseId)
    .all();
  return new Map(rows.map((row) => [row.exerciseId, { count: row.count, lastAt: row.lastAt }]));
}

export function getRecordTable(exerciseId: string): RecordTable {
  const rows = database
    .select()
    .from(personalRecords)
    .where(eq(personalRecords.exerciseId, exerciseId))
    .all();
  const table: RecordTable = {};
  for (const row of rows) table[row.type] = row.value;
  return table;
}

export function getRecordTables(exerciseIds: string[]): Map<string, RecordTable> {
  const tablesByExerciseId = new Map<string, RecordTable>();
  if (exerciseIds.length === 0) return tablesByExerciseId;
  const rows = database
    .select()
    .from(personalRecords)
    .where(inArray(personalRecords.exerciseId, exerciseIds))
    .all();
  for (const row of rows) {
    const table = tablesByExerciseId.get(row.exerciseId) ?? {};
    table[row.type] = row.value;
    tablesByExerciseId.set(row.exerciseId, table);
  }
  return tablesByExerciseId;
}

export interface RecordDetail {
  type: RecordType;
  value: number;
  achievedAt: number;
  workoutId: string | null;
}

export function getRecordDetails(exerciseId: string): RecordDetail[] {
  return database
    .select({
      type: personalRecords.type,
      value: personalRecords.value,
      achievedAt: personalRecords.achievedAt,
      workoutId: personalRecords.workoutId,
    })
    .from(personalRecords)
    .where(eq(personalRecords.exerciseId, exerciseId))
    .all();
}

/** Подходы, записанные в прошлый раз, когда делали это упражнение (последняя тренировка). */
export function getLastPerformance(
  exerciseId: string,
): { sets: SetRow[]; note: string; workoutId: string; at: number } | null {
  const lastWorkoutExercise = database
    .select({
      id: workoutExercises.id,
      note: workoutExercises.note,
      workoutId: workouts.id,
      at: workouts.startedAt,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(eq(workoutExercises.exerciseId, exerciseId))
    .orderBy(desc(workouts.startedAt))
    .limit(1)
    .get();
  if (!lastWorkoutExercise) return null;
  const completedSets = database
    .select()
    .from(sets)
    .where(and(eq(sets.workoutExerciseId, lastWorkoutExercise.id), eq(sets.completed, true)))
    .orderBy(asc(sets.position))
    .all();
  return {
    sets: completedSets,
    note: lastWorkoutExercise.note,
    workoutId: lastWorkoutExercise.workoutId,
    at: lastWorkoutExercise.at,
  };
}

export function getLastPerformances(exerciseIds: string[]): Map<string, { sets: SetValues[]; note: string }> {
  const performancesByExerciseId = new Map<string, { sets: SetValues[]; note: string }>();
  for (const exerciseId of exerciseIds) {
    const previousPerformance = getLastPerformance(exerciseId);
    if (!previousPerformance) continue;
    performancesByExerciseId.set(exerciseId, {
      note: previousPerformance.note,
      sets: previousPerformance.sets.map((set) => ({
        weightKg: set.weightKg,
        reps: set.reps,
        durationSec: set.durationSec,
        distanceM: set.distanceM,
        rpe: set.rpe,
      })),
    });
  }
  return performancesByExerciseId;
}

export interface ExerciseHistoryEntry {
  workoutId: string;
  workoutName: string;
  startedAt: number;
  note: string;
  sets: SetRow[];
}

export function getExerciseHistory(exerciseId: string, limit = 200): ExerciseHistoryEntry[] {
  const workoutExerciseRows = database
    .select({
      workoutExerciseId: workoutExercises.id,
      note: workoutExercises.note,
      workoutId: workouts.id,
      workoutName: workouts.name,
      startedAt: workouts.startedAt,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(eq(workoutExercises.exerciseId, exerciseId))
    .orderBy(desc(workouts.startedAt))
    .limit(limit)
    .all();
  if (workoutExerciseRows.length === 0) return [];
  const setRows = database
    .select()
    .from(sets)
    .where(
      inArray(
        sets.workoutExerciseId,
        workoutExerciseRows.map((workoutExercise) => workoutExercise.workoutExerciseId),
      ),
    )
    .orderBy(asc(sets.position))
    .all();
  const setsByWorkoutExerciseId = new Map<string, SetRow[]>();
  for (const set of setRows) {
    const list = setsByWorkoutExerciseId.get(set.workoutExerciseId) ?? [];
    list.push(set);
    setsByWorkoutExerciseId.set(set.workoutExerciseId, list);
  }
  return workoutExerciseRows.map((workoutExercise) => ({
    workoutId: workoutExercise.workoutId,
    workoutName: workoutExercise.workoutName,
    startedAt: workoutExercise.startedAt,
    note: workoutExercise.note,
    sets: setsByWorkoutExerciseId.get(workoutExercise.workoutExerciseId) ?? [],
  }));
}
