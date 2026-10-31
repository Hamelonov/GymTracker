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
  /** Первая основа названия совпала с первой основой запроса («жим», «присед», «тяга»). */
  isFirstStemMatched: boolean;
  /** Длина совпавшего названия; нужна для последней ступени ничьей. */
  matchedNameLength: number;
}

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
  /** Каждое слово запроса нашло пару в названии, и в названии не осталось лишних слов. */
  isSameName: boolean;
  isFirstStemMatched: boolean;
}

/** Жадное сопоставление основ запроса с основами названия. */
function coverageOf(queryStems: string[], candidateStems: string[]): Coverage {
  const usedCandidateIndexes = new Set<number>();
  let matchedCount = 0;
  let isFirstStemMatched = false;
  queryStems.forEach((queryStem, queryIndex) => {
    const matchIndex = candidateStems.findIndex(
      (candidateStem, index) => !usedCandidateIndexes.has(index) && areStemsClose(queryStem, candidateStem),
    );
    if (matchIndex === -1) return;
    usedCandidateIndexes.add(matchIndex);
    matchedCount += 1;
    if (queryIndex === 0 && matchIndex === 0) isFirstStemMatched = true;
  });
  return {
    isSameName: matchedCount === queryStems.length && matchedCount === candidateStems.length,
    isFirstStemMatched,
  };
}

/**
 * Упражнение подставляется, только если название то же самое: опечатки, формы слов и сокращения
 * прощаются, лишние слова — нет. Иначе «Приседания на одной ноге» молча становились
 * «Приседаниями на одной ноге на высокой тумбе»: лучше создать новое упражнение, чем записать в чужое.
 */
function bestMatchFor(queryStems: string[], candidate: PreparedCandidate): ExerciseMatch | null {
  let best: ExerciseMatch | null = null;
  candidate.stemSets.forEach((stems, nameIndex) => {
    const coverage = coverageOf(queryStems, stems);
    if (!coverage.isSameName) return;
    const match: ExerciseMatch = {
      candidate,
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
 * Несколько названий подходят, когда опечатка или сокращение близки к разным словам.
 * Порядок предпочтения: уже в тренировке → чаще делали → первое слово совпало → встроенное →
 * порядок в библиотеке → короче название.
 */
function compareMatches(left: ExerciseMatch, right: ExerciseMatch): number {
  return (
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
 * Название, совпавшее без опечаток, побеждает совпавшее с опечаткой, даже если второе уже есть
 * в тренировке. Дальше — сначала среди упражнений текущей тренировки, потом по всей библиотеке.
 */
export function matchExerciseName(query: string, candidates: PreparedCandidate[]): ExerciseMatch | null {
  const queryStems = nameToStems(query);
  if (queryStems.length === 0) return null;
  const exactMatches = findExactMatches(queryStems, candidates).sort(compareMatches);
  if (exactMatches[0]) return exactMatches[0];
  const inWorkout = candidates.filter((candidate) => candidate.isInWorkout);
  return pickBest(queryStems, inWorkout) ?? pickBest(queryStems, candidates);
}
