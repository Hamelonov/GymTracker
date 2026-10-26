import type { SetType } from '@/domain/types';
import { parseCsvNumber, parseCsvRecords } from './csv';
import { parseHevyDate } from './hevyDate';

export interface ImportedSet {
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  distanceM: number | null;
  durationSec: number | null;
  rpe: number | null;
  /** В Hevy RIR нет, он приходит только из нашего CSV. */
  rir: number | null;
}

export interface ImportedExercise {
  title: string;
  note: string;
  supersetGroup: number | null;
  sets: ImportedSet[];
}

export interface ImportedWorkout {
  title: string;
  startedAt: number;
  finishedAt: number;
  notes: string;
  exercises: ImportedExercise[];
}

export interface HevyCsvParseResult {
  workouts: ImportedWorkout[];
  /** Строки, которые не удалось разобрать (нет даты/названия). */
  skippedRowCount: number;
}

const KG_PER_LBS = 0.45359237;
const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;
const DEFAULT_WORKOUT_DURATION_MS = 60 * 60 * 1000;

const SET_TYPE_BY_HEVY_NAME: Record<string, SetType> = {
  normal: 'normal',
  warmup: 'warmup',
  dropset: 'drop',
  failure: 'failure',
};

function multiplyOrNull(value: number | null, factor: number): number | null {
  return value === null ? null : value * factor;
}

function parseSetType(text: string | undefined): SetType {
  return SET_TYPE_BY_HEVY_NAME[(text ?? '').trim().toLowerCase()] ?? 'normal';
}

/** Индексы нужных колонок по заголовку: порядок произвольный, лишние игнорируются. */
function buildColumnIndex(headerRow: string[]): Map<string, number> {
  const columnIndex = new Map<string, number>();
  headerRow.forEach((columnName, index) => {
    columnIndex.set(columnName.trim().toLowerCase(), index);
  });
  return columnIndex;
}

interface ParsedRow {
  workoutKey: string;
  title: string;
  startedAt: number;
  finishedAt: number | null;
  description: string;
  exerciseTitle: string;
  supersetId: number | null;
  exerciseNote: string;
  setIndex: number | null;
  set: ImportedSet;
}

function parseRow(row: string[], columnIndex: Map<string, number>): ParsedRow | null {
  const readColumn = (columnName: string): string | undefined => {
    const index = columnIndex.get(columnName);
    return index === undefined ? undefined : row[index];
  };

  const title = (readColumn('title') ?? '').trim();
  const exerciseTitle = (readColumn('exercise_title') ?? '').trim();
  const startedAt = parseHevyDate(readColumn('start_time') ?? '');
  if (title === '' || exerciseTitle === '' || startedAt === null) return null;

  const weightLbs = parseCsvNumber(readColumn('weight_lbs'));
  const weightKg = parseCsvNumber(readColumn('weight_kg')) ?? multiplyOrNull(weightLbs, KG_PER_LBS);
  const distanceMiles = parseCsvNumber(readColumn('distance_miles'));
  const distanceM =
    multiplyOrNull(parseCsvNumber(readColumn('distance_km')), METERS_PER_KM) ??
    multiplyOrNull(distanceMiles, METERS_PER_MILE);

  return {
    workoutKey: `${title}\u0000${startedAt}`,
    title,
    startedAt,
    finishedAt: parseHevyDate(readColumn('end_time') ?? ''),
    description: readColumn('description') ?? '',
    exerciseTitle,
    supersetId: parseCsvNumber(readColumn('superset_id')),
    exerciseNote: readColumn('exercise_notes') ?? '',
    setIndex: parseCsvNumber(readColumn('set_index')),
    set: {
      type: parseSetType(readColumn('set_type')),
      weightKg,
      reps: parseCsvNumber(readColumn('reps')),
      distanceM,
      durationSec: parseCsvNumber(readColumn('duration_seconds')),
      rpe: parseCsvNumber(readColumn('rpe')),
      rir: null,
    },
  };
}

interface WorkoutDraft {
  workout: ImportedWorkout;
  exerciseByTitle: Map<string, ImportedExercise>;
  setsWithIndex: Map<ImportedExercise, { setIndex: number | null; set: ImportedSet }[]>;
  supersetGroupByHevyId: Map<number, number>;
}

