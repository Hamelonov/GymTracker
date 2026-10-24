import { getSetFieldsForExerciseType, type ExerciseType, type ExtraField } from '@/domain/types';
import type { ParsedSet } from './types';

/** Какие дополнительные поля карточки нужно включить, чтобы показать всё, что было в строке. */
export function extraFieldsForSets(sets: ParsedSet[], exerciseType: ExerciseType): ExtraField[] {
  const fields = getSetFieldsForExerciseType(exerciseType);
  const extraFields: ExtraField[] = [];
  if (!fields.weight && sets.some((set) => set.weightKg != null)) extraFields.push('weight');
  if (sets.some((set) => set.rir != null)) extraFields.push('rir');
  return extraFields;
}
