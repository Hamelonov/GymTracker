import Storage from 'expo-sqlite/kv-store';
import { database } from './client';
import { rebuildRecords } from './repo/workouts';
import { exercises } from './schema';
import { notifyDatabaseChanged } from './version';
import { SEED_EXERCISES, SEED_VERSION } from './seed/exercises';

const SEED_VERSION_KEY = 'seed_version';

/** Добавляет или обновляет встроенные упражнения. Поля пользователя не затрагиваются. */
export function seedExercises(): void {
  const currentSeedVersion = Number(Storage.getItemSync(SEED_VERSION_KEY) ?? '0');
  if (currentSeedVersion >= SEED_VERSION) return;
  const now = Date.now();
  const typeBeforeSeedById = new Map(
    database
      .select({ id: exercises.id, type: exercises.type })
      .from(exercises)
      .all()
      .map((row) => [row.id, row.type]),
  );
  database.transaction((transaction) => {
    for (const [
      id,
      nameEn,
      nameRu,
      muscleGroup,
      secondaryMuscles,
      equipment,
      type,
      descriptionEn,
      descriptionRu,
    ] of SEED_EXERCISES) {
      transaction
        .insert(exercises)
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
          set: {
            nameEn,
            nameRu,
            muscleGroup,
            secondaryMuscles,
            equipment,
            type,
            descriptionEn,
            descriptionRu,
          },
        })
        .run();
    }
  });
  // У встроенного упражнения, сменившего тип (например, отжимания на брусьях: с весом → только повторы),
  // рекорды пересчитываются, чтобы устаревшие рекорды веса/1RM исчезли.
  const changedExerciseIds = SEED_EXERCISES.filter(
    ([id, , , , , , type]) => typeBeforeSeedById.has(id) && typeBeforeSeedById.get(id) !== type,
  ).map(([id]) => id);
  if (changedExerciseIds.length > 0) {
    rebuildRecords(changedExerciseIds);
    notifyDatabaseChanged();
  }
  Storage.setItemSync(SEED_VERSION_KEY, String(SEED_VERSION));
}
