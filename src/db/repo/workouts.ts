import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { database } from '../client';
import {
  exercises,
  personalRecords,
  sets,
  workoutExercises,
  workouts,
  type ExerciseRow,
  type SetRow,
  type WorkoutExerciseRow,
  type WorkoutRow,
} from '../schema';
import { notifyDatabaseChanged } from '../version';
import { newId } from '@/domain/ids';
import { detectPersonalRecords, type RecordTable } from '@/domain/records';
import type { ActiveWorkout, MuscleGroup, RecordHit, RecordType } from '@/domain/types';
import { countWorkingSets, totalVolume } from '@/domain/volume';
import { getExercisesByIds, getRecordTables } from './exercises';
import { markRoutinePerformed } from './routines';

export interface SaveResult {
  workoutId: string;
  prs: { exerciseId: string; setIndex: number; hits: RecordHit[] }[];
  volumeKg: number;
  setCount: number;
  exerciseCount: number;
  durationSec: number;
}

/** Сохраняет завершённую тренировку и обновляет личные рекорды в одной транзакции. */
export function saveWorkout(
  workout: ActiveWorkout,
  finishedAt: number,
  options: { existingId?: string } = {},
): SaveResult {
  const exerciseIds = [...new Set(workout.exercises.map((exercise) => exercise.exerciseId))];
  const exercisesById = getExercisesByIds(exerciseIds);
  // При редактировании сохранённой тренировки рекорды пересобираются с нуля после транзакции.
  const recordTables = options.existingId ? new Map<string, RecordTable>() : getRecordTables(exerciseIds);
  const workoutId = options.existingId ?? workout.id;
  const prs: SaveResult['prs'] = [];
  let volumeKg = 0;
  let setCount = 0;
  const durationSec = Math.max(0, Math.round((finishedAt - workout.startedAt) / 1000));

  database.transaction((transaction) => {
    if (options.existingId) {
      transaction.delete(workoutExercises).where(eq(workoutExercises.workoutId, workoutId)).run();
      transaction.delete(personalRecords).where(eq(personalRecords.workoutId, workoutId)).run();
      transaction
        .update(workouts)
        .set({
          name: workout.name.trim(),
          startedAt: workout.startedAt,
          finishedAt,
          durationSec,
          notes: workout.notes,
        })
        .where(eq(workouts.id, workoutId))
        .run();
    } else {
      transaction
        .insert(workouts)
        .values({
          id: workoutId,
          name: workout.name.trim(),
          startedAt: workout.startedAt,
          finishedAt,
          durationSec,
          notes: workout.notes,
          routineId: workout.routineId,
          volumeKg: 0,
          setCount: 0,
          prCount: 0,
        })
        .run();
    }

    let position = 0;
    for (const workoutExercise of workout.exercises) {
      const completedSets = workoutExercise.sets.filter((set) => set.completed);
      if (completedSets.length === 0) continue;
      const exercise = exercisesById.get(workoutExercise.exerciseId);
      const workoutExerciseId = newId();
      transaction
        .insert(workoutExercises)
        .values({
          id: workoutExerciseId,
          workoutId,
          exerciseId: workoutExercise.exerciseId,
          position: position++,
          supersetGroup: workoutExercise.supersetGroup,
          note: workoutExercise.note,
          restSeconds: workoutExercise.restSeconds,
        })
        .run();
      const recordTable = recordTables.get(workoutExercise.exerciseId) ?? {};
      const hitsBySetIndex = exercise
        ? detectPersonalRecords(completedSets, exercise.type, recordTable)
        : new Map<number, RecordHit[]>();
      volumeKg += totalVolume(completedSets);
      setCount += countWorkingSets(completedSets);
      completedSets.forEach((set, setIndex) => {
        const setHits = hitsBySetIndex.get(setIndex) ?? [];
        const setId = newId();
        transaction
          .insert(sets)
          .values({
            id: setId,
            workoutExerciseId,
            position: setIndex,
            type: set.type,
            weightKg: set.weightKg,
            reps: set.reps,
            durationSec: set.durationSec,
            distanceM: set.distanceM,
            rpe: set.rpe,
            completed: true,
            completedAt: set.completedAt,
            prTypes: setHits.map((hit) => hit.type),
          })
          .run();
        if (setHits.length === 0) return;
        prs.push({ exerciseId: workoutExercise.exerciseId, setIndex, hits: setHits });
        for (const hit of setHits) {
          recordTable[hit.type] = hit.value;
          transaction
            .delete(personalRecords)
            .where(
              and(
                eq(personalRecords.exerciseId, workoutExercise.exerciseId),
                eq(personalRecords.type, hit.type),
              ),
            )
            .run();
          transaction
            .insert(personalRecords)
            .values({
              id: newId(),
              exerciseId: workoutExercise.exerciseId,
              type: hit.type,
              value: hit.value,
              setId,
              workoutId,
              achievedAt: set.completedAt ?? finishedAt,
            })
            .run();
        }
      });
      recordTables.set(workoutExercise.exerciseId, recordTable);
    }
    const prCount = prs.reduce((total, pr) => total + pr.hits.length, 0);
    transaction.update(workouts).set({ volumeKg, setCount, prCount }).where(eq(workouts.id, workoutId)).run();
    if (workout.routineId && !options.existingId) markRoutinePerformed(workout.routineId, finishedAt);
  });

  if (options.existingId) rebuildRecords(exerciseIds);
  notifyDatabaseChanged();
  const exerciseCount = workout.exercises.filter((exercise) =>
    exercise.sets.some((set) => set.completed),
  ).length;
  return { workoutId, prs, volumeKg, setCount, exerciseCount, durationSec };
}

