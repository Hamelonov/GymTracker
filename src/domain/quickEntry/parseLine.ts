import { unitToKg, unitToMeters } from '@/domain/units';
import { tokenize, type Token } from './tokenize';
import type { LineError, ParseOptions, ParsedLine, ParsedSet, WeightSign } from './types';

export type LineParseResult = { ok: true; line: ParsedLine } | { ok: false; error: LineError };

interface GroupWeight {
  weightKg: number;
  sign: WeightSign;
}

/** Позиция чтения в списке токенов; функции ниже сдвигают её по мере разбора. */
interface Cursor {
  tokens: Token[];
  index: number;
}

const EMPTY_PARSED_SET: ParsedSet = {
  type: 'normal',
  weightKg: null,
  weightSign: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rir: null,
};

const SECONDS_BY_TIME_UNIT = { sec: 1, min: 60, hour: 3600 } as const;
const WEIGHT_SIGN_BY_TOKEN_SIGN = { plus: 'extra', minus: 'assist' } as const;

/** Повторы — только целое число больше нуля: «8.5» и «0» лучше отклонить, чем записать выполненными. */
function isValidRepCount(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function peek(cursor: Cursor, offset = 0): Token | undefined {
  return cursor.tokens[cursor.index + offset];
}

function isValueStart(token: Token | undefined): boolean {
  return token?.kind === 'number' || token?.kind === 'clock' || token?.kind === 'sign';
}

/** Читает «[знак] число [единица веса]», если по контексту это вес, иначе оставляет курсор на месте. */
function readWeight(cursor: Cursor, options: ParseOptions): GroupWeight | null {
  const startIndex = cursor.index;
  const signToken = peek(cursor)?.kind === 'sign' ? peek(cursor) : undefined;
  if (signToken) cursor.index += 1;
  const numberToken = peek(cursor);
  if (numberToken?.kind !== 'number') {
    cursor.index = startIndex;
    return null;
  }
  cursor.index += 1;
  const unitToken = peek(cursor)?.kind === 'weightUnit' ? peek(cursor) : undefined;
  if (unitToken) cursor.index += 1;

  const next = peek(cursor);
  // Вес — это число со знаком или единицей веса, перед «х», либо первое из двух чисел подряд («70 7»).
  const isWeight = signToken != null || unitToken != null || next?.kind === 'times' || isValueStart(next);
  if (!isWeight) {
    cursor.index = startIndex;
    return null;
  }
  if (next?.kind === 'times') cursor.index += 1;

  const unit = unitToken?.kind === 'weightUnit' ? unitToken.unit : options.weightUnit;
  const sign: WeightSign = signToken?.kind === 'sign' ? WEIGHT_SIGN_BY_TOKEN_SIGN[signToken.sign] : null;
  return { weightKg: unitToKg(numberToken.value, unit), sign };
}

/** «20 мин», «1ч20м», «45с» — сумма всех подряд идущих частей времени. */
function readDurationFromUnits(cursor: Cursor): number | null {
  let totalSeconds: number | null = null;
  while (peek(cursor)?.kind === 'number' && peek(cursor, 1)?.kind === 'timeUnit') {
    const numberToken = peek(cursor);
    const unitToken = peek(cursor, 1);
    if (numberToken?.kind !== 'number' || unitToken?.kind !== 'timeUnit') break;
    totalSeconds = (totalSeconds ?? 0) + numberToken.value * SECONDS_BY_TIME_UNIT[unitToken.unit];
    cursor.index += 2;
  }
  return totalSeconds;
}

function readDuration(cursor: Cursor): number | null {
  const token = peek(cursor);
  if (token?.kind === 'clock') {
    cursor.index += 1;
    return token.seconds;
  }
  return readDurationFromUnits(cursor);
}

function readDistance(cursor: Cursor, options: ParseOptions): number | null {
  const numberToken = peek(cursor);
  const unitToken = peek(cursor, 1);
  if (numberToken?.kind !== 'number' || unitToken?.kind !== 'distanceUnit') return null;
  cursor.index += 2;
  if (unitToken.unit === 'm') return numberToken.value;
  return unitToMeters(numberToken.value, unitToken.unit);
}

/** Суффиксы после числа повторов: тип подхода («7о») и RIR («7(1)») в любом порядке, каждый не больше раза. */
function readRepsSuffixes(cursor: Cursor): { type: ParsedSet['type']; rir: number | null } {
  let type: ParsedSet['type'] = 'normal';
  let rir: number | null = null;
  for (;;) {
    const token = peek(cursor);
    if (token?.kind === 'setType' && type === 'normal') type = token.type;
    else if (token?.kind === 'rir' && rir == null) rir = token.value;
    else return { type, rir };
    cursor.index += 1;
  }
}

/** Одно значение подхода: повторы, время, дистанция или дистанция со временем в любом порядке. */
function readSingleValue(cursor: Cursor, options: ParseOptions): ParsedSet | null {
  const distanceFirst = readDistance(cursor, options);
  if (distanceFirst != null) {
    const durationSec = readDuration(cursor);
    return {
      ...EMPTY_PARSED_SET,
      distanceM: distanceFirst,
      durationSec,
      type: readRepsSuffixes(cursor).type,
    };
  }
  const duration = readDuration(cursor);
  if (duration != null) {
    const distanceM = readDistance(cursor, options);
    return { ...EMPTY_PARSED_SET, durationSec: duration, distanceM, type: readRepsSuffixes(cursor).type };
  }
  const numberToken = peek(cursor);
  if (numberToken?.kind !== 'number' || !isValidRepCount(numberToken.value)) return null;
  cursor.index += 1;
  return { ...EMPTY_PARSED_SET, reps: numberToken.value, ...readRepsSuffixes(cursor) };
}

/** Значение с учётом «3 по 7»: три одинаковых подхода. */
function readValue(cursor: Cursor, options: ParseOptions): ParsedSet[] | null {
  const countToken = peek(cursor);
  if (countToken?.kind === 'number' && isValidRepCount(countToken.value) && peek(cursor, 1)?.kind === 'per') {
    const startIndex = cursor.index;
    cursor.index += 2;
    const repeated = readSingleValue(cursor, options);
    if (repeated) return Array.from({ length: Math.round(countToken.value) }, () => repeated);
    cursor.index = startIndex;
  }
  const single = readSingleValue(cursor, options);
  return single ? [single] : null;
}

function withWeight(set: ParsedSet, weight: GroupWeight | null): ParsedSet {
  if (!weight) return set;
  return { ...set, weightKg: weight.weightKg, weightSign: weight.sign };
}

/** Группа «вес х значение/значение»; вес наследуется от предыдущей группы, если свой не указан. */
function readGroup(cursor: Cursor, options: ParseOptions, inheritedWeight: GroupWeight | null) {
  let weight = readWeight(cursor, options) ?? inheritedWeight;
  const sets: ParsedSet[] = [];
  for (;;) {
    // «70х7/80х5»: новый вес прямо внутри группы тоже допустим.
    const weightInsideGroup = sets.length > 0 ? readWeight(cursor, options) : null;
    if (weightInsideGroup) weight = weightInsideGroup;
    const values = readValue(cursor, options);
    if (!values) break;
    sets.push(...values.map((value) => withWeight(value, weight)));
    if (peek(cursor)?.kind !== 'slash') break;
    cursor.index += 1;
  }
  // «Жим 60кг» без повторов — один подход только с весом.
  if (sets.length === 0 && weight && weight !== inheritedWeight)
    sets.push(withWeight(EMPTY_PARSED_SET, weight));
  return { sets, weight };
}

/** Одна строка быстрой записи: название и подходы, или понятная ошибка. */
/**
 * Двоеточие после названия отделяет его от подходов явно: «Тяга 21: 70кг х 8». Двоеточие внутри
 * времени («1:00») не считается — у него цифры с обеих сторон.
 */
function splitNameByColon(rawText: string): { name: string; body: string } | null {
  for (let index = 0; index < rawText.length; index += 1) {
    if (rawText[index] !== ':') continue;
    const isInsideClock = /\d/.test(rawText[index - 1] ?? '') && /\d/.test(rawText[index + 1] ?? '');
    if (!isInsideClock) return { name: rawText.slice(0, index).trim(), body: rawText.slice(index + 1) };
  }
  return null;
}

/** Название — всё до первого числа, если нет явного двоеточия. */
function splitNameByFirstNumber(rawText: string): { name: string; body: string } {
  const tokens = tokenize(rawText);
  const firstValue = tokens.find(isValueStart);
  const nameEnd = firstValue ? firstValue.start : rawText.length;
  return { name: rawText.slice(0, nameEnd).trim(), body: rawText.slice(nameEnd) };
}

export function parseLine(rawText: string, lineIndex: number, options: ParseOptions): LineParseResult {
  const { name, body } = splitNameByColon(rawText) ?? splitNameByFirstNumber(rawText);
  if (!name) return { ok: false, error: { lineIndex, rawText, reason: 'missingName' } };
  const tokens = tokenize(body);
  if (tokens.length === 0) return { ok: true, line: { lineIndex, rawText, name, sets: [] } };

  const cursor: Cursor = { tokens, index: 0 };
  const sets: ParsedSet[] = [];
  let inheritedWeight: GroupWeight | null = null;
  for (;;) {
    const group = readGroup(cursor, options, inheritedWeight);
    sets.push(...group.sets);
    inheritedWeight = group.weight;
    if (peek(cursor)?.kind !== 'comma') break;
    cursor.index += 1;
  }

  const leftover = peek(cursor);
  if (leftover) {
    const fragment = body.slice(leftover.start).trim();
    return { ok: false, error: { lineIndex, rawText, reason: 'unexpectedText', fragment } };
  }
  return { ok: true, line: { lineIndex, rawText, name, sets } };
}

/** Весь текст поля: пустые строки пропускаются, остальные разбираются по порядку. */
export function parseEntryText(text: string, options: ParseOptions): LineParseResult[] {
  return text
    .split('\n')
    .map((lineText, lineIndex) => ({ lineText, lineIndex }))
    .filter(({ lineText }) => lineText.trim().length > 0)
    .map(({ lineText, lineIndex }) => parseLine(lineText, lineIndex, options));
}
