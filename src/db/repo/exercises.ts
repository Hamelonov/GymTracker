import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { exercises, personalRecords, sets, workoutExercises, workouts, type ExerciseRow, type SetRow } from '../schema';
import { bumpDb } from '../version';
import { newId } from '@/domain/ids';
import type { Equipment, ExerciseType, MuscleGroup, PrType, SetValues } from '@/domain/types';
import type { RecordTable } from '@/domain/records';

export function exerciseName(e: Pick<ExerciseRow, 'nameEn' | 'nameRu' | 'isCustom'>, lang: string): string {
  if (e.isCustom) return e.nameEn;
  return lang.startsWith('ru') ? e.nameRu : e.nameEn;
}

export function exerciseDescription(
  e: Pick<ExerciseRow, 'description' | 'descriptionEn' | 'descriptionRu'>,
  lang: string,
): string {
  if (e.description && e.description.trim()) return e.description;
  return lang.startsWith('ru') ? e.descriptionRu : e.descriptionEn;
}

export function listExercises(opts: { includeArchived?: boolean } = {}): ExerciseRow[] {
  const q = db.select().from(exercises);
  const rows = opts.includeArchived ? q.all() : q.where(eq(exercises.archived, false)).all();
  return rows;
}

export function getExercise(id: string): ExerciseRow | undefined {
  return db.select().from(exercises).where(eq(exercises.id, id)).get();
}

export function getExercisesByIds(ids: string[]): Map<string, ExerciseRow> {
  if (ids.length === 0) return new Map();
  const rows = db.select().from(exercises).where(inArray(exercises.id, ids)).all();
  return new Map(rows.map((r) => [r.id, r]));
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
  db.insert(exercises).values(row).run();
  bumpDb();
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
  db.update(exercises).set(values).where(eq(exercises.id, id)).run();
  bumpDb();
}

export function setExerciseArchived(id: string, archived: boolean): void {
  db.update(exercises).set({ archived }).where(eq(exercises.id, id)).run();
  bumpDb();
}

export function deleteExercise(id: string): void {
  db.delete(exercises).where(eq(exercises.id, id)).run();
  bumpDb();
}

/** How many workouts included each exercise, for "recent" / "most used" sorting. */
export function exerciseUsage(): Map<string, { count: number; lastAt: number }> {
  const rows = db
    .select({
      exerciseId: workoutExercises.exerciseId,
      count: sql<number>`count(*)`,
      lastAt: sql<number>`max(${workouts.startedAt})`,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .groupBy(workoutExercises.exerciseId)
    .all();
  return new Map(rows.map((r) => [r.exerciseId, { count: r.count, lastAt: r.lastAt }]));
}

export function getRecordTable(exerciseId: string): RecordTable {
  const rows = db.select().from(personalRecords).where(eq(personalRecords.exerciseId, exerciseId)).all();
  const table: RecordTable = {};
  for (const r of rows) table[r.type] = r.value;
  return table;
}

export function getRecordTables(exerciseIds: string[]): Map<string, RecordTable> {
  const out = new Map<string, RecordTable>();
  if (exerciseIds.length === 0) return out;
  const rows = db.select().from(personalRecords).where(inArray(personalRecords.exerciseId, exerciseIds)).all();
  for (const r of rows) {
    const t = out.get(r.exerciseId) ?? {};
    t[r.type] = r.value;
    out.set(r.exerciseId, t);
  }
  return out;
}

export interface RecordDetail {
  type: PrType;
  value: number;
  achievedAt: number;
  workoutId: string | null;
}

export function getRecordDetails(exerciseId: string): RecordDetail[] {
  return db
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

/** The sets logged the last time this exercise was performed (most recent workout). */
export function lastPerformance(exerciseId: string): { sets: SetRow[]; note: string; workoutId: string; at: number } | null {
  const last = db
    .select({ id: workoutExercises.id, note: workoutExercises.note, workoutId: workouts.id, at: workouts.startedAt })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(eq(workoutExercises.exerciseId, exerciseId))
    .orderBy(desc(workouts.startedAt))
    .limit(1)
    .get();
  if (!last) return null;
  const rows = db
    .select()
    .from(sets)
    .where(and(eq(sets.workoutExerciseId, last.id), eq(sets.completed, true)))
    .orderBy(asc(sets.position))
    .all();
  return { sets: rows, note: last.note, workoutId: last.workoutId, at: last.at };
}

export function lastPerformances(exerciseIds: string[]): Map<string, { sets: SetValues[]; note: string }> {
  const out = new Map<string, { sets: SetValues[]; note: string }>();
  for (const id of exerciseIds) {
    const p = lastPerformance(id);
    if (p) {
      out.set(id, {
        note: p.note,
        sets: p.sets.map((s) => ({
          weightKg: s.weightKg,
          reps: s.reps,
          durationSec: s.durationSec,
          distanceM: s.distanceM,
          rpe: s.rpe,
        })),
      });
    }
  }
  return out;
}

export interface ExerciseHistoryEntry {
  workoutId: string;
  workoutName: string;
  startedAt: number;
  note: string;
  sets: SetRow[];
}

export function exerciseHistory(exerciseId: string, limit = 200): ExerciseHistoryEntry[] {
  const wes = db
    .select({
      weId: workoutExercises.id,
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
  if (wes.length === 0) return [];
  const setRows = db
    .select()
    .from(sets)
    .where(inArray(sets.workoutExerciseId, wes.map((w) => w.weId)))
    .orderBy(asc(sets.position))
    .all();
  const byWe = new Map<string, SetRow[]>();
  for (const s of setRows) {
    const list = byWe.get(s.workoutExerciseId) ?? [];
    list.push(s);
    byWe.set(s.workoutExerciseId, list);
  }
  return wes.map((w) => ({
    workoutId: w.workoutId,
    workoutName: w.workoutName,
    startedAt: w.startedAt,
    note: w.note,
    sets: byWe.get(w.weId) ?? [],
  }));
}