interface BestRecord {
  value: number;
  setId: string;
  workoutId: string;
  achievedAt: number;
}

/** Пересчитывает личные рекорды для указанных упражнений с нуля (после правок/удалений). */
export function rebuildRecords(exerciseIds: string[]): void {
  if (exerciseIds.length === 0) return;
  const exercisesById = getExercisesByIds(exerciseIds);
  database.transaction((transaction) => {
    for (const exerciseId of exerciseIds) {
      const exercise = exercisesById.get(exerciseId);
      if (!exercise) continue;
      transaction.delete(personalRecords).where(eq(personalRecords.exerciseId, exerciseId)).run();
      const rows = transaction
        .select({
          set: sets,
          startedAt: workouts.startedAt,
          workoutId: workouts.id,
          workoutExerciseId: workoutExercises.id,
        })
        .from(sets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
        .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
        .where(eq(workoutExercises.exerciseId, exerciseId))
        .orderBy(asc(workouts.startedAt), asc(sets.position))
        .all();
      const recordTable: RecordTable = {};
      const bestByType: Partial<Record<RecordType, BestRecord>> = {};
      // Группируем по упражнению в тренировке, чтобы флаги рекордов по индексу подхода были согласованными.
      const rowsByWorkoutExerciseId = new Map<string, typeof rows>();
      for (const row of rows) {
        const group = rowsByWorkoutExerciseId.get(row.workoutExerciseId) ?? [];
        group.push(row);
        rowsByWorkoutExerciseId.set(row.workoutExerciseId, group);
      }
      for (const [, group] of rowsByWorkoutExerciseId) {
        const hitsBySetIndex = detectPersonalRecords(
          group.map((row) => row.set),
          exercise.type,
          recordTable,
        );
        group.forEach((row, setIndex) => {
          const setHits = hitsBySetIndex.get(setIndex) ?? [];
          transaction
            .update(sets)
            .set({ prTypes: setHits.map((hit) => hit.type) })
            .where(eq(sets.id, row.set.id))
            .run();
          for (const hit of setHits) {
            recordTable[hit.type] = hit.value;
            bestByType[hit.type] = {
              value: hit.value,
              setId: row.set.id,
              workoutId: row.workoutId,
              achievedAt: row.set.completedAt ?? row.startedAt,
            };
          }
        });
      }
      for (const [type, best] of Object.entries(bestByType) as [RecordType, BestRecord][]) {
        transaction
          .insert(personalRecords)
          .values({
            id: newId(),
            exerciseId,
            type,
            value: best.value,
            setId: best.setId,
            workoutId: best.workoutId,
            achievedAt: best.achievedAt,
          })
          .run();
      }
    }
  });
}

export interface WorkoutSummary extends WorkoutRow {
  exercises: {
    id: string;
    nameEn: string;
    nameRu: string;
    isCustom: boolean;
    setCount: number;
    bestSet: SetRow | null;
  }[];
}

export function listWorkouts(
  options: { limit?: number; offset?: number; from?: number; to?: number } = {},
): WorkoutSummary[] {
  const conditions = [];
  if (options.from != null) conditions.push(gte(workouts.startedAt, options.from));
  if (options.to != null) conditions.push(lt(workouts.startedAt, options.to));
  const baseQuery = database
    .select()
    .from(workouts)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(workouts.startedAt));
  const pagedQuery =
    options.limit != null ? baseQuery.limit(options.limit).offset(options.offset ?? 0) : baseQuery;
  return attachExercises(pagedQuery.all());
}

