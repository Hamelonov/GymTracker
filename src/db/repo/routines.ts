import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { database } from '../client';
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
import { notifyDatabaseChanged } from '../version';
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
  return database
    .select()
    .from(routineFolders)
    .orderBy(asc(routineFolders.position), asc(routineFolders.createdAt))
    .all();
}

export function createFolder(name: string): RoutineFolderRow {
  const result = database
    .select({ maxPosition: sql<number>`coalesce(max(${routineFolders.position}), -1)` })
    .from(routineFolders)
    .get();
  const row: RoutineFolderRow = {
    id: newId(),
    name: name.trim(),
    position: (result?.maxPosition ?? -1) + 1,
    createdAt: Date.now(),
  };
  database.insert(routineFolders).values(row).run();
  notifyDatabaseChanged();
  return row;
}

export function renameFolder(id: string, name: string): void {
  database.update(routineFolders).set({ name: name.trim() }).where(eq(routineFolders.id, id)).run();
  notifyDatabaseChanged();
}

export function deleteFolder(id: string): void {
  database.update(routines).set({ folderId: null }).where(eq(routines.folderId, id)).run();
  database.delete(routineFolders).where(eq(routineFolders.id, id)).run();
  notifyDatabaseChanged();
}

export function listRoutines(): RoutineSummary[] {
  const routineRows = database
    .select()
    .from(routines)
    .orderBy(asc(routines.position), desc(routines.updatedAt))
    .all();
  if (routineRows.length === 0) return [];
  const routineExerciseRows = database
    .select({
      routineId: routineExercises.routineId,
      exerciseId: routineExercises.exerciseId,
      position: routineExercises.position,
    })
    .from(routineExercises)
    .where(
      inArray(
        routineExercises.routineId,
        routineRows.map((routine) => routine.id),
      ),
    )
    .orderBy(asc(routineExercises.position))
    .all();
  const exerciseIdsByRoutineId = new Map<string, string[]>();
  for (const routineExercise of routineExerciseRows) {
    const list = exerciseIdsByRoutineId.get(routineExercise.routineId) ?? [];
    list.push(routineExercise.exerciseId);
    exerciseIdsByRoutineId.set(routineExercise.routineId, list);
  }
  return routineRows.map((routine) => ({
    ...routine,
    exerciseIds: exerciseIdsByRoutineId.get(routine.id) ?? [],
    exerciseCount: (exerciseIdsByRoutineId.get(routine.id) ?? []).length,
  }));
}

export function getRoutine(id: string): RoutineDetail | undefined {
  const routine = database.select().from(routines).where(eq(routines.id, id)).get();
  if (!routine) return undefined;
  const routineExerciseRows = database
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.routineId, id))
    .orderBy(asc(routineExercises.position))
    .all();
  const setRows =
    routineExerciseRows.length === 0
      ? []
      : database
          .select()
          .from(routineSets)
          .where(
            inArray(
              routineSets.routineExerciseId,
              routineExerciseRows.map((routineExercise) => routineExercise.id),
            ),
          )
          .orderBy(asc(routineSets.position))
          .all();
  const setsByRoutineExerciseId = new Map<string, RoutineSetRow[]>();
  for (const set of setRows) {
    const list = setsByRoutineExerciseId.get(set.routineExerciseId) ?? [];
    list.push(set);
    setsByRoutineExerciseId.set(set.routineExerciseId, list);
  }
  return {
    ...routine,
    exercises: routineExerciseRows.map((routineExercise) => ({
      ...routineExercise,
      sets: setsByRoutineExerciseId.get(routineExercise.id) ?? [],
    })),
  };
}

