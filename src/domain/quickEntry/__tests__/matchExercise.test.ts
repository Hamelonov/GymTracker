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

test('опечатки владельца находят нужное упражнение', () => {
  expect(pick('Присед со штаного')).toBe('squat');
  expect(pick('Присидания с штонгой')).toBe('squat');
  expect(pick('жым лежа')).toBe('bench');
  expect(pick('подтягивание')).toBe('pullup');
  expect(pick('тяга верхнего блока')).toBe('lat-pulldown');
  expect(pick('bench press')).toBe('bench');
});

test('короткий запрос предпочитает точное, а не более длинное название', () => {
  expect(pick('присед со штангой')).toBe('squat');
  expect(pick('фронтальный присед')).toBe('front-squat');
});

test('ничья решается упражнением в тренировке, затем частотой', () => {
  expect(pick('жим')).toBe('bench');
  const withUsage = prepareCandidates(
    library.map((item) => (item.id === 'db-bench' ? { ...item, usageCount: 5 } : item)),
  );
  expect(pick('жим', withUsage)).toBe('db-bench');
  const inWorkout = prepareCandidates(
    withUsage.map((item) => (item.id === 'bench' ? { ...item, isInWorkout: true } : item)),
  );
  expect(pick('жим', inWorkout)).toBe('bench');
});

test('ничего похожего — null', () => {
  expect(pick('Фермерская прогулка')).toBeNull();
  expect(pick('Burpee')).toBeNull();
});

test('опечатки владельца против настоящей библиотеки упражнений', () => {
  const realLibrary = prepareCandidates(
    SEED_EXERCISES.map(([id, nameEn, nameRu], order) => candidate(id, nameRu, nameEn, { order })),
  );
  expect(pick('Присед со штаного', realLibrary)).toBe('bb-squat');
  expect(pick('Присидания с штонгой', realLibrary)).toBe('bb-squat');
  expect(pick('жым лежа', realLibrary)).toBe('bb-bench-press');
  expect(pick('подтягивание', realLibrary)).toBe('pull-up');
  expect(pick('тяга верхнего блока к груди', realLibrary)).toBe('lat-pulldown');
  expect(pick('планка', realLibrary)).toBe('plank');
  expect(pick('становая', realLibrary)).toBe('deadlift');
});

test('короткие и похожие запросы против настоящей библиотеки', () => {
  const realLibrary = prepareCandidates(
    SEED_EXERCISES.map(([id, nameEn, nameRu], order) => candidate(id, nameRu, nameEn, { order })),
  );
  expect(pick('присед', realLibrary)).toBe('bb-squat');
  expect(pick('приседания', realLibrary)).toBe('bb-squat');
  expect(pick('жим', realLibrary)).toBe('bb-bench-press');
  expect(pick('тяга', realLibrary)).toBe('bb-row');
  expect(pick('подтягивания широким хватом', realLibrary)).toBe('pull-up');
  expect(pick('трицепс', realLibrary)).not.toBe('bb-curl');
  expect(pick('отжимания узким хватом', realLibrary)).not.toBe('close-grip-bench');
});
