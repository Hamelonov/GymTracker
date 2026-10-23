import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../client';
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
import { bumpDb } from '../version';
import { newId } from '@/domain/ids';
import { detectPrs, type RecordTable } from '@/domain/records';
import type { ActiveWorkout, MuscleGroup, PrHit, PrType } from '@/domain/types';
import { countWorkingSets, totalVolume } from '@/domain/volume';
import { getExercisesByIds, getRecordTables } from './exercises';
import { markRoutinePerformed } from './routines';

export interface SaveResult {
  workoutId: string;
  prs: { exerciseId: string; setIndex: number; hits: PrHit[] }[];
  volumeKg: number;
  setCount: number;
  durationSec: number;
}

/** Persist a finished workout and update personal records inside one transaction. */
export function saveWorkout(w: ActiveWorkout, finishedAt: number, opts: { existingId?: string } = {}): SaveResult {
  const exerciseIds = [...new Set(w.exercises.map((e) => e.exerciseId))];
  const exMap = getExercisesByIds(exerciseIds);
  const records = opts.existingId ? new Map<string, RecordTable>() : getRecordTables(exerciseIds);
  const workoutId = opts.existingId ?? w.id;
  const prs: SaveResult['prs'] = [];
  let volumeKg = 0;
  let setCount = 0;
  const durationSec = Math.max(0, Math.round((finishedAt - w.startedAt) / 1000));

  db.transaction((tx) => {
    if (opts.existingId) {
      tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, workoutId)).run();
      tx.delete(personalRecords).where(eq(personalRecords.workoutId, workoutId)).run();
      tx.update(workouts)
        .set({ name: w.name.trim(), startedAt: w.startedAt, finishedAt, durationSec, notes: w.notes })
        .where(eq(workouts.id, workoutId))
        .run();
    } else {
      tx.insert(workouts)
        .values({
          id: workoutId,
          name: w.name.trim(),
          startedAt: w.startedAt,
          finishedAt,
          durationSec,
          notes: w.notes,
          routineId: w.routineId,
          volumeKg: 0,
          setCount: 0,
          prCount: 0,
        })
        .run();
    }

    let position = 0;
    for (const ex of w.exercises) {
      const completed = ex.sets.filter((s) => s.completed);
      if (completed.length === 0) continue;
      const exRow = exMap.get(ex.exerciseId);
      const weId = newId();
      tx.insert(workoutExercises)
        .values({
          id: weId,
          workoutId,
          exerciseId: ex.exerciseId,
          position: position++,
          supersetGroup: ex.supersetGroup,
          note: ex.note,
          restSeconds: ex.restSeconds,
        })
        .run();
      const table = records.get(ex.exerciseId) ?? {};
      const hits = exRow ? detectPrs(completed, exRow.type, table) : new Map<number, PrHit[]>();
      volumeKg += totalVolume(completed);
      setCount += countWorkingSets(completed);
      completed.forEach((s, i) => {
        const setHits = hits.get(i) ?? [];
        const setId = newId();
        tx.insert(sets)
          .values({
            id: setId,
            workoutExerciseId: weId,
            position: i,
            type: s.type,
            weightKg: s.weightKg,
            reps: s.reps,
            durationSec: s.durationSec,
            distanceM: s.distanceM,
            rpe: s.rpe,
            completed: true,
            completedAt: s.completedAt,
            prTypes: setHits.map((h) => h.type),
          })
          .run();
        if (setHits.length > 0) {
          prs.push({ exerciseId: ex.exerciseId, setIndex: i, hits: setHits });
          for (const h of setHits) {
            table[h.type] = h.value;
            tx.delete(personalRecords)
              .where(and(eq(personalRecords.exerciseId, ex.exerciseId), eq(personalRecords.type, h.type)))
              .run();
            tx.insert(personalRecords)
              .values({
                id: newId(),
                exerciseId: ex.exerciseId,
                type: h.type,
                value: h.value,
                setId,
                workoutId,
                achievedAt: s.completedAt ?? finishedAt,
              })
              .run();
          }
        }
      });
      records.set(ex.exerciseId, table);
    }
    tx.update(workouts)
      .set({ volumeKg, setCount, prCount: prs.reduce((a, p) => a + p.hits.length, 0) })
      .where(eq(workouts.id, workoutId))
      .run();
    if (w.routineId && !opts.existingId) markRoutinePerformed(w.routineId, finishedAt);
  });

  if (opts.existingId) rebuildRecords(exerciseIds);
  bumpDb();
  return { workoutId, prs, volumeKg, setCount, durationSec };
}

