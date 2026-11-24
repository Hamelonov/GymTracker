import {
  getSetFieldsForExerciseType,
  type DistanceUnit,
  type ExerciseType,
  type SetType,
  type SetValues,
  type WeightUnit,
} from '@/domain/types';
import { DEFAULT_SET_SEPARATOR } from '@/domain/setSeparator';
import { formatNumberWithoutTrailingZeros, kgToUnit, metersToUnit, roundForDisplay } from '@/domain/units';

/** Единицы и язык — всё, что нужно, чтобы записать подход текстом вроде «70кг х 9(1)/8». */
export interface SetFormatOptions {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  /** 'ru' → суффиксы типов подхода р/о/д и знак «х», иначе w/f/d и «x». */
  language: string;
  /** Символ между подходами: «9/8/8». Не задан — слэш; файлы экспорта всегда пишутся со слэшем. */
  setSeparator?: string;
}

/** Любой подход, у которого есть значения и тип: из активной тренировки, из базы или из разбора. */
export type FormattableSet = SetValues & { type: SetType };

const SET_TYPE_SUFFIX_RU: Record<SetType, string> = { normal: '', warmup: 'р', failure: 'о', drop: 'д' };
const SET_TYPE_SUFFIX_EN: Record<SetType, string> = { normal: '', warmup: 'w', failure: 'f', drop: 'd' };

/** Единицы пишутся так, как их понимает парсер быстрой записи, а не как локализованные подписи. */
export function weightUnitToken(unit: WeightUnit, language: string): string {
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
export function getTimesSign(language: string): string {
  return language.startsWith('ru') ? 'х' : 'x';
}

/** Значение одного подхода без веса: «9(1)о», «1:00», «5км 25:00». */
export function formatSetValue(
  set: FormattableSet,
  exerciseType: ExerciseType,
  options: SetFormatOptions,
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

/** «70кг». Знака «+»/«-» у добавленного веса и помощи гравитрона нет: в истории это обычное число. */
export function formatSetWeight(weightKg: number, options: SetFormatOptions): string {
  const weight = formatNumberWithoutTrailingZeros(roundForDisplay(kgToUnit(weightKg, options.weightUnit), 2));
  return `${weight}${weightUnitToken(options.weightUnit, options.language)}`;
}

export interface SetGroup<Set extends FormattableSet = FormattableSet> {
  weightKg: number | null;
  /** «70кг» или null у группы без веса. */
  weightText: string | null;
  /** «9(1)/8(1)/8(0)» — подходы группы через разделитель из настроек (по умолчанию слэш). */
  valuesText: string;
  /** Сами подходы группы: по ним таблицы выводят RIR и RPE на той же строке, что и вес. */
  sets: Set[];
}

/** Подряд идущие подходы с одним весом образуют группу: «70кг х 9/8, 80кг х 5». */
export function buildSetGroups<Set extends FormattableSet>(
  sets: Set[],
  exerciseType: ExerciseType,
  options: SetFormatOptions,
): SetGroup<Set>[] {
  const groups: { weightKg: number | null; values: string[]; sets: Set[] }[] = [];
  for (const set of sets.filter(hasAnyValue)) {
    const value = formatSetValue(set, exerciseType, options);
    const lastGroup = groups[groups.length - 1];
    // Подход без веса после подхода с весом — это вес «0», а не продолжение прошлой группы.
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
    weightText: group.weightKg == null ? null : formatSetWeight(group.weightKg, options),
    valuesText: group.values
      .filter((value) => value.length > 0)
      .join(options.setSeparator ?? DEFAULT_SET_SEPARATOR),
    sets: group.sets,
  }));
}
