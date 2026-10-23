import { db, sqlite } from '../client';
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
import { bumpDb } from '../version';
import { formatDuration, kgToUnit } from '@/domain/units';
import type { WeightUnit } from '@/domain/types';

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
    exercises: db.select().from(exercises).all(),
    routineFolders: db.select().from(routineFolders).all(),
    routines: db.select().from(routines).all(),
    routineExercises: db.select().from(routineExercises).all(),
    routineSets: db.select().from(routineSets).all(),
    workouts: db.select().from(workouts).all(),
    workoutExercises: db.select().from(workoutExercises).all(),
    sets: db.select().from(sets).all(),
    measurements: db.select().from(measurements).all(),
    personalRecords: db.select().from(personalRecords).all(),
  };
}

export function isBackup(value: unknown): value is Backup {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.app === 'gymtracker' && typeof v.version === 'number' && Array.isArray(v.workouts) && Array.isArray(v.exercises);
}

function chunk<T>(arr: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Replace all data with the backup contents. Runs in a single transaction. */
export function restoreBackup(b: Backup): void {
  db.transaction((tx) => {
    tx.delete(personalRecords).run();
    tx.delete(sets).run();
    tx.delete(workoutExercises).run();
    tx.delete(workouts).run();
    tx.delete(routineSets).run();
    tx.delete(routineExercises).run();
    tx.delete(routines).run();
    tx.delete(routineFolders).run();
    tx.delete(measurements).run();
    tx.delete(exercises).run();
    for (const c of chunk(b.exercises)) tx.insert(exercises).values(c).run();
    for (const c of chunk(b.routineFolders ?? [])) tx.insert(routineFolders).values(c).run();
    for (const c of chunk(b.routines ?? [])) tx.insert(routines).values(c).run();
    for (const c of chunk(b.routineExercises ?? [])) tx.insert(routineExercises).values(c).run();
    for (const c of chunk(b.routineSets ?? [])) tx.insert(routineSets).values(c).run();
    for (const c of chunk(b.workouts ?? [])) tx.insert(workouts).values(c).run();
    for (const c of chunk(b.workoutExercises ?? [])) tx.insert(workoutExercises).values(c).run();
    for (const c of chunk(b.sets ?? [])) tx.insert(sets).values(c).run();
    for (const c of chunk(b.measurements ?? [])) tx.insert(measurements).values(c).run();
    for (const c of chunk(b.personalRecords ?? [])) tx.insert(personalRecords).values(c).run();
  });
  bumpDb();
}

export function deleteAllUserData(): void {
  db.transaction((tx) => {
    tx.delete(personalRecords).run();
    tx.delete(sets).run();
    tx.delete(workoutExercises).run();
    tx.delete(workouts).run();
    tx.delete(routineSets).run();
    tx.delete(routineExercises).run();
    tx.delete(routines).run();
    tx.delete(routineFolders).run();
    tx.delete(measurements).run();
  });
  sqlite.execSync('VACUUM;');
  bumpDb();
}

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flat CSV: one row per set. */
export function workoutsCsv(unit: WeightUnit, lang: string): string {
  const b = createBackup();
  const exById = new Map(b.exercises.map((e) => [e.id, e]));
  const wById = new Map(b.workouts.map((w) => [w.id, w]));
  const weById = new Map(b.workoutExercises.map((w) => [w.id, w]));
  const header = ['date', 'workout', 'duration', 'exercise', 'set', 'type', `weight_${unit}`, 'reps', 'duration_sec', 'distance_m', 'rpe', 'note'];
  const lines = [header.join(',')];
  const sorted = [...b.sets].sort((a, c) => {
    const wa = wById.get(weById.get(a.workoutExerciseId)?.workoutId ?? '')?.startedAt ?? 0;
    const wc = wById.get(weById.get(c.workoutExerciseId)?.workoutId ?? '')?.startedAt ?? 0;
    return wa - wc || a.position - c.position;
  });
  for (const s of sorted) {
    const we = weById.get(s.workoutExerciseId);
    if (!we) continue;
    const w = wById.get(we.workoutId);
    const ex = exById.get(we.exerciseId);
    if (!w || !ex) continue;
    const name = ex.isCustom ? ex.nameEn : lang.startsWith('ru') ? ex.nameRu : ex.nameEn;
    lines.push(
      [
        new Date(w.startedAt).toISOString(),
        csvCell(w.name),
        formatDuration(w.durationSec),
        csvCell(name),
        s.position + 1,
        s.type,
        s.weightKg != null ? Math.round(kgToUnit(s.weightKg, unit) * 100) / 100 : '',
        s.reps ?? '',
        s.durationSec ?? '',
        s.distanceM ?? '',
        s.rpe ?? '',
        csvCell(we.note),
      ].join(','),
    );
  }
  return lines.join('\n');
}
