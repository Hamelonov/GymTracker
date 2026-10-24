import type { QuickEntryOutcome } from '@/store/activeWorkoutQuickEntry';
import type { PreviewLine } from './useQuickEntry';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** «Добавлено: Приседания со штангой · 3 подхода» или сводка по нескольким упражнениям. */
export function quickEntryToastMessage(
  outcome: Omit<QuickEntryOutcome, 'workout'>,
  previewLines: PreviewLine[],
  translate: Translate,
): string {
  const cardCount = outcome.workoutExerciseIds.length;
  if (cardCount > 1) {
    return translate('workout.quickEntryAddedMany', {
      exercises: translate('home.exercisesCount', { count: cardCount }),
      sets: translate('workout.quickEntrySets', { count: outcome.addedSetCount }),
    });
  }
  const name = previewLines.find((line) => line.status !== 'error')?.name ?? '';
  if (outcome.addedSetCount === 0) return translate('workout.quickEntryAddedNameOnly', { name });
  return translate('workout.quickEntryAdded', { name, count: outcome.addedSetCount });
}
