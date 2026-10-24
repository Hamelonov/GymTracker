import Storage from 'expo-sqlite/kv-store';
import { db } from './client';
import { rebuildRecords } from './repo/workouts';
import { exercises } from './schema';
import { bumpDb } from './version';
import { SEED_EXERCISES, SEED_VERSION } from './seed/exercises';

const KEY = 'seed_version';

/** Insert or refresh built-in exercises. User-owned fields are never touched. */
export function seedExercises(): void {
  const current = Number(Storage.getItemSync(KEY) ?? '0');
  if (current >= SEED_VERSION) return;
  const now = Date.now();
  const before = new Map(db.select({ id: exercises.id, type: exercises.type }).from(exercises).all().map((r) => [r.id, r.type]));
  db.transaction((tx) => {
    for (const [id, nameEn, nameRu, muscleGroup, secondaryMuscles, equipment, type, descriptionEn, descriptionRu] of SEED_EXERCISES) {
      tx.insert(exercises)
        .values({
          id,
          nameEn,
          nameRu,
          muscleGroup,
          secondaryMuscles,
          equipment,
          type,
          descriptionEn,
          descriptionRu,
          description: null,
          isCustom: false,
          restSeconds: null,
          archived: false,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: exercises.id,
          set: { nameEn, nameRu, muscleGroup, secondaryMuscles, equipment, type, descriptionEn, descriptionRu },
        })
        .run();
    }
  });
  // A built-in exercise that changed type (e.g. dips: weighted → reps only)
  // gets its records recomputed so stale weight/1RM records disappear.
  const changed = SEED_EXERCISES.filter(([id, , , , , , type]) => before.has(id) && before.get(id) !== type).map(([id]) => id);
  if (changed.length > 0) {
    rebuildRecords(changed);
    bumpDb();
  }
  Storage.setItemSync(KEY, String(SEED_VERSION));
}
