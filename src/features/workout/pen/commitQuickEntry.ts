import { createExercise } from '@/db/repo/exercises';
import { extraFieldsForSets } from '@/domain/quickEntry/extraFieldsForSets';
import { nameToStems } from '@/domain/quickEntry/normalizeName';
import { toCommitSets } from '@/domain/quickEntry/toCommitSets';
import type { ResolvedLine } from '@/domain/quickEntry/resolveLine';
import type { QuickEntryCommit } from '@/store/activeWorkoutPen';

/** Создаёт в базе упражнения для строк «new» и превращает все строки в записи для стора. */
export function commitQuickEntry(resolvedLines: ResolvedLine[]): QuickEntryCommit[] {
  // Одно и то же новое название в нескольких строках создаёт одно упражнение.
  const createdIdByStemKey = new Map<string, string>();
  const commits: QuickEntryCommit[] = [];

  for (const resolved of resolvedLines) {
    if (resolved.kind === 'error') continue;
    if (resolved.kind === 'matched') {
      commits.push({
        exerciseId: resolved.exerciseId,
        sets: toCommitSets(resolved.sets),
        extraFields: extraFieldsForSets(resolved.sets, resolved.exerciseType),
      });
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
    commits.push({
      exerciseId,
      sets: toCommitSets(resolved.sets),
      extraFields: extraFieldsForSets(resolved.sets, resolved.inferred.type),
    });
  }
  return commits;
}
