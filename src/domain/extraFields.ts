import { EXTRA_FIELDS, type ExtraField, type SetFields, type SetValues } from './types';

/** Какие поля можно включить у упражнения: вес — только если его нет среди основных полей. */
export function availableExtraFields(fields: SetFields): ExtraField[] {
  return EXTRA_FIELDS.filter((field) => field !== 'weight' || !fields.weight);
}

/** Включённые поля в порядке EXTRA_FIELDS, без дублей и без тех, что недоступны для этих полей. */
export function normalizeExtraFields(
  extraFields: readonly ExtraField[] | undefined,
  fields: SetFields,
): ExtraField[] {
  const enabled = new Set(extraFields ?? []);
  return availableExtraFields(fields).filter((field) => enabled.has(field));
}

export function toggleExtraField(extraFields: readonly ExtraField[], field: ExtraField): ExtraField[] {
  const enabled = new Set(extraFields);
  if (enabled.has(field)) enabled.delete(field);
  else enabled.add(field);
  return EXTRA_FIELDS.filter((candidate) => enabled.has(candidate));
}

/**
 * Поля новой карточки: запомненные у упражнения плюс «Вес», если у упражнения без поля веса вес
 * уже есть в прошлых или запланированных подходах. Иначе галочка подставила бы его из прошлого раза
 * невидимо. RIR и RPE из прошлого раза не включаются: владелец просил добавлять их заново.
 */
export function initialExtraFields(
  rememberedExtraFields: readonly ExtraField[],
  sets: readonly SetValues[],
  fields: SetFields,
): ExtraField[] {
  const enabled = new Set(rememberedExtraFields);
  if (!fields.weight && sets.some((set) => set.weightKg != null)) enabled.add('weight');
  return normalizeExtraFields([...enabled], fields);
}

/**
 * Для записей, сделанных до появления списка полей: поле, у которого в подходах есть значения,
 * считается включённым, иначе старые RPE стали бы невидимыми при редактировании тренировки.
 */
export function withFieldsThatHaveValues(
  extraFields: readonly ExtraField[],
  sets: readonly SetValues[],
  fields: SetFields,
): ExtraField[] {
  const enabled = new Set(extraFields);
  if (sets.some((set) => set.rir != null)) enabled.add('rir');
  if (sets.some((set) => set.rpe != null)) enabled.add('rpe');
  if (!fields.weight && sets.some((set) => set.weightKg != null)) enabled.add('weight');
  return normalizeExtraFields([...enabled], fields);
}
