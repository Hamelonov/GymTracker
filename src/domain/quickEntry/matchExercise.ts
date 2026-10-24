import { damerauLevenshteinDistance } from './editDistance';
import { nameToStems } from './normalizeName';

export interface ExerciseCandidate {
  id: string;
  /** Русское и английское название (у пользовательских — одно и то же дважды). */
  names: string[];
  isCustom: boolean;
  usageCount: number;
  isInWorkout: boolean;
  /** Порядок в библиотеке: внутри каждой группы мышц первым идёт самое ходовое упражнение. */
  order: number;
}

export interface PreparedCandidate extends ExerciseCandidate {
  stemSets: string[][];
}

export interface ExerciseMatch {
  candidate: PreparedCandidate;
  /** Доля основ запроса, нашедшихся в названии (0…1). */
  score: number;
  /** Все основы названия нашлись в запросе: пользователь не пропустил ни одного слова названия. */
  isExactCover: boolean;
  /** Первая основа названия совпала с первой основой запроса («жим», «присед», «тяга»). */
  isFirstStemMatched: boolean;
  /** Длина совпавшего названия; нужна для последней ступени ничьей. */
  matchedNameLength: number;
}

export const MATCH_THRESHOLD = 0.6;
const PREFIX_MINIMUM_LENGTH = 4;

/** Считает основы один раз; вызывающая сторона кэширует результат через useMemo. */
export function prepareCandidates(candidates: ExerciseCandidate[]): PreparedCandidate[] {
  return candidates.map((candidate) => ({ ...candidate, stemSets: candidate.names.map(nameToStems) }));
}

/** Две основы считаются одним словом при одной–двух опечатках или если одна начинает другую. */
function areStemsClose(left: string, right: string): boolean {
  if (left === right) return true;
  const shorter = Math.min(left.length, right.length);
  if (shorter >= PREFIX_MINIMUM_LENGTH && (left.startsWith(right) || right.startsWith(left))) return true;
  // Опечатки почти никогда не трогают первую букву, а вот «трицепс» и «бицепс» различаются именно ею.
  if (left[0] !== right[0]) return false;
  const allowedDistance = Math.max(left.length, right.length) <= 5 ? 1 : 2;
  return damerauLevenshteinDistance(left, right) <= allowedDistance;
}

interface Coverage {
  queryCoverage: number;
  isExactCover: boolean;
  isFirstStemMatched: boolean;
  isHeadMatched: boolean;
}

/** Жадное сопоставление основ запроса с основами названия. */
function coverageOf(queryStems: string[], candidateStems: string[]): Coverage {
  const usedCandidateIndexes = new Set<number>();
  let matchedCount = 0;
  let isHeadMatched = false;
  let isFirstStemMatched = false;
  queryStems.forEach((queryStem, queryIndex) => {
    const matchIndex = candidateStems.findIndex(
      (candidateStem, index) => !usedCandidateIndexes.has(index) && areStemsClose(queryStem, candidateStem),
    );
    if (matchIndex === -1) return;
    usedCandidateIndexes.add(matchIndex);
    matchedCount += 1;
    if (queryIndex === 0) isHeadMatched = true;
    if (queryIndex === 0 && matchIndex === 0) isFirstStemMatched = true;
  });
  return {
    queryCoverage: queryStems.length === 0 ? 0 : matchedCount / queryStems.length,
    isExactCover: candidateStems.length > 0 && matchedCount === candidateStems.length,
    isFirstStemMatched,
    isHeadMatched,
  };
}

/**
 * Кандидат подходит, если первое слово запроса (само движение: «присед», «жим») нашлось в названии
 * и при этом либо совпала большая часть запроса, либо название целиком содержится в запросе.
 * Второе пускает «Подтягивания» для запроса «подтягивания широким хватом», которого в библиотеке нет.
 */
function isAcceptable(coverage: Coverage): boolean {
  if (!coverage.isHeadMatched) return false;
  return coverage.isExactCover || coverage.queryCoverage >= MATCH_THRESHOLD;
}

/** Лучшее из названий кандидата (русское или английское). */
function bestMatchFor(queryStems: string[], candidate: PreparedCandidate): ExerciseMatch | null {
  let best: ExerciseMatch | null = null;
  candidate.stemSets.forEach((stems, nameIndex) => {
    const coverage = coverageOf(queryStems, stems);
    if (!isAcceptable(coverage)) return;
    const match: ExerciseMatch = {
      candidate,
      score: coverage.queryCoverage,
      isExactCover: coverage.isExactCover,
      isFirstStemMatched: coverage.isFirstStemMatched,
      matchedNameLength: candidate.names[nameIndex]?.length ?? 0,
    };
    if (!best || compareMatches(match, best) < 0) best = match;
  });
  return best;
}

function compareBooleans(left: boolean, right: boolean): number {
  if (left === right) return 0;
  return left ? -1 : 1;
}

/**
 * Порядок предпочтения: название без лишних слов → больше совпавших слов запроса → уже в тренировке →
 * чаще делали → первое слово совпало → встроенное → порядок в библиотеке → короче название.
 * Название без лишних слов идёт первым, чтобы «подтягивания широким хватом» дали «Подтягивания»,
 * а не «Подтягивания обратным хватом»: ошибиться в сторону базового упражнения безопаснее.
 */
function compareMatches(left: ExerciseMatch, right: ExerciseMatch): number {
  return (
    compareBooleans(left.isExactCover, right.isExactCover) ||
    right.score - left.score ||
    compareBooleans(left.candidate.isInWorkout, right.candidate.isInWorkout) ||
    right.candidate.usageCount - left.candidate.usageCount ||
    compareBooleans(left.isFirstStemMatched, right.isFirstStemMatched) ||
    compareBooleans(!left.candidate.isCustom, !right.candidate.isCustom) ||
    left.candidate.order - right.candidate.order ||
    left.matchedNameLength - right.matchedNameLength
  );
}

function pickBest(queryStems: string[], candidates: PreparedCandidate[]): ExerciseMatch | null {
  const matches = candidates
    .map((candidate) => bestMatchFor(queryStems, candidate))
    .filter((match): match is ExerciseMatch => match != null)
    .sort(compareMatches);
  return matches[0] ?? null;
}

/** Кандидаты, у которых одно из названий совпадает с запросом слово в слово (после нормализации). */
function findExactMatches(queryStems: string[], candidates: PreparedCandidate[]): ExerciseMatch[] {
  const queryKey = queryStems.join(' ');
  return candidates
    .map((candidate) => bestMatchFor(queryStems, candidate))
    .filter((match): match is ExerciseMatch => match != null)
    .filter((match) => match.candidate.stemSets.some((stems) => stems.join(' ') === queryKey));
}

/**
 * Точное название побеждает нечёткое и правило «сначала из тренировки»: иначе строка «Подтягивания»
 * при карточке «Подтягивания обратным хватом» переехала бы на неё. Дальше — сначала среди упражнений
 * текущей тренировки, потом по всей библиотеке.
 */
export function matchExerciseName(query: string, candidates: PreparedCandidate[]): ExerciseMatch | null {
  const queryStems = nameToStems(query);
  if (queryStems.length === 0) return null;
  const exactMatches = findExactMatches(queryStems, candidates).sort(compareMatches);
  if (exactMatches[0]) return exactMatches[0];
  const inWorkout = candidates.filter((candidate) => candidate.isInWorkout);
  return pickBest(queryStems, inWorkout) ?? pickBest(queryStems, candidates);
}