/** Конец тренировки: если его нет или он раньше начала — считаем час от начала. */
function resolveFinishedAt(startedAt: number, finishedAt: number | null): number {
  if (finishedAt === null || finishedAt < startedAt) return startedAt + DEFAULT_WORKOUT_DURATION_MS;
  return finishedAt;
}

function createWorkoutDraft(row: ParsedRow): WorkoutDraft {
  return {
    workout: {
      title: row.title,
      startedAt: row.startedAt,
      finishedAt: resolveFinishedAt(row.startedAt, row.finishedAt),
      notes: row.description,
      exercises: [],
    },
    exerciseByTitle: new Map(),
    setsWithIndex: new Map(),
    supersetGroupByHevyId: new Map(),
  };
}

function resolveSupersetGroup(draft: WorkoutDraft, supersetId: number | null): number | null {
  if (supersetId === null) return null;
  const existingGroup = draft.supersetGroupByHevyId.get(supersetId);
  if (existingGroup !== undefined) return existingGroup;
  // Номера суперсетов пересчитываем с единицы в порядке появления внутри тренировки.
  const nextGroup = draft.supersetGroupByHevyId.size + 1;
  draft.supersetGroupByHevyId.set(supersetId, nextGroup);
  return nextGroup;
}

function addRowToDraft(draft: WorkoutDraft, row: ParsedRow): void {
  let exercise = draft.exerciseByTitle.get(row.exerciseTitle);
  if (!exercise) {
    exercise = {
      title: row.exerciseTitle,
      note: '',
      supersetGroup: resolveSupersetGroup(draft, row.supersetId),
      sets: [],
    };
    draft.exerciseByTitle.set(row.exerciseTitle, exercise);
    draft.setsWithIndex.set(exercise, []);
    draft.workout.exercises.push(exercise);
  }
  // Заметка упражнения — первое непустое значение среди его строк.
  if (exercise.note === '' && row.exerciseNote.trim() !== '') {
    exercise.note = row.exerciseNote;
  }
  draft.setsWithIndex.get(exercise)?.push({ setIndex: row.setIndex, set: row.set });
}

function finishDraft(draft: WorkoutDraft): ImportedWorkout {
  for (const exercise of draft.workout.exercises) {
    const setsWithIndex = draft.setsWithIndex.get(exercise) ?? [];
    // Сортируем по set_index только когда он есть у всех подходов, иначе оставляем порядок файла.
    const hasEveryIndex = setsWithIndex.every((entry) => entry.setIndex !== null);
    const ordered = hasEveryIndex
      ? setsWithIndex.slice().sort((left, right) => (left.setIndex ?? 0) - (right.setIndex ?? 0))
      : setsWithIndex;
    exercise.sets = ordered.map((entry) => entry.set);
  }
  return draft.workout;
}

export function parseHevyCsv(text: string): HevyCsvParseResult {
  const withoutBom = text.startsWith('﻿') ? text.slice(1) : text;
  const [headerRow, ...dataRows] = parseCsvRecords(withoutBom);
  if (!headerRow) return { workouts: [], skippedRowCount: 0 };

  const columnIndex = buildColumnIndex(headerRow);
  const draftByWorkoutKey = new Map<string, WorkoutDraft>();
  let skippedRowCount = 0;

  for (const row of dataRows) {
    // Пустые строки (например, завершающий перевод строки) не считаем пропущенными.
    if (row.every((field) => field.trim() === '')) continue;

    const parsedRow = parseRow(row, columnIndex);
    if (!parsedRow) {
      skippedRowCount += 1;
      continue;
    }

    let draft = draftByWorkoutKey.get(parsedRow.workoutKey);
    if (!draft) {
      draft = createWorkoutDraft(parsedRow);
      draftByWorkoutKey.set(parsedRow.workoutKey, draft);
    }
    addRowToDraft(draft, parsedRow);
  }

  return {
    workouts: Array.from(draftByWorkoutKey.values()).map(finishDraft),
    skippedRowCount,
  };
}
