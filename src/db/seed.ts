import Storage from 'expo-sqlite/kv-store';
import { db } from './client';
import { exercises } from './schema';
import { SEED_EXERCISES, SEED_VERSION } from './seed/exercises';

const KEY = 'seed_version';

/** Insert or refresh built-in exercises. User-owned fields are never touched. */
export function seedExercises(): void {
  const current = Number(Storage.getItemSync(KEY) ?? '0');
  if (current >= SEED_VERSION) return;
  const now = Date.now();
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
  Storage.setItemSync(KEY, String(SEED_VERSION));
}
