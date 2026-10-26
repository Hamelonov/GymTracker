import type { SetType } from '@/domain/types';
import { parseCsvNumber, parseCsvRecords } from './csv';
import type { HevyCsvParseResult, ImportedExercise, ImportedWorkout } from './hevyCsv';

/**
 * Разбор CSV, который выгружает сама программа (Профиль → Данные → «Экспорт тренировок»):
 * date, workout, duration, exercise, set, type, weight_kg | weight_lb, reps, duration_sec, distance_m, rpe, rir, note.
 */

const KG_PER_LB = 0.45359237;
const DEFAULT_WORKOUT_DURATION_SEC = 60 * 60;
const SET_TYPES: SetType[] = ['normal', 'warmup', 'failure', 'drop'];

/** Признак нашего файла: такие колонки есть только в нём. */
export function isGymTrackerCsvHeader(columnNames: string[]): boolean {
  const names = new Set(columnNames.map((name) => name.trim().toLowerCase()));
  return names.has('date') && names.has('workout') && names.has('exercise') && names.has('set');
}

/** «1:02:03» или «45:10» → секунды; прочерк или пусто → null. */
function parseClock(text: string | undefined): number | null {
  const parts = (text ?? '').trim().split(':');
  if (parts.length < 2 || parts.some((part) => !/^\d+$/.test(part))) return null;
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
}

function parseSetType(text: string | undefined): SetType {
  const type = (text ?? '').trim().toLowerCase();
  return SET_TYPES.find((setType) => setType === type) ?? 'normal';
}

export function parseGymTrackerCsv(text: string): HevyCsvParseResult {
  const withoutBom = text.startsWith('﻿') ? text.slice(1) : text;
  const [headerRow, ...dataRows] = parseCsvRecords(withoutBom);
  if (!headerRow) return { workouts: [], skippedRowCount: 0 };

  const columnIndex = new Map(headerRow.map((name, index) => [name.trim().toLowerCase(), index]));
  // Вес выгружается в единицах, выбранных в настройках на момент экспорта: это видно по заголовку.
  const isPounds = columnIndex.has('weight_lb');
  const workoutByKey = new Map<string, ImportedWorkout>();
  let skippedRowCount = 0;

  for (const row of dataRows) {
    const readColumn = (name: string): string | undefined => {
      const index = columnIndex.get(name);
      return index === undefined ? undefined : row[index];
    };
    const startedAt = Date.parse((readColumn('date') ?? '').trim());
    const exerciseTitle = (readColumn('exercise') ?? '').trim();
    if (!Number.isFinite(startedAt) || exerciseTitle === '') {
      // Пустые строки в конце файла не считаются ошибкой.
      if (row.some((cell) => cell.trim() !== '')) skippedRowCount += 1;
      continue;
    }

    const workoutTitle = (readColumn('workout') ?? '').trim();
    const workoutKey = `${workoutTitle}\u0000${startedAt}`;
    let workout = workoutByKey.get(workoutKey);
    if (!workout) {
      const durationSec = parseClock(readColumn('duration')) ?? DEFAULT_WORKOUT_DURATION_SEC;
      workout = {
        title: workoutTitle,
        startedAt,
        finishedAt: startedAt + durationSec * 1000,
        notes: '',
        exercises: [],
      };
      workoutByKey.set(workoutKey, workout);
    }

    // Подходы одного упражнения идут подряд; новое упражнение — когда сменилось название.
    let exercise: ImportedExercise | undefined = workout.exercises[workout.exercises.length - 1];
    if (!exercise || exercise.title !== exerciseTitle) {
      exercise = { title: exerciseTitle, note: '', supersetGroup: null, sets: [] };
      workout.exercises.push(exercise);
    }
    // Заметка упражнения повторяется в каждой его строке; берём первую непустую.
    const note = (readColumn('note') ?? '').trim();
    if (exercise.note === '' && note !== '') exercise.note = note;

    const weight = parseCsvNumber(readColumn(isPounds ? 'weight_lb' : 'weight_kg'));
    exercise.sets.push({
      type: parseSetType(readColumn('type')),
      weightKg: weight != null && isPounds ? weight * KG_PER_LB : weight,
      reps: parseCsvNumber(readColumn('reps')),
      durationSec: parseCsvNumber(readColumn('duration_sec')),
      distanceM: parseCsvNumber(readColumn('distance_m')),
      rpe: parseCsvNumber(readColumn('rpe')),
      rir: parseCsvNumber(readColumn('rir')),
    });
  }

  const workouts = [...workoutByKey.values()].sort((left, right) => left.startedAt - right.startedAt);
  return { workouts, skippedRowCount };
}
