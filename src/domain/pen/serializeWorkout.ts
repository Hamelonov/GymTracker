import {
  getSetFieldsForExerciseType,
  type ActiveExercise,
  type ActiveWorkout,
  type DistanceUnit,
  type ExerciseType,
  type SetFields,
  type SetType,
  type SetValues,
  type WeightUnit,
} from '@/domain/types';
import { formatNumberWithoutTrailingZeros, kgToUnit, metersToUnit, roundForDisplay } from '@/domain/units';

/** Единицы и язык — всё, что нужно, чтобы записать подход так, как его пишут в режиме «Ручка». */
export interface PenFormatOptions {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  /** 'ru' → суффиксы типов подхода р/о/д и знак «х», иначе w/f/d и «x». */
  language: string;
}

export interface SerializeOptions extends PenFormatOptions {
  exerciseNameById: Map<string, string>;
  exerciseTypeById: Map<string, ExerciseType>;
}

/** Любой подход, у которого есть значения и тип: из активной тренировки, из базы или из разбора. */
export type PenSet = SetValues & { type: SetType };

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

function hasAnyValue(set: SetValues): boolean {
  return set.weightKg != null || set.reps != null || set.durationSec != null || set.distanceM != null;
}

/** Знак умножения между весом и подходами: кириллическая «х» в русском интерфейсе. */
export function penTimesSign(language: string): string {
  return language.startsWith('ru') ? 'х' : 'x';
}

/** Значение одного подхода без веса: «9(1)о», «1:00», «5км 25:00». */
export function formatPenSetValue(
  set: PenSet,
  exerciseType: ExerciseType,
  options: PenFormatOptions,
): string {
  const fields = getSetFieldsForExerciseType(exerciseType);
  const suffixes = options.language.startsWith('ru') ? SET_TYPE_SUFFIX_RU : SET_TYPE_SUFFIX_EN;
  if (fields.reps) {
    // Выполненный подход без повторов (только вес) пишется одним весом: «70кг».
    if (set.reps == null) return '';
    const rirText = set.rir != null ? `(${set.rir})` : '';
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
  return `${parts.join(' ')}${suffixes[set.type]}`;
}

/** «70кг», «+10кг» у упражнений со своим весом, «-20кг» у упражнений с помощью. */
export function formatPenWeight(
  weightKg: number,
  exerciseType: ExerciseType,
  options: PenFormatOptions,
): string {
  const fields: SetFields = getSetFieldsForExerciseType(exerciseType);
  const weight = formatNumberWithoutTrailingZeros(roundForDisplay(kgToUnit(weightKg, options.weightUnit), 2));
  const unit = weightUnitToken(options.weightUnit, options.language);
  if (exerciseType === 'assisted_bodyweight') return `-${weight}${unit}`;
  if (!fields.weight || exerciseType === 'weighted_bodyweight') return `+${weight}${unit}`;
  return `${weight}${unit}`;
}

export interface PenGroup<Set extends PenSet = PenSet> {
  weightKg: number | null;
  /** «70кг» или null у группы без веса. */
  weightText: string | null;
  /** «9(1)/8(1)/8(0)» — подходы группы через слэш. */
  valuesText: string;
  /** Сами подходы группы: по ним таблицы выводят RIR и RPE на той же строке, что и вес. */
  sets: Set[];
}

/** Подряд идущие подходы с одним весом образуют группу: «70кг х 9/8, 80кг х 5». */
export function buildPenGroups<Set extends PenSet>(
  sets: Set[],
  exerciseType: ExerciseType,
  options: PenFormatOptions,
): PenGroup<Set>[] {
  const groups: { weightKg: number | null; values: string[]; sets: Set[] }[] = [];
  for (const set of sets.filter(hasAnyValue)) {
    const value = formatPenSetValue(set, exerciseType, options);
    const lastGroup = groups[groups.length - 1];
    // Подход без веса после подхода с весом пишется с явным нулём, иначе парсер унаследует прошлый вес.
    const hasSeenWeight = groups.some((group) => group.weightKg != null);
    const weightKg = set.weightKg ?? (hasSeenWeight ? 0 : null);
    if (lastGroup && lastGroup.weightKg === weightKg) {
      lastGroup.values.push(value);
      lastGroup.sets.push(set);
    } else {
      groups.push({ weightKg, values: [value], sets: [set] });
    }
  }
  return groups.map((group) => ({
    weightKg: group.weightKg,
    weightText: group.weightKg == null ? null : formatPenWeight(group.weightKg, exerciseType, options),
    valuesText: group.values.filter((value) => value.length > 0).join('/'),
    sets: group.sets,
  }));
}

/** Группы одной строкой: «70кг х 9(1)/8(1), 80кг х 5о». */
export function formatPenGroups(groups: PenGroup[], options: PenFormatOptions): string {
  const timesSign = penTimesSign(options.language);
  return groups
    .map((group) => {
      if (group.weightText == null) return group.valuesText;
      return group.valuesText.length > 0
        ? `${group.weightText} ${timesSign} ${group.valuesText}`
        : group.weightText;
    })
    .join(', ');
}

/** Одна карточка — одна строка: «Приседания со штангой 70кг х 9(1)/8(1), 80кг х 5о». */
export function serializeExerciseLine(exercise: ActiveExercise, options: SerializeOptions): string {
  const name = options.exerciseNameById.get(exercise.exerciseId) ?? '';
  const exerciseType = options.exerciseTypeById.get(exercise.exerciseId) ?? 'weight_reps';
  // В текст идут только выполненные подходы; невыполненный план (из программы или пустые строки) остаётся за текстом.
  const groups = buildPenGroups(
    exercise.sets.filter((set) => set.completed),
    exerciseType,
    options,
  );
  // Цифра в названии сбила бы парсер, поэтому такое название отделяется двоеточием.
  const nameText = /\d/.test(name) ? `${name}:` : name;
  if (groups.length === 0) return nameText;
  return `${nameText} ${formatPenGroups(groups, options)}`;
}

/** Вся тренировка для режима «Ручка»: строки через перевод строки. */
export function serializeWorkout(workout: ActiveWorkout, options: SerializeOptions): string {
  return workout.exercises.map((exercise) => serializeExerciseLine(exercise, options)).join('\n');
}