/** Грубая оценка «самого тяжёлого подхода»: главное вес, затем повторы, время и дистанция. */
function bestSetScore(set: SetRow): number {
  return (set.weightKg ?? 0) * 1000 + (set.reps ?? 0) + (set.durationSec ?? 0) + (set.distanceM ?? 0);
}

function attachExercises(workoutRows: WorkoutRow[]): WorkoutSummary[] {
  if (workoutRows.length === 0) return [];
  const workoutExerciseRows = database
    .select({
      workoutExerciseId: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      position: workoutExercises.position,
      id: exercises.id,
      nameEn: exercises.nameEn,
      nameRu: exercises.nameRu,
      isCustom: exercises.isCustom,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(
      inArray(
        workoutExercises.workoutId,
        workoutRows.map((workout) => workout.id),
      ),
    )
    .orderBy(asc(workoutExercises.position))
    .all();
  const setRows =
    workoutExerciseRows.length === 0
      ? []
      : database
          .select()
          .from(sets)
          .where(
            inArray(
              sets.workoutExerciseId,
              workoutExerciseRows.map((workoutExercise) => workoutExercise.workoutExerciseId),
            ),
          )
          .all();
  const setsByWorkoutExerciseId = new Map<string, SetRow[]>();
  for (const set of setRows) {
    const list = setsByWorkoutExerciseId.get(set.workoutExerciseId) ?? [];
    list.push(set);
    setsByWorkoutExerciseId.set(set.workoutExerciseId, list);
  }
  const exercisesByWorkoutId = new Map<string, WorkoutSummary['exercises']>();
  for (const workoutExercise of workoutExerciseRows) {
    const exercisesOfWorkout = exercisesByWorkoutId.get(workoutExercise.workoutId) ?? [];
    const exerciseSets = setsByWorkoutExerciseId.get(workoutExercise.workoutExerciseId) ?? [];
    let bestSet: SetRow | null = null;
    for (const set of exerciseSets) {
      if (set.type === 'warmup') continue;
      const bestScore = bestSet ? bestSetScore(bestSet) : -1;
      if (bestSetScore(set) > bestScore) bestSet = set;
    }
    exercisesOfWorkout.push({
      id: workoutExercise.id,
      nameEn: workoutExercise.nameEn,
      nameRu: workoutExercise.nameRu,
      isCustom: workoutExercise.isCustom,
      setCount: exerciseSets.filter((set) => set.type !== 'warmup').length,
      bestSet,
    });
    exercisesByWorkoutId.set(workoutExercise.workoutId, exercisesOfWorkout);
  }
  return workoutRows.map((workout) => ({
    ...workout,
    exercises: exercisesByWorkoutId.get(workout.id) ?? [],
  }));
}

export interface WorkoutDetail extends WorkoutRow {
  exercises: (WorkoutExerciseRow & { exercise: ExerciseRow; sets: SetRow[] })[];
}

export function getWorkout(id: string): WorkoutDetail | undefined {
  const workout = database.select().from(workouts).where(eq(workouts.id, id)).get();
  if (!workout) return undefined;
  const workoutExerciseRows = database
    .select({ workoutExercise: workoutExercises, exercise: exercises })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workoutExercises.workoutId, id))
    .orderBy(asc(workoutExercises.position))
    .all();
  const setRows =
    workoutExerciseRows.length === 0
      ? []
      : database
          .select()
          .from(sets)
          .where(
            inArray(
              sets.workoutExerciseId,
              workoutExerciseRows.map((row) => row.workoutExercise.id),
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
  return {
    ...workout,
    exercises: workoutExerciseRows.map((row) => ({
      ...row.workoutExercise,
      exercise: row.exercise,
      sets: setsByWorkoutExerciseId.get(row.workoutExercise.id) ?? [],
    })),
  };
}

export function deleteWorkout(id: string): void {
  const exerciseIds = database
    .select({ exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, id))
    .all()
    .map((row) => row.exerciseId);
  database.delete(workouts).where(eq(workouts.id, id)).run();
  rebuildRecords([...new Set(exerciseIds)]);
  notifyDatabaseChanged();
}

/** Превращает сохранённую тренировку обратно в редактируемую структуру активной тренировки. */
export function workoutToActiveWorkout(workout: WorkoutDetail): ActiveWorkout {
  return {
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt,
    routineId: workout.routineId,
    notes: workout.notes,
    exercises: workout.exercises.map((workoutExercise) => ({
      id: workoutExercise.id,
      exerciseId: workoutExercise.exerciseId,
      supersetGroup: workoutExercise.supersetGroup,
      note: workoutExercise.note,
      restSeconds: workoutExercise.restSeconds,
      sets: workoutExercise.sets.map((set) => ({
        id: set.id,
        type: set.type,
        weightKg: set.weightKg,
        reps: set.reps,
        durationSec: set.durationSec,
        distanceM: set.distanceM,
        rpe: set.rpe,
        completed: true,
        completedAt: set.completedAt,
        previous: null,
        prTypes: set.prTypes,
      })),
    })),
  };
}

/** Время начала каждой тренировки, новые первыми. Дешёвые входные данные для подсчёта серий. */
export function listWorkoutStartTimes(): number[] {
  return database
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .orderBy(desc(workouts.startedAt))
    .all()
    .map((row) => row.startedAt);
}

/** «YYYY-MM-DD» по местному времени. */
function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function countWorkoutsByDay(from: number, to: number): Map<string, number> {
  const rows = database
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .where(and(gte(workouts.startedAt, from), lt(workouts.startedAt, to)))
    .all();
  const workoutCountByDay = new Map<string, number>();
  for (const row of rows) {
    const dayKey = localDayKey(row.startedAt);
    workoutCountByDay.set(dayKey, (workoutCountByDay.get(dayKey) ?? 0) + 1);
  }
  return workoutCountByDay;
}

export interface Totals {
  workouts: number;
  volumeKg: number;
  durationSec: number;
  sets: number;
}

export function getWorkoutTotals(from?: number): Totals {
  const result = database
    .select({
      workouts: sql<number>`count(*)`,
      volumeKg: sql<number>`coalesce(sum(${workouts.volumeKg}), 0)`,
      durationSec: sql<number>`coalesce(sum(${workouts.durationSec}), 0)`,
      sets: sql<number>`coalesce(sum(${workouts.setCount}), 0)`,
    })
    .from(workouts)
    .where(from != null ? gte(workouts.startedAt, from) : undefined)
    .get();
  return result ?? { workouts: 0, volumeKg: 0, durationSec: 0, sets: 0 };
}

export interface WeeklyPoint {
  weekStart: number;
  workouts: number;
  volumeKg: number;
  durationSec: number;
  sets: number;
}

export function listWorkoutsSince(from: number): WorkoutRow[] {
  return database
    .select()
    .from(workouts)
    .where(gte(workouts.startedAt, from))
    .orderBy(asc(workouts.startedAt))
    .all();
}

export function muscleSplit(from: number): Map<MuscleGroup, number> {
  const rows = database
    .select({ muscle: exercises.muscleGroup, count: sql<number>`count(*)` })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(and(gte(workouts.startedAt, from), sql`${sets.type} != 'warmup'`))
    .groupBy(exercises.muscleGroup)
    .all();
  return new Map(rows.map((row) => [row.muscle, row.count]));
}

export function topExercises(
  from: number,
  limit = 5,
): { exerciseId: string; nameEn: string; nameRu: string; isCustom: boolean; count: number }[] {
  return database
    .select({
      exerciseId: exercises.id,
      nameEn: exercises.nameEn,
      nameRu: exercises.nameRu,
      isCustom: exercises.isCustom,
      count: sql<number>`count(*)`,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(gte(workouts.startedAt, from))
    .groupBy(exercises.id)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
    .all();
}

export function listTopOneRepMaxRecords(limit = 10) {
  return database
    .select({
      exerciseId: exercises.id,
      nameEn: exercises.nameEn,
      nameRu: exercises.nameRu,
      isCustom: exercises.isCustom,
      type: personalRecords.type,
      value: personalRecords.value,
      achievedAt: personalRecords.achievedAt,
    })
    .from(personalRecords)
    .innerJoin(exercises, eq(exercises.id, personalRecords.exerciseId))
    .where(eq(personalRecords.type, 'one_rm'))
    .orderBy(desc(personalRecords.value))
    .limit(limit)
    .all();
}
