import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type {
  Equipment,
  ExerciseType,
  MeasurementType,
  MuscleGroup,
  RecordType,
  SetType,
} from '@/domain/types';

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    nameEn: text('name_en').notNull(),
    nameRu: text('name_ru').notNull(),
    muscleGroup: text('muscle_group').$type<MuscleGroup>().notNull(),
    secondaryMuscles: text('secondary_muscles', { mode: 'json' })
      .$type<MuscleGroup[]>()
      .notNull()
      .default([]),
    equipment: text('equipment').$type<Equipment>().notNull(),
    type: text('type').$type<ExerciseType>().notNull(),
    /** Встроенное описание техники, локализованное. */
    descriptionEn: text('description_en').notNull().default(''),
    descriptionRu: text('description_ru').notNull().default(''),
    /** Собственное описание пользователя. Если задано, заменяет встроенное. */
    description: text('description'),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    restSeconds: integer('rest_seconds'),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('exercises_muscle_idx').on(table.muscleGroup)],
);

export const routineFolders = sqliteTable('routine_folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const routines = sqliteTable(
  'routines',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    folderId: text('folder_id').references(() => routineFolders.id, { onDelete: 'set null' }),
    position: integer('position').notNull().default(0),
    notes: text('notes').notNull().default(''),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    lastPerformedAt: integer('last_performed_at'),
  },
  (table) => [index('routines_folder_idx').on(table.folderId)],
);

export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    supersetGroup: integer('superset_group'),
    restSeconds: integer('rest_seconds'),
    note: text('note').notNull().default(''),
  },
  (table) => [index('routine_exercises_routine_idx').on(table.routineId)],
);

export const routineSets = sqliteTable(
  'routine_sets',
  {
    id: text('id').primaryKey(),
    routineExerciseId: text('routine_exercise_id')
      .notNull()
      .references(() => routineExercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    type: text('type').$type<SetType>().notNull().default('normal'),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    durationSec: integer('duration_sec'),
    distanceM: real('distance_m'),
    rpe: real('rpe'),
  },
  (table) => [index('routine_sets_exercise_idx').on(table.routineExerciseId)],
);

export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    startedAt: integer('started_at').notNull(),
    finishedAt: integer('finished_at').notNull(),
    durationSec: integer('duration_sec').notNull(),
    notes: text('notes').notNull().default(''),
    routineId: text('routine_id').references(() => routines.id, { onDelete: 'set null' }),
    volumeKg: real('volume_kg').notNull().default(0),
    setCount: integer('set_count').notNull().default(0),
    prCount: integer('pr_count').notNull().default(0),
  },
  (table) => [index('workouts_started_idx').on(table.startedAt)],
);

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    supersetGroup: integer('superset_group'),
    /** Заметка к тренировке («как сегодня прошло»). */
    note: text('note').notNull().default(''),
    restSeconds: integer('rest_seconds'),
  },
  (table) => [
    index('workout_exercises_workout_idx').on(table.workoutId),
    index('workout_exercises_exercise_idx').on(table.exerciseId),
  ],
);

export const sets = sqliteTable(
  'sets',
  {
    id: text('id').primaryKey(),
    workoutExerciseId: text('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    type: text('type').$type<SetType>().notNull().default('normal'),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    durationSec: integer('duration_sec'),
    distanceM: real('distance_m'),
    rpe: real('rpe'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(true),
    completedAt: integer('completed_at'),
    prTypes: text('pr_types', { mode: 'json' }).$type<RecordType[]>().notNull().default([]),
  },
  (table) => [index('sets_workout_exercise_idx').on(table.workoutExerciseId)],
);

export const measurements = sqliteTable(
  'measurements',
  {
    id: text('id').primaryKey(),
    type: text('type').$type<MeasurementType>().notNull(),
    /** Хранится в базовых единицах: кг, %, см. */
    value: real('value').notNull(),
    measuredAt: integer('measured_at').notNull(),
    note: text('note').notNull().default(''),
  },
  (table) => [index('measurements_type_idx').on(table.type, table.measuredAt)],
);

export const personalRecords = sqliteTable(
  'personal_records',
  {
    id: text('id').primaryKey(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    type: text('type').$type<RecordType>().notNull(),
    value: real('value').notNull(),
    setId: text('set_id'),
    workoutId: text('workout_id').references(() => workouts.id, { onDelete: 'cascade' }),
    achievedAt: integer('achieved_at').notNull(),
  },
  (table) => [index('personal_records_exercise_idx').on(table.exerciseId, table.type)],
);

export type ExerciseRow = typeof exercises.$inferSelect;
export type RoutineRow = typeof routines.$inferSelect;
export type RoutineFolderRow = typeof routineFolders.$inferSelect;
export type RoutineExerciseRow = typeof routineExercises.$inferSelect;
export type RoutineSetRow = typeof routineSets.$inferSelect;
export type WorkoutRow = typeof workouts.$inferSelect;
export type WorkoutExerciseRow = typeof workoutExercises.$inferSelect;
export type SetRow = typeof sets.$inferSelect;
export type MeasurementRow = typeof measurements.$inferSelect;
export type PersonalRecordRow = typeof personalRecords.$inferSelect;
