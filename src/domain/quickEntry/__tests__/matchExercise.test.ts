import { SEED_EXERCISES } from '@/db/seed/exercises';
import { damerauLevenshteinDistance } from '../editDistance';
import { matchExerciseName, prepareCandidates, type ExerciseCandidate } from '../matchExercise';
import { nameToStems } from '../normalizeName';

const candidate = (
  id: string,
  nameRu: string,
  nameEn: string,
  extra: Partial<ExerciseCandidate> = {},
): ExerciseCandidate => ({
  id,
  names: [nameRu, nameEn],
  isCustom: false,
  usageCount: 0,
  isInWorkout: false,
  order: 0,
  ...extra,
});

const library = prepareCandidates([
  candidate('squat', 'Приседания со штангой', 'Squat (Barbell)', { order: 0 }),
  candidate('front-squat', 'Фронтальные приседания со штангой', 'Front Squat (Barbell)', { order: 1 }),
  candidate('bench', 'Жим штанги лёжа', 'Bench Press (Barbell)', { order: 2 }),
  candidate('db-bench', 'Жим гантелей лёжа', 'Bench Press (Dumbbell)', { order: 3 }),
  candidate('pullup', 'Подтягивания', 'Pull Up', { order: 4 }),
  candidate('lat-pulldown', 'Тяга верхнего блока к груди', 'Lat Pulldown', { order: 5 }),
]);

const pick = (query: string, candidates = library) =>
  matchExerciseName(query, candidates)?.candidate.id ?? null;

test('расстояние Дамерау–Левенштейна считает перестановку за одну правку', () => {
  expect(damerauLevenshteinDistance('штанга', 'штнага')).toBe(1);
  expect(damerauLevenshteinDistance('жим', 'жым')).toBe(1);
  expect(damerauLevenshteinDistance('', 'abc')).toBe(3);
});

test('основы: окончания, ё, стоп-слова', () => {
  expect(nameToStems('Приседания со штангой')).toEqual(['присед', 'штанг']);
  expect(nameToStems('Жим штанги лёжа')).toEqual(['жим', 'штанг', 'леж']);
  expect(nameToStems('Bench Press (Barbell)')).toEqual(['bench', 'pres', 'barbell']);
});

test('опечатки, формы слов и сокращения находят нужное упражнение', () => {
  expect(pick('Присед со штаного')).toBe('squat');
  expect(pick('Присидания с штонгой')).toBe('squat');
  expect(pick('жым штанги лежа')).toBe('bench');
  expect(pick('подтягивание')).toBe('pullup');
  expect(pick('тяга верхнего блока к груди')).toBe('lat-pulldown');
  expect(pick('bench press barbell')).toBe('bench');
});

test('лишние слова с любой стороны — уже другое упражнение', () => {
  expect(pick('фронтальный присед со штангой')).toBe('front-squat');
  expect(pick('присед')).toBeNull();
  expect(pick('жим')).toBeNull();
  expect(pick('тяга верхнего блока')).toBeNull();
  expect(pick('подтягивания широким хватом')).toBeNull();
});

test('ничья решается упражнением в тренировке, затем частотой', () => {
  const twins = prepareCandidates([
    candidate('bench', 'Жим лёжа', 'Bench Press', { order: 0 }),
    candidate('custom-bench', 'Жим лежа', 'Жим лежа', { order: 1, isCustom: true }),
  ]);
  expect(pick('жим лежа', twins)).toBe('bench');
  const withUsage = prepareCandidates(
    twins.map((item) => (item.id === 'custom-bench' ? { ...item, usageCount: 5 } : item)),
  );
  expect(pick('жим лежа', withUsage)).toBe('custom-bench');
  const inWorkout = prepareCandidates(
    withUsage.map((item) => (item.id === 'bench' ? { ...item, isInWorkout: true } : item)),
  );
  expect(pick('жим лежа', inWorkout)).toBe('bench');
});

test('ничего похожего — null', () => {
  expect(pick('Фермерская прогулка')).toBeNull();
  expect(pick('Burpee')).toBeNull();
});

const realLibrary = prepareCandidates(
  SEED_EXERCISES.map(([id, nameEn, nameRu], order) => candidate(id, nameRu, nameEn, { order })),
);

test('опечатки владельца против настоящей библиотеки упражнений', () => {
  expect(pick('Присед со штаного', realLibrary)).toBe('bb-squat');
  expect(pick('Присидания с штонгой', realLibrary)).toBe('bb-squat');
  expect(pick('жым штанги лежа', realLibrary)).toBe('bb-bench-press');
  expect(pick('подтягивание', realLibrary)).toBe('pull-up');
  expect(pick('тяга верхнего блока', realLibrary)).toBe('lat-pulldown');
  expect(pick('планка', realLibrary)).toBe('plank');
  expect(pick('становая тяга', realLibrary)).toBe('deadlift');
});

test('упражнения со своим весом по короткому названию', () => {
  expect(pick('приседания', realLibrary)).toBe('db-bodyweight-squat');
  expect(pick('присед', realLibrary)).toBe('db-bodyweight-squat');
  expect(pick('присидания', realLibrary)).toBe('db-bodyweight-squat');
  expect(pick('приседания на одной ноге', realLibrary)).toBe('bw-pistol-squat');
  expect(pick('выпады', realLibrary)).toBe('bw-lunge');
  expect(pick('отжимания', realLibrary)).toBe('push-up');
});

test('не подставляет упражнение с лишними словами из настоящей библиотеки', () => {
  expect(pick('жим', realLibrary)).toBeNull();
  expect(pick('приседания на одной ноге на тумбе', realLibrary)).toBeNull();
  expect(pick('трицепс', realLibrary)).not.toBe('bb-curl');
  expect(pick('отжимания узким хватом', realLibrary)).not.toBe('close-grip-bench');
});

test('точное название побеждает упражнение из тренировки с похожим названием', () => {
  const candidates = prepareCandidates([
    candidate('pullup', 'Подтягивания', 'Pull Up', { order: 0 }),
    candidate('chinup', 'Подтягивания обратным хватом', 'Chin Up', { order: 1, isInWorkout: true }),
  ]);
  expect(pick('подтягивания', candidates)).toBe('pullup');
  expect(pick('подтягивания обратным хватом', candidates)).toBe('chinup');
});
