export type ExerciseType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'weighted_bodyweight'
  | 'assisted_bodyweight'
  | 'duration'
  | 'distance_duration'
  | 'reps_only';

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'lats'
  | 'traps'
  | 'lower_back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'cardio'
  | 'full_body'
  | 'neck';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'lats',
  'traps',
  'lower_back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'cardio',
  'full_body',
  'neck',
];

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'smith'
  | 'plate'
  | 'other';

export const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'smith',
  'plate',
  'other',
];

export const EXERCISE_TYPES: ExerciseType[] = [
  'weight_reps',
  'bodyweight_reps',
  'weighted_bodyweight',
  'assisted_bodyweight',
  'duration',
  'distance_duration',
  'reps_only',
];

export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'mi';
export type MeasurementUnit = 'cm' | 'in';

/** Какие поля ввода показывает строка подхода для данного типа упражнения. */
export interface SetFields {
  weight: boolean;
  reps: boolean;
  duration: boolean;
  distance: boolean;
}

const WEIGHT_REPS: SetFields = Object.freeze({ weight: true, reps: true, duration: false, distance: false });
const REPS: SetFields = Object.freeze({ weight: false, reps: true, duration: false, distance: false });
const DURATION: SetFields = Object.freeze({ weight: false, reps: false, duration: true, distance: false });
const DISTANCE_DURATION: SetFields = Object.freeze({
  weight: false,
  reps: false,
  duration: true,
  distance: true,
});

/** Возвращает общую константу для каждого типа, поэтому безопасно передавать в мемоизированные компоненты. */
export function getSetFieldsForExerciseType(type: ExerciseType): SetFields {
  switch (type) {
    case 'weight_reps':
    case 'weighted_bodyweight':
    case 'assisted_bodyweight':
      return WEIGHT_REPS;
    case 'bodyweight_reps':
    case 'reps_only':
      return REPS;
    case 'duration':
      return DURATION;
    case 'distance_duration':
      return DISTANCE_DURATION;
  }
}

/** Подход в том виде, как его ввёл пользователь. Вес всегда хранится в кг, дистанция в метрах. */
export interface SetValues {
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
  rpe: number | null;
}

export const EMPTY_SET_VALUES: SetValues = {
  weightKg: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rpe: null,
};

export interface ActiveSet extends SetValues {
  /** Задаётся только у сохранённых тренировок: какие рекорды поставил этот подход. */
  prTypes?: RecordType[];
  id: string;
  type: SetType;
  completed: boolean;
  completedAt: number | null;
  /** Значения с прошлого выполнения этого упражнения (тот же номер подхода). */
  previous: SetValues | null;
}

export interface ActiveExercise {
  id: string;
  exerciseId: string;
  supersetGroup: number | null;
  note: string;
  restSeconds: number | null;
  sets: ActiveSet[];
}

export interface ActiveWorkout {
  id: string;
  name: string;
  startedAt: number;
  routineId: string | null;
  notes: string;
  exercises: ActiveExercise[];
}

export type RecordType = 'weight' | 'one_rm' | 'volume' | 'reps' | 'duration' | 'distance';

export interface RecordHit {
  type: RecordType;
  value: number;
  previous: number | null;
}

export type MeasurementType =
  | 'weight'
  | 'body_fat'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'left_bicep'
  | 'right_bicep'
  | 'left_forearm'
  | 'right_forearm'
  | 'left_thigh'
  | 'right_thigh'
  | 'left_calf'
  | 'right_calf';

export const MEASUREMENT_TYPES: MeasurementType[] = [
  'weight',
  'body_fat',
  'neck',
  'shoulders',
  'chest',
  'waist',
  'hips',
  'left_bicep',
  'right_bicep',
  'left_forearm',
  'right_forearm',
  'left_thigh',
  'right_thigh',
  'left_calf',
  'right_calf',
];

export function measurementUnitKind(type: MeasurementType): 'weight' | 'percent' | 'length' {
  if (type === 'weight') return 'weight';
  if (type === 'body_fat') return 'percent';
  return 'length';
}
