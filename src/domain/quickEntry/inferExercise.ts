import type { Equipment, ExerciseType, MuscleGroup } from '@/domain/types';
import type { ParsedSet } from './types';

export interface InferredExercise {
  type: ExerciseType;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
}

interface KeywordRule<Value> {
  pattern: RegExp;
  value: Value;
}

const EQUIPMENT_RULES: KeywordRule<Equipment>[] = [
  { pattern: /штанг|barbell/, value: 'barbell' },
  { pattern: /гантел|dumbbell/, value: 'dumbbell' },
  { pattern: /гир|kettlebell/, value: 'kettlebell' },
  { pattern: /смит|smith/, value: 'smith' },
  { pattern: /тренаж|machine|гребл|велос|bike|cycle|эллипс|elliptical/, value: 'machine' },
  { pattern: /блок|cable/, value: 'cable' },
  { pattern: /резин|band/, value: 'band' },
];

// Первое совпадение по порядку списка побеждает, поэтому более узкие правила стоят раньше широких.
const MUSCLE_GROUP_RULES: KeywordRule<MuscleGroup>[] = [
  {
    pattern: /бег|run|велос|bike|cycle|ходьб|walk|гребл|rowing|эллипс|elliptical|скакал|rope/,
    value: 'cardio',
  },
  { pattern: /присед|squat|выпад|lunge|разгибан.*ног|leg ext/, value: 'quads' },
  { pattern: /станов|deadlift|сгибан.*ног|leg curl/, value: 'hamstrings' },
  { pattern: /ягодич|glute|мост|hip thrust/, value: 'glutes' },
  { pattern: /икр|calf/, value: 'calves' },
  { pattern: /бицепс|bicep|curl/, value: 'biceps' },
  { pattern: /трицепс|tricep|француз|extension|брусь|dip/, value: 'triceps' },
  { pattern: /пресс|abs|планк|plank|скруч|crunch/, value: 'abs' },
  { pattern: /жим.*леж|bench|отжим|push.?up|разводк|fly|грудь|chest/, value: 'chest' },
  { pattern: /жим.*сто|жим.*сид|overhead|shoulder|плеч|махи|lateral|raise/, value: 'shoulders' },
  { pattern: /подтяг|pull.?up|тяг|row|pulldown|спин|back/, value: 'back' },
];

function findByKeywords<Value>(rules: KeywordRule<Value>[], name: string): Value | null {
  const normalizedName = name.toLowerCase().replace(/ё/g, 'е');
  return rules.find((rule) => rule.pattern.test(normalizedName))?.value ?? null;
}

function inferType(sets: ParsedSet[]): ExerciseType {
  if (sets.some((set) => set.weightSign === 'extra')) return 'weighted_bodyweight';
  if (sets.some((set) => set.weightSign === 'assist')) return 'assisted_bodyweight';
  if (sets.some((set) => set.weightKg != null)) return 'weight_reps';
  if (sets.some((set) => set.distanceM != null)) return 'distance_duration';
  if (sets.some((set) => set.durationSec != null)) return 'duration';
  if (sets.some((set) => set.reps != null)) return 'bodyweight_reps';
  // Одно название без чисел — самый частый случай для нового упражнения: вес и повторения.
  return 'weight_reps';
}

const TYPES_WITHOUT_WEIGHT: ExerciseType[] = [
  'bodyweight_reps',
  'reps_only',
  'duration',
  'distance_duration',
];

/** Тип, группа мышц и инвентарь для упражнения, которого нет в библиотеке, по тексту строки. */
export function inferExerciseFromLine(name: string, sets: ParsedSet[]): InferredExercise {
  const type = inferType(sets);
  const equipmentByKeyword = findByKeywords(EQUIPMENT_RULES, name);
  const fallbackEquipment: Equipment = TYPES_WITHOUT_WEIGHT.includes(type) ? 'bodyweight' : 'other';
  return {
    type,
    muscleGroup: findByKeywords(MUSCLE_GROUP_RULES, name) ?? 'full_body',
    equipment: equipmentByKeyword ?? fallbackEquipment,
  };
}
