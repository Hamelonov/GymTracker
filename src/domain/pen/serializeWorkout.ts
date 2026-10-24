import {
  getSetFieldsForExerciseType,
  type ActiveExercise,
  type ActiveSet,
  type ActiveWorkout,
  type DistanceUnit,
  type ExerciseType,
  type SetFields,
  type SetType,
  type WeightUnit,
} from '@/domain/types';
import { formatNumberWithoutTrailingZeros, kgToUnit, metersToUnit, roundForDisplay } from '@/domain/units';

export interface SerializeOptions {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  /** 'ru' → суффиксы типов подхода р/о/д, иначе w/f/d. */
  language: string;
  exerciseNameById: Map<string, string>;
  exerciseTypeById: Map<string, ExerciseType>;
}

const SET_TYPE_SUFFIX_RU: Record<SetType, string> = { normal: '', warmup: 'р', failure: 'о', drop: 'д' };
const SET_TYPE_SUFFIX_EN: Record<SetType, string> = { normal: '', warmup: 'w', failure: 'f', drop: 'd' };

/** Единицы пишутся так, как их понимает парсер быстрой записи, а не как локализованные подписи. */
function weightUnitToken(unit: WeightUnit, language: string): string {
  if (unit === 'lb') return 'lb';
  return language.startsWith('ru') ? 'кг' : 'kg';
}

function distanceUnitToken(unit: DistanceUnit, language: string): string {
  if (unit === 'mi') return 'mi';
  return language.startsWith('ru') ? 'км' : 'km';
}

function padToTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/** «1:00», «25:00», «1:02:30» — в том же виде, в каком время вводят в строке. */
function formatClock(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${padToTwoDigits(minutes)}:${padToTwoDigits(seconds)}`;
  return `${minutes}:${padToTwoDigits(seconds)}`;
}

function hasAnyValue(set: ActiveSet): boolean {
  return set.weightKg != null || set.reps != null || set.durationSec != null || set.distanceM != null;
}

/** Значение одного подхода без веса: «9(1)о», «1:00», «5км 25:00». */
function formatSetValue(set: ActiveSet, fields: SetFields, options: SerializeOptions): string {
  if (fields.reps) {
    const suffixes = options.language.startsWith('ru') ? SET_TYPE_SUFFIX_RU : SET_TYPE_SUFFIX_EN;
    const rirText = set.rir != null ? `(${set.rir})` : '';
    // Выполненный подход без повторов (только вес) пишется одним весом: «70кг».
    if (set.reps == null) return '';
    return `${set.reps}${suffixes[set.type]}${rirText}`;
  }
  const parts: string[] = [];
  if (fields.distance && set.distanceM != null) {
    const distance = formatNumberWithoutTrailingZeros(
      roundForDisplay(metersToUnit(set.distanceM, options.distanceUnit), 2),
    );
    parts.push(`${distance}${distanceUnitToken(options.distanceUnit, options.language)}`);
  }
  if (set.durationSec != null) parts.push(formatClock(set.durationSec));
  // Тип подхода у времени и дистанции — тем же суффиксом в конце: «0:45р».
  const suffixes = options.language.startsWith('ru') ? SET_TYPE_SUFFIX_RU : SET_TYPE_SUFFIX_EN;
  return `${parts.join(' ')}${suffixes[set.type]}`;
}

/** «70кг», «+10кг» у упражнений со своим весом, «-20кг» у упражнений с помощью. */
function formatWeightPrefix(
  weightKg: number,
  exerciseType: ExerciseType,
  fields: SetFields,
  options: SerializeOptions,
) {
  const weight = formatNumberWithoutTrailingZeros(roundForDisplay(kgToUnit(weightKg, options.weightUnit), 2));
  const unit = weightUnitToken(options.weightUnit, options.language);
  if (exerciseType === 'assisted_bodyweight') return `-${weight}${unit}`;
  if (!fields.weight || exerciseType === 'weighted_bodyweight') return `+${weight}${unit}`;
  return `${weight}${unit}`;
}

interface WeightGroup {
  weightKg: number | null;
  values: string[];
}

/** Одна карточка — одна строка: «Приседания со штангой 70кг х 9(1)/8(1), 80кг х 5о». */
export function serializeExerciseLine(exercise: ActiveExercise, options: SerializeOptions): string {
  const name = options.exerciseNameById.get(exercise.exerciseId) ?? '';
  const exerciseType = options.exerciseTypeById.get(exercise.exerciseId) ?? 'weight_reps';
  const fields = getSetFieldsForExerciseType(exerciseType);

  // В текст идут только выполненные подходы, подряд идущие с одним весом образуют группу;
  // невыполненный план (из программы или пустые строки) остаётся за текстом.
  const groups: WeightGroup[] = [];
  for (const set of exercise.sets.filter((candidate) => candidate.completed && hasAnyValue(candidate))) {
    const value = formatSetValue(set, fields, options);
    const lastGroup = groups[groups.length - 1];
    // Подход без веса после подхода с весом пишется с явным нулём, иначе парсер унаследует прошлый вес.
    const hasSeenWeight = groups.some((group) => group.weightKg != null);
    const weightKg = set.weightKg ?? (hasSeenWeight ? 0 : null);
    if (lastGroup && lastGroup.weightKg === weightKg) lastGroup.values.push(value);
    else groups.push({ weightKg, values: [value] });
  }
  // Цифра в названии сбила бы парсер, поэтому такое название отделяется двоеточием.
  const nameText = /\d/.test(name) ? `${name}:` : name;
  if (groups.length === 0) return nameText;
  const timesSign = options.language.startsWith('ru') ? 'х' : 'x';

  const groupTexts = groups.map((group) => {
    const values = group.values.filter((value) => value.length > 0).join('/');
    if (group.weightKg == null) return values;
    const prefix = formatWeightPrefix(group.weightKg, exerciseType, fields, options);
    return values.length > 0 ? `${prefix} ${timesSign} ${values}` : prefix;
  });
  return `${nameText} ${groupTexts.join(', ')}`;
}

/** Вся тренировка для режима «Ручка»: строки через перевод строки. */
export function serializeWorkout(workout: ActiveWorkout, options: SerializeOptions): string {
  return workout.exercises.map((exercise) => serializeExerciseLine(exercise, options)).join('\n');
}
