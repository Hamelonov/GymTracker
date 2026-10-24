import { exerciseDescription, exerciseName } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';

const MISSING_EXERCISE = { nameEn: '', nameRu: '', isCustom: true };

/** Exercise name in the app language, or an empty string when the exercise row is missing. */
export function exerciseDisplayName(exerciseDetails: ExerciseRow | undefined, language: string): string {
  return exerciseName(exerciseDetails ?? MISSING_EXERCISE, language);
}

/** Exercise description in the app language, or an empty string when there is none. */
export function exerciseDisplayDescription(
  exerciseDetails: ExerciseRow | undefined,
  language: string,
): string {
  return exerciseDetails ? exerciseDescription(exerciseDetails, language) : '';
}