/** Recompute personal records for the given exercises from scratch (after edits/deletes). */
export function rebuildRecords(exerciseIds: string[]): void {
  if (exerciseIds.length === 0) return;
  const exMap = getExercisesByIds(exerciseIds);
  db.transaction((tx) => {
    for (const exerciseId of exerciseIds) {
      const exRow = exMap.get(exerciseId);
      if (!exRow) continue;
      tx.delete(personalRecords).where(eq(personalRecords.exerciseId, exerciseId)).run();
      const rows = tx
        .select({ set: sets, startedAt: workouts.startedAt, workoutId: workouts.id, weId: workoutExercises.id })
        .from(sets)
        .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
        .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
        .where(eq(workoutExercises.exerciseId, exerciseId))
        .orderBy(asc(workouts.startedAt), asc(sets.position))
        .all();
      const table: RecordTable = {};
      const best: Partial<Record<PrType, { value: number; setId: string; workoutId: string; at: number }>> = {};
      // Group by workout exercise so set-index PR flags stay consistent.
      const groups = new Map<string, typeof rows>();
      for (const r of rows) {
        const g = groups.get(r.weId) ?? [];
        g.push(r);
        groups.set(r.weId, g);
      }
      for (const [, g] of groups) {
        const hits = detectPrs(
          g.map((r) => r.set),
          exRow.type,
          table,
        );
        g.forEach((r, i) => {
          const h = hits.get(i) ?? [];
          tx.update(sets)
            .set({ prTypes: h.map((x) => x.type) })
            .where(eq(sets.id, r.set.id))
            .run();
          for (const hit of h) {
            table[hit.type] = hit.value;
            best[hit.type] = { value: hit.value, setId: r.set.id, workoutId: r.workoutId, at: r.set.completedAt ?? r.startedAt };
          }
        });
      }
      for (const [type, b] of Object.entries(best) as [PrType, NonNullable<(typeof best)[PrType]>][]) {
        tx.insert(personalRecords)
          .values({ id: newId(), exerciseId, type, value: b.value, setId: b.setId, workoutId: b.workoutId, achievedAt: b.at })
          .run();
      }
    }
  });
}

export interface WorkoutSummary extends WorkoutRow {
  exerciseNames: { id: string; nameEn: string; nameRu: string; isCustom: boolean; setCount: number; bestSet: SetRow | null }[];
}

export function listWorkouts(opts: { limit?: number; offset?: number; from?: number; to?: number } = {}): WorkoutSummary[] {
  const conds = [];
  if (opts.from != null) conds.push(gte(workouts.startedAt, opts.from));
  if (opts.to != null) conds.push(lt(workouts.startedAt, opts.to));
  const base = db.select().from(workouts).where(conds.length ? and(...conds) : undefined).orderBy(desc(workouts.startedAt));
  const rows = (opts.limit != null ? base.limit(opts.limit).offset(opts.offset ?? 0) : base).all();
  return attachExercises(rows);
}

function attachExercises(rows: WorkoutRow[]): WorkoutSummary[] {
  if (rows.length === 0) return [];
  const wes = db
    .select({
      weId: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      position: workoutExercises.position,
      id: exercises.id,
      nameEn: exercises.nameEn,
      nameRu: exercises.nameRu,
      isCustom: exercises.isCustom,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(inArray(workoutExercises.workoutId, rows.map((r) => r.id)))
    .orderBy(asc(workoutExercises.position))
    .all();
  const setRows =
    wes.length === 0
      ? []
      : db
          .select()
          .from(sets)
          .where(inArray(sets.workoutExerciseId, wes.map((w) => w.weId)))
          .all();
  const setsByWe = new Map<string, SetRow[]>();
  for (const s of setRows) {
    const l = setsByWe.get(s.workoutExerciseId) ?? [];
    l.push(s);
    setsByWe.set(s.workoutExerciseId, l);
  }
  const byWorkout = new Map<string, WorkoutSummary['exerciseNames']>();
  for (const we of wes) {
    const l = byWorkout.get(we.workoutId) ?? [];
    const ss = setsByWe.get(we.weId) ?? [];
    let best: SetRow | null = null;
    for (const s of ss) {
      if (s.type === 'warmup') continue;
      const score = (s.weightKg ?? 0) * 1000 + (s.reps ?? 0) + (s.durationSec ?? 0) + (s.distanceM ?? 0);
      const bestScore = best ? (best.weightKg ?? 0) * 1000 + (best.reps ?? 0) + (best.durationSec ?? 0) + (best.distanceM ?? 0) : -1;
      if (score > bestScore) best = s;
    }
    l.push({ id: we.id, nameEn: we.nameEn, nameRu: we.nameRu, isCustom: we.isCustom, setCount: ss.filter((s) => s.type !== 'warmup').length, bestSet: best });
    byWorkout.set(we.workoutId, l);
  }
  return rows.map((r) => ({ ...r, exerciseNames: byWorkout.get(r.id) ?? [] }));
}

export interface WorkoutDetail extends WorkoutRow {
  exercises: (WorkoutExerciseRow & { exercise: ExerciseRow; sets: SetRow[] })[];
}

export function getWorkout(id: string): WorkoutDetail | undefined {
  const row = db.select().from(workouts).where(eq(workouts.id, id)).get();
  if (!row) return undefined;
  const wes = db
    .select({ we: workoutExercises, exercise: exercises })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workoutExercises.workoutId, id))
    .orderBy(asc(workoutExercises.position))
    .all();
  const setRows =
    wes.length === 0
      ? []
      : db
          .select()
          .from(sets)
          .where(inArray(sets.workoutExerciseId, wes.map((w) => w.we.id)))
          .orderBy(asc(sets.position))
          .all();
  const bySet = new Map<string, SetRow[]>();
  for (const s of setRows) {
    const l = bySet.get(s.workoutExerciseId) ?? [];
    l.push(s);
    bySet.set(s.workoutExerciseId, l);
  }
  return { ...row, exercises: wes.map((w) => ({ ...w.we, exercise: w.exercise, sets: bySet.get(w.we.id) ?? [] })) };
}

