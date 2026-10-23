import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  routineExercises,
  routineFolders,
  routineSets,
  routines,
  type RoutineExerciseRow,
  type RoutineFolderRow,
  type RoutineRow,
  type RoutineSetRow,
} from '../schema';
import { bumpDb } from '../version';
import { newId } from '@/domain/ids';
import type { ActiveWorkout, SetType, SetValues } from '@/domain/types';

export interface RoutineSetInput extends SetValues {
  type: SetType;
}

export interface RoutineExerciseInput {
  exerciseId: string;
  supersetGroup: number | null;
  restSeconds: number | null;
  note: string;
  sets: RoutineSetInput[];
}

export interface RoutineInput {
  name: string;
  notes: string;
  folderId: string | null;
  exercises: RoutineExerciseInput[];
}

export interface RoutineDetail extends RoutineRow {
  exercises: (RoutineExerciseRow & { sets: RoutineSetRow[] })[];
}

export interface RoutineSummary extends RoutineRow {
  exerciseCount: number;
  exerciseIds: string[];
}

export function listFolders(): RoutineFolderRow[] {
  return db.select().from(routineFolders).orderBy(asc(routineFolders.position), asc(routineFolders.createdAt)).all();
}

export function createFolder(name: string): RoutineFolderRow {
  const max = db.select({ m: sql<number>`coalesce(max(${routineFolders.position}), -1)` }).from(routineFolders).get();
  const row: RoutineFolderRow = { id: newId(), name: name.trim(), position: (max?.m ?? -1) + 1, createdAt: Date.now() };
  db.insert(routineFolders).values(row).run();
  bumpDb();
  return row;
}

export function renameFolder(id: string, name: string): void {
  db.update(routineFolders).set({ name: name.trim() }).where(eq(routineFolders.id, id)).run();
  bumpDb();
}

export function deleteFolder(id: string): void {
  db.update(routines).set({ folderId: null }).where(eq(routines.folderId, id)).run();
  db.delete(routineFolders).where(eq(routineFolders.id, id)).run();
  bumpDb();
}

export function listRoutines(): RoutineSummary[] {
  const rows = db.select().from(routines).orderBy(asc(routines.position), desc(routines.updatedAt)).all();
  if (rows.length === 0) return [];
  const exRows = db
    .select({ routineId: routineExercises.routineId, exerciseId: routineExercises.exerciseId, position: routineExercises.position })
    .from(routineExercises)
    .where(inArray(routineExercises.routineId, rows.map((r) => r.id)))
    .orderBy(asc(routineExercises.position))
    .all();
  const byRoutine = new Map<string, string[]>();
  for (const e of exRows) {
    const list = byRoutine.get(e.routineId) ?? [];
    list.push(e.exerciseId);
    byRoutine.set(e.routineId, list);
  }
  return rows.map((r) => ({ ...r, exerciseIds: byRoutine.get(r.id) ?? [], exerciseCount: (byRoutine.get(r.id) ?? []).length }));
}

export function getRoutine(id: string): RoutineDetail | undefined {
  const row = db.select().from(routines).where(eq(routines.id, id)).get();
  if (!row) return undefined;
  const exs = db.select().from(routineExercises).where(eq(routineExercises.routineId, id)).orderBy(asc(routineExercises.position)).all();
  const setRows =
    exs.length === 0
      ? []
      : db
          .select()
          .from(routineSets)
          .where(inArray(routineSets.routineExerciseId, exs.map((e) => e.id)))
          .orderBy(asc(routineSets.position))
          .all();
  const bySet = new Map<string, RoutineSetRow[]>();
  for (const s of setRows) {
    const list = bySet.get(s.routineExerciseId) ?? [];
    list.push(s);
    bySet.set(s.routineExerciseId, list);
  }
  return { ...row, exercises: exs.map((e) => ({ ...e, sets: bySet.get(e.id) ?? [] })) };
}

function writeRoutineExercises(routineId: string, input: RoutineExerciseInput[]) {
  input.forEach((ex, i) => {
    const reId = newId();
    db.insert(routineExercises)
      .values({
        id: reId,
        routineId,
        exerciseId: ex.exerciseId,
        position: i,
        supersetGroup: ex.supersetGroup,
        restSeconds: ex.restSeconds,
        note: ex.note,
      })
      .run();
    ex.sets.forEach((s, j) => {
      db.insert(routineSets)
        .values({
          id: newId(),
          routineExerciseId: reId,
          position: j,
          type: s.type,
          weightKg: s.weightKg,
          reps: s.reps,
          durationSec: s.durationSec,
          distanceM: s.distanceM,
          rpe: s.rpe,
        })
        .run();
    });
  });
}

export function createRoutine(input: RoutineInput): string {
  const id = newId();
  const now = Date.now();
  db.transaction((tx) => {
    const max = tx.select({ m: sql<number>`coalesce(max(${routines.position}), -1)` }).from(routines).get();
    tx.insert(routines)
      .values({
        id,
        name: input.name.trim(),
        notes: input.notes,
        folderId: input.folderId,
        position: (max?.m ?? -1) + 1,
        createdAt: now,
        updatedAt: now,
        lastPerformedAt: null,
      })
      .run();
    writeRoutineExercises(id, input.exercises);
  });
  bumpDb();
  return id;
}

export function updateRoutine(id: string, input: RoutineInput): void {
  db.transaction((tx) => {
    tx.update(routines)
      .set({ name: input.name.trim(), notes: input.notes, folderId: input.folderId, updatedAt: Date.now() })
      .where(eq(routines.id, id))
      .run();
    tx.delete(routineExercises).where(eq(routineExercises.routineId, id)).run();
    writeRoutineExercises(id, input.exercises);
  });
  bumpDb();
}

export function moveRoutineToFolder(id: string, folderId: string | null): void {
  db.update(routines).set({ folderId, updatedAt: Date.now() }).where(eq(routines.id, id)).run();
  bumpDb();
}

export function deleteRoutine(id: string): void {
  db.delete(routines).where(eq(routines.id, id)).run();
  bumpDb();
}

export function duplicateRoutine(id: string, newName: string): string | undefined {
  const r = getRoutine(id);
  if (!r) return undefined;
  return createRoutine({
    name: newName,
    notes: r.notes,
    folderId: r.folderId,
    exercises: r.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      supersetGroup: e.supersetGroup,
      restSeconds: e.restSeconds,
      note: e.note,
      sets: e.sets.map((s) => ({
        type: s.type,
        weightKg: s.weightKg,
        reps: s.reps,
        durationSec: s.durationSec,
        distanceM: s.distanceM,
        rpe: s.rpe,
      })),
    })),
  });
}

export function markRoutinePerformed(id: string, at: number): void {
  db.update(routines).set({ lastPerformedAt: at }).where(eq(routines.id, id)).run();
}

/** Build routine input from a workout (for "save as routine" / "update routine"). */
export function routineInputFromWorkout(w: ActiveWorkout, base?: Pick<RoutineInput, 'name' | 'notes' | 'folderId'>): RoutineInput {
  return {
    name: base?.name ?? w.name,
    notes: base?.notes ?? '',
    folderId: base?.folderId ?? null,
    exercises: w.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      supersetGroup: e.supersetGroup,
      restSeconds: e.restSeconds,
      note: '',
      sets: e.sets
        .filter((s) => s.completed)
        .map((s) => ({
          type: s.type,
          weightKg: s.weightKg,
          reps: s.reps,
          durationSec: s.durationSec,
          distanceM: s.distanceM,
          rpe: s.rpe,
        })),
    })),
  };
}
