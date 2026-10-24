import { exerciseDescription, exerciseName } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';

const MISSING_EXERCISE = { nameEn: '', nameRu: '', isCustom: true };

/** Название упражнения на языке приложения или пустая строка, если строки упражнения нет. */
export function exerciseDisplayName(exerciseDetails: ExerciseRow | undefined, language: string): string {
  return exerciseName(exerciseDetails ?? MISSING_EXERCISE, language);
}

/** Описание упражнения на языке приложения или пустая строка, если его нет. */
export function exerciseDisplayDescription(
  exerciseDetails: ExerciseRow | undefined,
  language: string,
): string {
  return exerciseDetails ? exerciseDescription(exerciseDetails, language) : '';
}