export function deleteWorkout(id: string): void {
  const exIds = db
    .select({ exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, id))
    .all()
    .map((r) => r.exerciseId);
  db.delete(workouts).where(eq(workouts.id, id)).run();
  rebuildRecords([...new Set(exIds)]);
  bumpDb();
}

/** Convert a saved workout back into an editable active-workout structure. */
export function workoutToActive(w: WorkoutDetail): ActiveWorkout {
  return {
    id: w.id,
    name: w.name,
    startedAt: w.startedAt,
    routineId: w.routineId,
    notes: w.notes,
    exercises: w.exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      supersetGroup: e.supersetGroup,
      note: e.note,
      restSeconds: e.restSeconds,
      sets: e.sets.map((s) => ({
        id: s.id,
        type: s.type,
        weightKg: s.weightKg,
        reps: s.reps,
        durationSec: s.durationSec,
        distanceM: s.distanceM,
        rpe: s.rpe,
        completed: true,
        completedAt: s.completedAt,
        previous: null,
        prTypes: s.prTypes,
      })),
    })),
  };
}

export function workoutDays(from: number, to: number): Map<string, number> {
  const rows = db
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .where(and(gte(workouts.startedAt, from), lt(workouts.startedAt, to)))
    .all();
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export interface Totals {
  workouts: number;
  volumeKg: number;
  durationSec: number;
  sets: number;
}

export function totals(from?: number): Totals {
  const r = db
    .select({
      workouts: sql<number>`count(*)`,
      volumeKg: sql<number>`coalesce(sum(${workouts.volumeKg}), 0)`,
      durationSec: sql<number>`coalesce(sum(${workouts.durationSec}), 0)`,
      sets: sql<number>`coalesce(sum(${workouts.setCount}), 0)`,
    })
    .from(workouts)
    .where(from != null ? gte(workouts.startedAt, from) : undefined)
    .get();
  return r ?? { workouts: 0, volumeKg: 0, durationSec: 0, sets: 0 };
}

export interface WeeklyPoint {
  weekStart: number;
  workouts: number;
  volumeKg: number;
  durationSec: number;
  sets: number;
}

export function weeklySeries(from: number): WorkoutRow[] {
  return db.select().from(workouts).where(gte(workouts.startedAt, from)).orderBy(asc(workouts.startedAt)).all();
}

export function muscleSplit(from: number): Map<MuscleGroup, number> {
  const rows = db
    .select({ muscle: exercises.muscleGroup, count: sql<number>`count(*)` })
    .from(sets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, sets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(and(gte(workouts.startedAt, from), sql`${sets.type} != 'warmup'`))
    .groupBy(exercises.muscleGroup)
    .all();
  return new Map(rows.map((r) => [r.muscle, r.count]));
}

export function topExercises(from: number, limit = 5): { exerciseId: string; nameEn: string; nameRu: string; isCustom: boolean; count: number }[] {
  return db
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

export function allRecordsRanked(limit = 10) {
  return db
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
