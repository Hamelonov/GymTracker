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

/** Which inputs a set row shows for a given exercise type. */
export interface SetFields {
  weight: boolean;
  reps: boolean;
  duration: boolean;
  distance: boolean;
}

export function setFieldsFor(type: ExerciseType): SetFields {
  switch (type) {
    case 'weight_reps':
    case 'weighted_bodyweight':
    case 'assisted_bodyweight':
      return { weight: true, reps: true, duration: false, distance: false };
    case 'bodyweight_reps':
    case 'reps_only':
      return { weight: false, reps: true, duration: false, distance: false };
    case 'duration':
      return { weight: false, reps: false, duration: true, distance: false };
    case 'distance_duration':
      return { weight: false, reps: false, duration: true, distance: true };
  }
}

/** A set as entered by the user. Weight is always stored in kg, distance in meters. */
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
  /** Set only on saved workouts: which records this set achieved. */
  prTypes?: PrType[];
  id: string;
  type: SetType;
  completed: boolean;
  completedAt: number | null;
  /** Values from the last time this exercise was performed (same set index). */
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

export type PrType = 'weight' | 'one_rm' | 'volume' | 'reps' | 'duration' | 'distance';

export interface PrHit {
  type: PrType;
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