function writeRoutineExercises(routineId: string, input: RoutineExerciseInput[]) {
  input.forEach((exercise, exerciseIndex) => {
    const routineExerciseId = newId();
    database
      .insert(routineExercises)
      .values({
        id: routineExerciseId,
        routineId,
        exerciseId: exercise.exerciseId,
        position: exerciseIndex,
        supersetGroup: exercise.supersetGroup,
        restSeconds: exercise.restSeconds,
        note: exercise.note,
      })
      .run();
    exercise.sets.forEach((set, setIndex) => {
      database
        .insert(routineSets)
        .values({
          id: newId(),
          routineExerciseId,
          position: setIndex,
          type: set.type,
          weightKg: set.weightKg,
          reps: set.reps,
          durationSec: set.durationSec,
          distanceM: set.distanceM,
          rpe: set.rpe,
        })
        .run();
    });
  });
}

export function createRoutine(input: RoutineInput): string {
  const id = newId();
  const now = Date.now();
  database.transaction((transaction) => {
    const result = transaction
      .select({ maxPosition: sql<number>`coalesce(max(${routines.position}), -1)` })
      .from(routines)
      .get();
    transaction
      .insert(routines)
      .values({
        id,
        name: input.name.trim(),
        notes: input.notes,
        folderId: input.folderId,
        position: (result?.maxPosition ?? -1) + 1,
        createdAt: now,
        updatedAt: now,
        lastPerformedAt: null,
      })
      .run();
    writeRoutineExercises(id, input.exercises);
  });
  notifyDatabaseChanged();
  return id;
}

export function updateRoutine(id: string, input: RoutineInput): void {
  database.transaction((transaction) => {
    transaction
      .update(routines)
      .set({ name: input.name.trim(), notes: input.notes, folderId: input.folderId, updatedAt: Date.now() })
      .where(eq(routines.id, id))
      .run();
    transaction.delete(routineExercises).where(eq(routineExercises.routineId, id)).run();
    writeRoutineExercises(id, input.exercises);
  });
  notifyDatabaseChanged();
}

export function moveRoutineToFolder(id: string, folderId: string | null): void {
  database.update(routines).set({ folderId, updatedAt: Date.now() }).where(eq(routines.id, id)).run();
  notifyDatabaseChanged();
}

export function deleteRoutine(id: string): void {
  database.delete(routines).where(eq(routines.id, id)).run();
  notifyDatabaseChanged();
}

export function duplicateRoutine(id: string, newName: string): string | undefined {
  const routine = getRoutine(id);
  if (!routine) return undefined;
  return createRoutine({
    name: newName,
    notes: routine.notes,
    folderId: routine.folderId,
    exercises: routine.exercises.map((routineExercise) => ({
      exerciseId: routineExercise.exerciseId,
      supersetGroup: routineExercise.supersetGroup,
      restSeconds: routineExercise.restSeconds,
      note: routineExercise.note,
      sets: routineExercise.sets.map((set) => ({
        type: set.type,
        weightKg: set.weightKg,
        reps: set.reps,
        durationSec: set.durationSec,
        distanceM: set.distanceM,
        rpe: set.rpe,
        rir: null,
      })),
    })),
  });
}

export function markRoutinePerformed(id: string, performedAt: number): void {
  database.update(routines).set({ lastPerformedAt: performedAt }).where(eq(routines.id, id)).run();
}

/** Собирает данные программы из тренировки (для «сохранить как программу» / «обновить программу»). */
export function routineInputFromWorkout(
  workout: ActiveWorkout,
  base?: Pick<RoutineInput, 'name' | 'notes' | 'folderId'>,
): RoutineInput {
  return {
    name: base?.name ?? workout.name,
    notes: base?.notes ?? '',
    folderId: base?.folderId ?? null,
    exercises: workout.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      supersetGroup: exercise.supersetGroup,
      restSeconds: exercise.restSeconds,
      note: '',
      sets: exercise.sets
        .filter((set) => set.completed)
        .map((set) => ({
          type: set.type,
          weightKg: set.weightKg,
          reps: set.reps,
          durationSec: set.durationSec,
          distanceM: set.distanceM,
          rpe: set.rpe,
          rir: null,
        })),
    })),
  };
}
