import { createExercise } from '@/db/repo/exercises';
import { nameToStems } from '@/domain/quickEntry/normalizeName';
import type { ResolvedLine } from '@/domain/quickEntry/resolveLine';
import type { ParsedSet } from '@/domain/quickEntry/types';
import type { QuickEntryCommit } from '@/store/activeWorkoutQuickEntry';

function toCommitSets(sets: ParsedSet[]): QuickEntryCommit['sets'] {
  // Знак веса нужен был только для вывода типа нового упражнения; в карточке вес всегда положительный.
  return sets.map((set) => ({
    type: set.type,
    weightKg: set.weightKg,
    reps: set.reps,
    durationSec: set.durationSec,
    distanceM: set.distanceM,
    rpe: null,
  }));
}

/** Создаёт в базе упражнения для строк «new» и превращает все строки в записи для стора. */
export function commitQuickEntry(resolvedLines: ResolvedLine[]): QuickEntryCommit[] {
  // Одно и то же новое название в нескольких строках создаёт одно упражнение.
  const createdIdByStemKey = new Map<string, string>();
  const commits: QuickEntryCommit[] = [];

  for (const resolved of resolvedLines) {
    if (resolved.kind === 'error') continue;
    if (resolved.kind === 'matched') {
      commits.push({ exerciseId: resolved.exerciseId, sets: toCommitSets(resolved.sets) });
      continue;
    }
    const stemKey = nameToStems(resolved.name).join(' ');
    let exerciseId = createdIdByStemKey.get(stemKey);
    if (!exerciseId) {
      exerciseId = createExercise({
        name: resolved.name,
        muscleGroup: resolved.inferred.muscleGroup,
        secondaryMuscles: [],
        equipment: resolved.inferred.equipment,
        type: resolved.inferred.type,
        description: '',
        restSeconds: null,
      }).id;
      createdIdByStemKey.set(stemKey, exerciseId);
    }
    commits.push({ exerciseId, sets: toCommitSets(resolved.sets) });
  }
  return commits;
}
