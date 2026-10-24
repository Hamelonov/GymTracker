# План: быстрая запись подходов текстом

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на экране активной тренировки появляется вторая кнопка «+», открывающая поле, куда можно вписать `Присед со штангой 70кг х 7/6/5`; приложение находит упражнение в библиотеке (терпимо к опечаткам), добавляет карточку или дописывает подходы в существующую и отмечает их выполненными.

**Architecture:** чистый парсер и подбор названия живут в `src/domain/quickEntry/` без зависимостей от базы и React, покрыты юнит-тестами. Чистое преобразование активной тренировки — в `src/store/activeWorkoutQuickEntry.ts`, тонкий метод стора вызывает его. UI — шторка с полем и живым предпросмотром в `src/features/workout/quickEntry/`, подключённая к `src/app/workout/active.tsx`.

**Tech Stack:** TypeScript 6, React Native 0.88 / Expo 58, zustand 5, drizzle + expo-sqlite, jest (`jest-expo`), i18next.

**Spec:** `docs/superpowers/specs/2026-10-24-quick-entry-design.md`

## Global Constraints

- Код по AGENTS.md: полные слова в именах (`exercise`, не `ex`; `index`, не `i`), функции-глаголы, булевы как вопросы, комментарии **на русском** и объясняют «почему», стили в `StyleSheet.create` внизу файла, файл не длиннее ~250 строк, нет вложенных тернарников.
- `const { t: translate } = useTranslation()`, селекторы zustand `(state) => state.workout`.
- Никаких новых зависимостей. Никакой сети.
- Новые компоненты собираются из примитивов `src/ui` и токенов `spacing`, `radius`, цвета только из темы (`useColors()`).
- Все новые строки интерфейса добавляются и в `src/i18n/ru.ts`, и в `src/i18n/en.ts`, в раздел `workout`.
- Анимации не длиннее 200 мс, без пружин; предпросмотр считается синхронно в `useMemo`.
- Тесты лежат в `src/domain/quickEntry/__tests__/*.test.ts` и `src/store/__tests__/*.test.ts` (jest ищет `**/*.test.ts`). Запуск: `npx jest <путь>`.
- **Коммиты делает владелец сам.** Шаг «Коммит» в задачах означает: закончить задачу, прогнать `npm run format`, и предложить владельцу название коммита на русском. `git commit` не выполнять.
- Перед завершением всего плана: `npm run format`, `npm run typecheck`, `npm run lint`, `npm test`, затем сабагент `i18n-check`.

## Review Focus

1. Вес с десятичной запятой перед `х` (`72,5кг х 5`) должен читаться как 72,5 кг, а `70х7,6` — как два подхода (7 и 6) по 70 кг. Тест в Задаче 1.
2. Название с цифрой внутри слова (`Тяга Т-грифа 60х10`) — имя «Тяга Т-грифа», а не «Тяга Т-грифа 60». Тест в Задаче 2.
3. Запрос одним словом «жим» не должен уверенно тянуть случайное упражнение: при ничьей побеждает то, что уже в тренировке, иначе чаще выполняемое; предпросмотр это показывает. Тест в Задаче 3.
4. Карточка из программы с 3 пустыми подходами + ввод 4 подходов: первые 3 заполняются на месте (их `id` и `previous` сохраняются), четвёртый дописывается. Уже завершённые подходы не трогаются. Тест в Задаче 5.
5. Две строки с одним упражнением в одном вводе (`Присед 70х7` и `Присед 70х6`) дают одну карточку с двумя подходами, а не две карточки. Тест в Задаче 5.

---

## Карта файлов

Создать:

- `src/domain/quickEntry/types.ts` — общие типы разбора.
- `src/domain/quickEntry/tokenize.ts` — строка → токены.
- `src/domain/quickEntry/parseLine.ts` — токены → `ParsedLine` или ошибка; `parseEntryText` для многострочного текста.
- `src/domain/quickEntry/editDistance.ts` — расстояние Дамерау–Левенштейна.
- `src/domain/quickEntry/normalizeName.ts` — нормализация, стоп-слова, стемминг.
- `src/domain/quickEntry/matchExercise.ts` — оценка и выбор кандидата.
- `src/domain/quickEntry/inferExercise.ts` — тип, мышцы, инвентарь для нового упражнения.
- `src/domain/quickEntry/resolveLine.ts` — связывает разобранную строку с упражнением, адаптирует подходы под тип.
- `src/domain/quickEntry/__tests__/tokenize.test.ts`, `parseLine.test.ts`, `matchExercise.test.ts`, `resolveLine.test.ts`.
- `src/store/activeWorkoutQuickEntry.ts` — чистое `applyQuickEntry(workout, …)`.
- `src/store/__tests__/activeWorkoutQuickEntry.test.ts`.
- `src/features/workout/quickEntry/AddExerciseButtons.tsx` — ряд из двух кнопок-иконок.
- `src/features/workout/quickEntry/useQuickEntry.ts` — текст → предпросмотр и готовые записи.
- `src/features/workout/quickEntry/QuickEntryPreview.tsx` — строки предпросмотра.
- `src/features/workout/quickEntry/QuickEntrySheet.tsx` — шторка.
- `src/features/workout/quickEntry/commitQuickEntry.ts` — создаёт новые упражнения в базе и вызывает стор.

Изменить:

- `src/ui/Button.tsx` — `title` необязателен, когда есть `icon`.
- `src/store/activeWorkout.ts` — метод `addQuickEntry`.
- `src/app/workout/active.tsx` — кнопки, состояние шторки, обработчик, общий запуск таймера отдыха.
- `src/i18n/ru.ts`, `src/i18n/en.ts` — новые ключи в разделе `workout`.

---

### Task 1: Токенизатор

**Files:**
- Create: `src/domain/quickEntry/types.ts`, `src/domain/quickEntry/tokenize.ts`
- Test: `src/domain/quickEntry/__tests__/tokenize.test.ts`

**Interfaces:**
- Produces (`types.ts`):

```ts
import type { SetType } from '@/domain/types';
import type { DistanceUnit, WeightUnit } from '@/domain/units';

export type WeightSign = 'extra' | 'assist' | null; // «+10кг» / «-20кг» / без знака

export interface ParsedSet {
  type: SetType;
  /** Уже в килограммах; знак отдельно, число всегда положительное. */
  weightKg: number | null;
  weightSign: WeightSign;
  reps: number | null;
  durationSec: number | null;
  /** Уже в метрах. */
  distanceM: number | null;
}

export interface ParsedLine {
  lineIndex: number;
  rawText: string;
  name: string;
  sets: ParsedSet[];
}

export type LineErrorReason = 'missingName' | 'unexpectedText' | 'repsExpected';

export interface LineError {
  lineIndex: number;
  rawText: string;
  reason: LineErrorReason;
  /** Непонятый кусок строки для подсказки «Не понял: «…»». */
  fragment?: string;
}

export interface ParseOptions {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
}
```

- Produces (`tokenize.ts`):

```ts
/** У каждого токена есть `start` — индекс первого символа в исходной строке (нужен парсеру для имени и фрагмента ошибки). */
export type Token = { start: number } & (
  | { kind: 'word'; text: string }
  | { kind: 'number'; value: number }
  | { kind: 'clock'; seconds: number }          // 1:00, 0:45, 1:02:30
  | { kind: 'times' }                            // х x X × *
  | { kind: 'slash' }                            // / \ |
  | { kind: 'comma' }                            // , ;
  | { kind: 'sign'; sign: 'plus' | 'minus' }     // только перед числом
  | { kind: 'weightUnit'; unit: 'kg' | 'lb' }
  | { kind: 'distanceUnit'; unit: 'km' | 'mi' | 'm' }
  | { kind: 'timeUnit'; unit: 'sec' | 'min' | 'hour' }
  | { kind: 'setType'; type: 'warmup' | 'failure' | 'drop' }
  | { kind: 'per' }                              // «по»
);

export function tokenize(line: string): Token[];
```

Тесты ниже сравнивают через `toMatchObject` (длина массива должна совпасть, `start` не проверяется).

Правила токенизатора, которые тесты фиксируют:
- Пробелы — разделители, регистр не важен, `ё` = `е`.
- Число: `\d+` с необязательной дробной частью через `.`; через `,` — только если после дробной части идёт (с пробелами или без) единица веса или `х` (иначе запятая — отдельный токен `comma`).
- Единицы распознаются и приклеенными к числу, и отдельным словом: `кг|kg|кило\w*`, `lb|lbs|фунт\w*`; `км|km`, `mi|мил\w*`, `м|m` (только как отдельное слово или сразу после числа); `с|c|сек\w*|s|sec\w*`, `м|мин\w*|m|min\w*` — но `м`/`m` сразу после числа внутри `1ч20м` — это минуты, а `500м` — метры: правило — `м`/`m` считается минутами только если перед этим в той же строке уже был `timeUnit: hour`, иначе метрами; `ч|h|час\w*`.
- `setType`: буква `р|w` → warmup, `о|f` → failure, `д|d` → drop, **только** приклеенная к числу справа (`7р`), иначе это слово.
- `times`: `х` (кириллица), `x`, `X`, `×`, `*`; и приклеенная к числу (`70х7` → number, times, number), и отдельным словом.
- `sign`: `+`/`-` непосредственно перед цифрой; дефис внутри слова (`т-грифа`) остаётся частью слова.
- `per`: слово `по` → `per`.
- Всё остальное — `word`; знаки препинания кроме перечисленных удаляются.

- [ ] **Step 1: Написать падающие тесты**

```ts
import { tokenize } from '../tokenize';

test('вес, х и повторы через слэш', () => {
  expect(tokenize('Присед со штангой 70кг х 7/6/5')).toMatchObject([
    { kind: 'word', text: 'присед' }, { kind: 'word', text: 'со' }, { kind: 'word', text: 'штангой' },
    { kind: 'number', value: 70 }, { kind: 'weightUnit', unit: 'kg' }, { kind: 'times' },
    { kind: 'number', value: 7 }, { kind: 'slash' }, { kind: 'number', value: 6 }, { kind: 'slash' },
    { kind: 'number', value: 5 },
  ]);
});

test('приклеенный х и латинский x', () => {
  expect(tokenize('70х7')).toMatchObject([{ kind: 'number', value: 70 }, { kind: 'times' }, { kind: 'number', value: 7 }]);
  expect(tokenize('70 X 7')).toMatchObject([{ kind: 'number', value: 70 }, { kind: 'times' }, { kind: 'number', value: 7 }]);
});

test('десятичная запятая только у веса', () => {
  expect(tokenize('72,5кг х 5')).toMatchObject([
    { kind: 'number', value: 72.5 }, { kind: 'weightUnit', unit: 'kg' }, { kind: 'times' }, { kind: 'number', value: 5 },
  ]);
  expect(tokenize('70х7,6')).toMatchObject([
    { kind: 'number', value: 70 }, { kind: 'times' }, { kind: 'number', value: 7 }, { kind: 'comma' }, { kind: 'number', value: 6 },
  ]);
});

test('суффиксы типа подхода', () => {
  expect(tokenize('7р/7/5о')).toMatchObject([
    { kind: 'number', value: 7 }, { kind: 'setType', type: 'warmup' }, { kind: 'slash' },
    { kind: 'number', value: 7 }, { kind: 'slash' }, { kind: 'number', value: 5 }, { kind: 'setType', type: 'failure' },
  ]);
});

test('время и дистанция', () => {
  expect(tokenize('1:00/0:45')).toMatchObject([{ kind: 'clock', seconds: 60 }, { kind: 'slash' }, { kind: 'clock', seconds: 45 }]);
  expect(tokenize('5км 25:00')).toMatchObject([{ kind: 'number', value: 5 }, { kind: 'distanceUnit', unit: 'km' }, { kind: 'clock', seconds: 1500 }]);
  expect(tokenize('1ч20м')).toMatchObject([
    { kind: 'number', value: 1 }, { kind: 'timeUnit', unit: 'hour' }, { kind: 'number', value: 20 }, { kind: 'timeUnit', unit: 'min' },
  ]);
  expect(tokenize('500м')).toMatchObject([{ kind: 'number', value: 500 }, { kind: 'distanceUnit', unit: 'm' }]);
  expect(tokenize('45 сек')).toMatchObject([{ kind: 'number', value: 45 }, { kind: 'timeUnit', unit: 'sec' }]);
});

test('знак, «по» и дефис в слове', () => {
  expect(tokenize('+10кг х 8')).toMatchObject([
    { kind: 'sign', sign: 'plus' }, { kind: 'number', value: 10 }, { kind: 'weightUnit', unit: 'kg' }, { kind: 'times' }, { kind: 'number', value: 8 },
  ]);
  expect(tokenize('3 по 7')).toMatchObject([{ kind: 'number', value: 3 }, { kind: 'per' }, { kind: 'number', value: 7 }]);
  expect(tokenize('Тяга Т-грифа')).toMatchObject([{ kind: 'word', text: 'тяга' }, { kind: 'word', text: 'т-грифа' }]);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx jest src/domain/quickEntry/__tests__/tokenize.test.ts`
Expected: FAIL — модуль `../tokenize` не найден.

- [ ] **Step 3: Создать `types.ts` с типами из блока Interfaces и реализовать `tokenize(line: string): Token[]` в `tokenize.ts`**

Подход: один проход по строке регулярными выражениями, «якорь» на текущей позиции (`sticky`-флаг `y`), порядок проверки: пробелы → clock → число (с хвостами: единица, суффикс типа, `х`) → знак → одиночные разделители → слово. Таблица единиц — объект `{ regex, token }`, перебираемый по порядку.

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx jest src/domain/quickEntry/__tests__/tokenize.test.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

`npm run format`; предложить владельцу: `Токенизатор строки быстрой записи подходов`.

---

### Task 2: Разбор строки

**Files:**
- Create: `src/domain/quickEntry/parseLine.ts`
- Test: `src/domain/quickEntry/__tests__/parseLine.test.ts`

**Interfaces:**
- Consumes: `tokenize`, `Token` из Задачи 1; `unitToKg`, `unitToMeters` из `@/domain/units`.
- Produces:

```ts
export type LineParseResult = { ok: true; line: ParsedLine } | { ok: false; error: LineError };

/** Одна строка. lineIndex и rawText прокидываются в результат. */
export function parseLine(rawText: string, lineIndex: number, options: ParseOptions): LineParseResult;

/** Весь текст поля: пустые строки пропускаются, остальные — по порядку. */
export function parseEntryText(text: string, options: ParseOptions): LineParseResult[];
```

Грамматика (из спеки), как её читает парсер:
1. **Название** — исходная строка от начала до `start` первого токена вида `number | clock | sign` (или вся строка, если таких нет), с обрезанными пробелами. Так единицы и «по» внутри названия остаются словами. Пустое название → ошибка `missingName`.
2. После названия — **группы** через `comma`. Группа: `[sign] number [weightUnit]` считается **весом**, если за ним идёт `times`, либо есть `weightUnit`, либо за ним без `times` идёт ещё число/clock (правило «70 7»). Затем необязательный `times`, затем список **значений** через `slash`.
3. **Значение**: `number [setType]` → reps; `clock` → durationSec; `number timeUnit [number timeUnit]` → durationSec; `number distanceUnit [затем время]` → distanceM (+ durationSec); `number per number [setType]` → N одинаковых подходов. Порядок «время, потом дистанция» тоже допустим.
4. Вес группы наследуется следующими группами без своего веса.
5. Любой токен, не вписавшийся в грамматику, → ошибка `unexpectedText` с `fragment` = `rawText.slice(token.start).trim()`.
6. Вес без единицы — `options.weightUnit`; дистанция без единицы невозможна (число без единицы — повторы).

- [ ] **Step 1: Написать падающие тесты**

```ts
import { parseEntryText, parseLine } from '../parseLine';

const options = { weightUnit: 'kg', distanceUnit: 'km' } as const;
const set = (partial: Partial<ParsedSet>): ParsedSet => ({
  type: 'normal', weightKg: null, weightSign: null, reps: null, durationSec: null, distanceM: null, ...partial,
});

test('три подхода одним весом', () => {
  const result = parseLine('Присед со штангой 70кг х 7/6/5', 0, options);
  expect(result).toEqual({ ok: true, line: { lineIndex: 0, rawText: 'Присед со штангой 70кг х 7/6/5', name: 'Присед со штангой',
    sets: [set({ weightKg: 70, reps: 7 }), set({ weightKg: 70, reps: 6 }), set({ weightKg: 70, reps: 5 })] } });
});

test('группы с разным весом и наследование веса', () => {
  const result = parseLine('Присед 70х7/6, 80х5, 4', 0, options);
  expect(result.ok && result.line.sets).toEqual([
    set({ weightKg: 70, reps: 7 }), set({ weightKg: 70, reps: 6 }), set({ weightKg: 80, reps: 5 }), set({ weightKg: 80, reps: 4 }),
  ]);
});

test('«3 по 7», типы подходов, фунты', () => {
  expect(parseLine('Присед 70кг 3 по 7', 0, options).ok && parseLine('Присед 70кг 3 по 7', 0, options).line.sets)
    .toEqual([set({ weightKg: 70, reps: 7 }), set({ weightKg: 70, reps: 7 }), set({ weightKg: 70, reps: 7 })]);
  const typed = parseLine('Жим 60х7р/7/5о', 0, options);
  expect(typed.ok && typed.line.sets.map((parsedSet) => parsedSet.type)).toEqual(['warmup', 'normal', 'failure']);
  const pounds = parseLine('Bench 100lb x 5', 0, { weightUnit: 'kg', distanceUnit: 'km' });
  expect(pounds.ok && pounds.line.sets[0].weightKg).toBeCloseTo(45.36, 1);
  const defaultUnit = parseLine('Bench 100 x 5', 0, { weightUnit: 'lb', distanceUnit: 'mi' });
  expect(defaultUnit.ok && defaultUnit.line.sets[0].weightKg).toBeCloseTo(45.36, 1);
});

test('только повторы, доп. вес и помощь', () => {
  expect(parseLine('Подтягивания 12/10/8', 0, options).ok && parseLine('Подтягивания 12/10/8', 0, options).line.sets)
    .toEqual([set({ reps: 12 }), set({ reps: 10 }), set({ reps: 8 })]);
  const extra = parseLine('Подтягивания +10кг х 8', 0, options);
  expect(extra.ok && extra.line.sets[0]).toEqual(set({ weightKg: 10, weightSign: 'extra', reps: 8 }));
  const assist = parseLine('Подтягивания -20 х 8', 0, options);
  expect(assist.ok && assist.line.sets[0]).toEqual(set({ weightKg: 20, weightSign: 'assist', reps: 8 }));
});

test('время и дистанция', () => {
  expect(parseLine('Планка 1:00/0:45', 0, options).ok && parseLine('Планка 1:00/0:45', 0, options).line.sets)
    .toEqual([set({ durationSec: 60 }), set({ durationSec: 45 })]);
  const run = parseLine('Бег 5км 25:00', 0, options);
  expect(run.ok && run.line.sets).toEqual([set({ distanceM: 5000, durationSec: 1500 })]);
  const intervals = parseLine('Бег 1км 5:00 / 1км 4:50', 0, options);
  expect(intervals.ok && intervals.line.sets).toEqual([set({ distanceM: 1000, durationSec: 300 }), set({ distanceM: 1000, durationSec: 290 })]);
  const bike = parseLine('Велосипед 20 мин', 0, options);
  expect(bike.ok && bike.line.sets).toEqual([set({ durationSec: 1200 })]);
  const miles = parseLine('Run 3mi', 0, options);
  expect(miles.ok && miles.line.sets[0].distanceM).toBeCloseTo(4828, 0);
});

test('два числа без х: вес и повторы; название с цифрой внутри слова', () => {
  const bare = parseLine('Присед 70 7', 0, options);
  expect(bare.ok && bare.line.sets).toEqual([set({ weightKg: 70, reps: 7 })]);
  const tBar = parseLine('Тяга Т-грифа 60х10', 0, options);
  expect(tBar.ok && tBar.line.name).toBe('Тяга Т-грифа');
});

test('только название — пустой список подходов', () => {
  expect(parseLine('Присед', 0, options)).toEqual({ ok: true, line: { lineIndex: 0, rawText: 'Присед', name: 'Присед', sets: [] } });
});

test('ошибки', () => {
  expect(parseLine('70х7', 0, options)).toEqual({ ok: false, error: { lineIndex: 0, rawText: '70х7', reason: 'missingName' } });
  expect(parseLine('Присед 70х7 ура', 0, options)).toEqual({ ok: false, error: { lineIndex: 0, rawText: 'Присед 70х7 ура', reason: 'unexpectedText', fragment: 'ура' } });
});

test('несколько строк, пустые пропускаются', () => {
  const results = parseEntryText('Присед 70х7\n\nЖим 60х8', options);
  expect(results.map((result) => result.ok && result.line.name)).toEqual(['Присед', 'Жим']);
  expect(results.map((result) => result.ok && result.line.lineIndex)).toEqual([0, 2]);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx jest src/domain/quickEntry/__tests__/parseLine.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `parseLine` и `parseEntryText` в `parseLine.ts`**

Рекурсивный спуск по массиву токенов с курсором; маленькие функции `readGroup`, `readValue`, `readWeight`, `readDurationFromUnits`. Если после названия токенов нет — `sets: []`. При необходимости добавить `start` к токенам в Задаче 1 (см. п. 5 грамматики) и поправить её тесты.

- [ ] **Step 4: Убедиться, что проходят тесты Задач 1 и 2**

Run: `npx jest src/domain/quickEntry`
Expected: PASS.

- [ ] **Step 5: Коммит**

`npm run format`; предложить: `Разбор строки быстрой записи: вес, повторы, типы подходов, время и дистанция`.

---

### Task 3: Распознавание названия

**Files:**
- Create: `src/domain/quickEntry/editDistance.ts`, `src/domain/quickEntry/normalizeName.ts`, `src/domain/quickEntry/matchExercise.ts`
- Test: `src/domain/quickEntry/__tests__/matchExercise.test.ts`

**Interfaces:**
- Produces:

```ts
// editDistance.ts
export function damerauLevenshteinDistance(left: string, right: string): number;

// normalizeName.ts
/** Нижний регистр, ё→е, знаки препинания → пробелы, стоп-слова убраны, слова обрезаны до основ. */
export function nameToStems(text: string): string[];

// matchExercise.ts
export interface ExerciseCandidate {
  id: string;
  /** Русское и английское название (у пользовательских — одно и то же дважды). */
  names: string[];
  isCustom: boolean;
  usageCount: number;
  isInWorkout: boolean;
  /** Порядок в библиотеке, для последней ступени ничьей. */
  order: number;
}
export interface PreparedCandidate extends ExerciseCandidate { stemSets: string[][] }
export const MATCH_THRESHOLD = 0.6;

/** Считает основы один раз; вызывающая сторона кэширует результат через useMemo. */
export function prepareCandidates(candidates: ExerciseCandidate[]): PreparedCandidate[];
export function scoreNameMatch(queryStems: string[], candidateStems: string[]): number;
export function matchExerciseName(query: string, candidates: PreparedCandidate[]): { candidate: PreparedCandidate; score: number } | null;
```

Правила из спеки: пара основ совпадает при расстоянии ≤ 1 для основ до 5 символов и ≤ 2 для более длинных, либо одна основа — префикс другой длиной ≥ 4. Оценка = доля совпавших основ запроса × 0,7 + доля основ кандидата × 0,3; у кандидата берётся максимум по его названиям. Сначала ищем среди `isInWorkout` (порог 0,6), затем среди всех. Ничья (разница оценок < 0,001): `isInWorkout` → больший `usageCount` → `!isCustom` → меньше символов в лучшем названии → меньший `order`.

Стемминг: срезать одно окончание из списка (длинные первыми), если остаток ≥ 3 символов. Русские: `иями ями ами ения ение ания ание аний ений ость ости ого его ому ему ыми ими ых их ой ей ом ем ах ях ую юю ая яя ые ие ый ий ов ев ам ям а я ы и е у ю о ь`. Английские: `ing es s`. Стоп-слова: `с со на в во и из к у the with on a an of for`.

- [ ] **Step 1: Написать падающие тесты**

```ts
import { damerauLevenshteinDistance } from '../editDistance';
import { nameToStems } from '../normalizeName';
import { matchExerciseName, prepareCandidates, type ExerciseCandidate } from '../matchExercise';

const candidate = (id: string, nameRu: string, nameEn: string, extra: Partial<ExerciseCandidate> = {}): ExerciseCandidate => ({
  id, names: [nameRu, nameEn], isCustom: false, usageCount: 0, isInWorkout: false, order: 0, ...extra,
});
const library = prepareCandidates([
  candidate('squat', 'Приседания со штангой', 'Squat (Barbell)', { order: 0 }),
  candidate('front-squat', 'Фронтальные приседания со штангой', 'Front Squat (Barbell)', { order: 1 }),
  candidate('bench', 'Жим штанги лёжа', 'Bench Press (Barbell)', { order: 2 }),
  candidate('db-bench', 'Жим гантелей лёжа', 'Bench Press (Dumbbell)', { order: 3 }),
  candidate('pullup', 'Подтягивания', 'Pull Up', { order: 4 }),
  candidate('lat-pulldown', 'Тяга верхнего блока к груди', 'Lat Pulldown', { order: 5 }),
]);
const pick = (query: string, candidates = library) => matchExerciseName(query, candidates)?.candidate.id ?? null;

test('расстояние Дамерау–Левенштейна считает перестановку за одну правку', () => {
  expect(damerauLevenshteinDistance('штанга', 'штнага')).toBe(1);
  expect(damerauLevenshteinDistance('жим', 'жым')).toBe(1);
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
  const withUsage = prepareCandidates(library.map((item) => (item.id === 'db-bench' ? { ...item, usageCount: 5 } : item)));
  expect(pick('жим', withUsage)).toBe('db-bench');
  const inWorkout = prepareCandidates(withUsage.map((item) => (item.id === 'bench' ? { ...item, isInWorkout: true } : item)));
  expect(pick('жим', inWorkout)).toBe('bench');
});

test('ничего похожего — null', () => {
  expect(pick('Фермерская прогулка')).toBeNull();
  expect(pick('Burpee')).toBeNull();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx jest src/domain/quickEntry/__tests__/matchExercise.test.ts`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать три модуля по сигнатурам выше**

`damerauLevenshteinDistance` — классическая матрица с транспозицией (оптимальное выравнивание строк). `scoreNameMatch` — жадное сопоставление: для каждой основы запроса ищется первая ещё не занятая основа кандидата, удовлетворяющая правилу близости.

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx jest src/domain/quickEntry/__tests__/matchExercise.test.ts`
Expected: PASS. Если какой-то запрос из теста «опечатки владельца» не находится — подкрутить список окончаний или порог близости, не переписывая тест под реализацию.

- [ ] **Step 5: Коммит**

`npm run format`; предложить: `Распознавание названия упражнения с опечатками для быстрой записи`.

---

### Task 4: Связывание строки с упражнением

**Files:**
- Create: `src/domain/quickEntry/inferExercise.ts`, `src/domain/quickEntry/resolveLine.ts`
- Test: `src/domain/quickEntry/__tests__/resolveLine.test.ts`

**Interfaces:**
- Consumes: `ParsedLine`, `ParsedSet`, `LineError` (Задача 1); `matchExerciseName`, `PreparedCandidate` (Задача 3); `getSetFieldsForExerciseType`, `SetFields`, `ExerciseType`, `MuscleGroup`, `Equipment` из `@/domain/types`.
- Produces:

```ts
// inferExercise.ts
export interface InferredExercise { type: ExerciseType; muscleGroup: MuscleGroup; equipment: Equipment }
export function inferExerciseFromLine(name: string, sets: ParsedSet[]): InferredExercise;

// resolveLine.ts
export interface ResolvedExerciseInfo { id: string; type: ExerciseType }
export type ResolvedLine =
  | { kind: 'matched'; lineIndex: number; exerciseId: string; sets: ParsedSet[] }
  | { kind: 'new'; lineIndex: number; name: string; inferred: InferredExercise; sets: ParsedSet[] }
  | { kind: 'error'; error: LineError };

/** Подгоняет подходы под поля упражнения; возвращает причину ошибки, если не сходится. */
export function adaptSetsToFields(sets: ParsedSet[], fields: SetFields): { sets: ParsedSet[] } | { error: LineErrorReason };

export function resolveLine(
  line: ParsedLine,
  candidates: PreparedCandidate[],
  typeByExerciseId: Map<string, ExerciseType>,
): ResolvedLine;
```

Правила `inferExerciseFromLine` (спека): тип — `weightSign === 'extra'` → `weighted_bodyweight`; `'assist'` → `assisted_bodyweight`; есть вес → `weight_reps`; есть дистанция → `distance_duration`; только время → `duration`; только повторы → `bodyweight_reps`; нет подходов → `weight_reps`. Инвентарь по подстрокам названия: `штанг|barbell` → barbell, `гантел|dumbbell` → dumbbell, `гир|kettlebell` → kettlebell, `тренаж|machine` → machine, `блок|cable` → cable, `резин|band` → band, `смит|smith` → smith; иначе `bodyweight` для типов без веса и `other` для остальных. Группа мышц по подстрокам: `присед|squat|выпад|lunge|разгибан.*ног|leg ext` → quads; `тяг.*станов|deadlift|сгибан.*ног|leg curl` → hamstrings; `ягодич|glute|мост|hip thrust` → glutes; `жим.*леж|bench|отжим|push.?up|разводк|fly|грудь|chest` → chest; `подтяг|pull.?up|тяга|row|pulldown|спин|back` → back; `жим.*стоя|жим.*сид|overhead|shoulder|плеч|махи|lateral|raise` → shoulders; `бицепс|bicep|curl` → biceps; `трицепс|tricep|француз|extension|брусь|dip` → triceps; `пресс|abs|планк|plank|скруч|crunch` → abs; `икр|calf` → calves; `бег|run|велос|bike|cycle|ходьб|walk|гребл|row.*machine|эллипс|elliptical|скакал|rope` → cardio; иначе `full_body`. Первое совпадение по порядку списка побеждает.

Правила `adaptSetsToFields`: поля `duration` без `reps` и у подхода `reps` без `durationSec` → переносим `reps` в `durationSec`; поля `reps` без `duration` и у подхода только `durationSec`/`distanceM` → `{ error: 'repsExpected' }`; поля без `weight`, а вес есть → вес остаётся (поле в модели есть). Пустой список подходов проходит без изменений.

`resolveLine`: имя → `matchExerciseName`; найдено → `adaptSetsToFields(sets, getSetFieldsForExerciseType(typeByExerciseId.get(id)))`, при ошибке → `{ kind: 'error', error: { lineIndex, rawText, reason } }`; не найдено → `{ kind: 'new', inferred: inferExerciseFromLine(name, sets) }`.

- [ ] **Step 1: Написать падающие тесты**

```ts
import { inferExerciseFromLine } from '../inferExercise';
import { adaptSetsToFields, resolveLine } from '../resolveLine';
import { prepareCandidates } from '../matchExercise';
import { getSetFieldsForExerciseType } from '@/domain/types';

const set = (partial: Partial<ParsedSet>): ParsedSet => ({ type: 'normal', weightKg: null, weightSign: null, reps: null, durationSec: null, distanceM: null, ...partial });
const line = (name: string, sets: ParsedSet[]): ParsedLine => ({ lineIndex: 0, rawText: name, name, sets });
const candidates = prepareCandidates([
  { id: 'squat', names: ['Приседания со штангой', 'Squat (Barbell)'], isCustom: false, usageCount: 0, isInWorkout: false, order: 0 },
  { id: 'plank', names: ['Планка', 'Plank'], isCustom: false, usageCount: 0, isInWorkout: false, order: 1 },
]);
const types = new Map<string, ExerciseType>([['squat', 'weight_reps'], ['plank', 'duration']]);

test('вывод типа нового упражнения из строки', () => {
  expect(inferExerciseFromLine('Присед с гирей', [set({ weightKg: 24, reps: 10 })])).toEqual({ type: 'weight_reps', muscleGroup: 'quads', equipment: 'kettlebell' });
  expect(inferExerciseFromLine('Берпи', [set({ reps: 15 })])).toEqual({ type: 'bodyweight_reps', muscleGroup: 'full_body', equipment: 'bodyweight' });
  expect(inferExerciseFromLine('Вис на турнике', [set({ durationSec: 40 })]).type).toBe('duration');
  expect(inferExerciseFromLine('Гребля', [set({ distanceM: 2000, durationSec: 480 })])).toEqual({ type: 'distance_duration', muscleGroup: 'cardio', equipment: 'machine' });
  expect(inferExerciseFromLine('Подтягивания узким хватом', [set({ weightKg: 10, weightSign: 'extra', reps: 8 })]).type).toBe('weighted_bodyweight');
  expect(inferExerciseFromLine('Что-то новое', []).type).toBe('weight_reps');
});

test('голые числа у упражнения на время становятся секундами', () => {
  expect(adaptSetsToFields([set({ reps: 60 })], getSetFieldsForExerciseType('duration'))).toEqual({ sets: [set({ durationSec: 60 })] });
});

test('время у упражнения на повторы — ошибка', () => {
  expect(adaptSetsToFields([set({ durationSec: 60 })], getSetFieldsForExerciseType('bodyweight_reps'))).toEqual({ error: 'repsExpected' });
});

test('найденное, новое и ошибочное', () => {
  expect(resolveLine(line('присед со штаного', [set({ weightKg: 70, reps: 7 })]), candidates, types))
    .toEqual({ kind: 'matched', lineIndex: 0, exerciseId: 'squat', sets: [set({ weightKg: 70, reps: 7 })] });
  expect(resolveLine(line('Планка', [set({ reps: 60 })]), candidates, types))
    .toEqual({ kind: 'matched', lineIndex: 0, exerciseId: 'plank', sets: [set({ durationSec: 60 })] });
  expect(resolveLine(line('Фермерская прогулка', [set({ weightKg: 30, reps: 40 })]), candidates, types))
    .toMatchObject({ kind: 'new', name: 'Фермерская прогулка', inferred: { type: 'weight_reps' } });
  expect(resolveLine(line('присед', [set({ durationSec: 60 })]), candidates, types))
    .toEqual({ kind: 'error', error: { lineIndex: 0, rawText: 'присед', reason: 'repsExpected' } });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx jest src/domain/quickEntry/__tests__/resolveLine.test.ts`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать `inferExercise.ts` и `resolveLine.ts`**

Таблицы ключевых слов — массивы `{ pattern: RegExp; value }`, перебираемые по порядку. Имя нового упражнения: `name.trim()` с первой заглавной буквой.

- [ ] **Step 4: Убедиться, что проходят все тесты домена**

Run: `npx jest src/domain/quickEntry`
Expected: PASS.

- [ ] **Step 5: Коммит**

`npm run format`; предложить: `Связывание строки быстрой записи с упражнением и вывод типа нового упражнения`.

---

### Task 5: Применение записей к активной тренировке

**Files:**
- Create: `src/store/activeWorkoutQuickEntry.ts`
- Modify: `src/store/activeWorkout.ts` (интерфейс `ActiveWorkoutState`, экспорт `makeSet`/`makeSetsFromLastPerformance` или их перенос)
- Test: `src/store/__tests__/activeWorkoutQuickEntry.test.ts`

**Interfaces:**
- Consumes: `ActiveWorkout`, `ActiveExercise`, `ActiveSet`, `SetValues`, `SetType`, `EMPTY_SET_VALUES` из `@/domain/types`; `newId` из `@/domain/ids`.
- Produces:

```ts
// activeWorkoutQuickEntry.ts  (чистый модуль: без базы и без стора)
export interface QuickEntryCommit {
  exerciseId: string;
  /** Уже в кг и метрах; пустой список = «только название». */
  sets: Array<{ type: SetType } & SetValues>;
}
export interface QuickEntryOutcome {
  workout: ActiveWorkout;
  /** Карточки, которых коснулась запись, в порядке ввода, без повторов. */
  workoutExerciseIds: string[];
  addedSetCount: number;
}
export function applyQuickEntry(
  workout: ActiveWorkout,
  commits: QuickEntryCommit[],
  lastPerformanceByExerciseId: Map<string, { sets: SetValues[] }>,
  now: number,
): QuickEntryOutcome;

// activeWorkout.ts — новый метод стора
addQuickEntry: (commits: QuickEntryCommit[]) => Omit<QuickEntryOutcome, 'workout'> | null;
```

Правила (спека, раздел «Куда попадают данные»):
- Карточка ищется по `exerciseId` (первая найденная). Нет карточки и `sets` пуст → создаётся карточка как в `addExercises` (с пустыми подходами из прошлого выполнения через `makeSetsFromLastPerformance`). Нет карточки и `sets` не пуст → карточка без подходов, затем подходы.
- Подходы из записи по порядку занимают первые подходы карточки с `completed: false`: у такого подхода заменяются `type` и все поля `SetValues` (`rpe` берётся из записи — `null`), ставится `completed: true`, `completedAt: now`; `id` и `previous` сохраняются. Когда незавершённые кончились — новые подходы добавляются в конец: `id: newId()`, `previous: lastPerformance.sets[index] ?? null`, где `index` — позиция подхода в карточке.
- Значения из `previous` не подставляются.
- Два коммита с одним `exerciseId` работают с одной карточкой последовательно.
- `addedSetCount` — число подходов из записей (заполненных + добавленных); для «только название» — 0.
- Метод стора: берёт `getLastPerformances(exerciseIds)` для коммитов, вызывает `applyQuickEntry(workout, commits, …, Date.now())`, кладёт `workout` через `set`, возвращает остальное; при `workout === null` возвращает `null`.

- [ ] **Step 1: Написать падающие тесты**

```ts
import { applyQuickEntry } from '../activeWorkoutQuickEntry';

const values = (partial: Partial<SetValues> = {}): SetValues => ({ weightKg: null, reps: null, durationSec: null, distanceM: null, rpe: null, ...partial });
const plannedSet = (id: string, partial: Partial<ActiveSet> = {}): ActiveSet => ({ id, type: 'normal', completed: false, completedAt: null, previous: null, ...values(), ...partial });
const workoutWith = (exercises: ActiveExercise[]): ActiveWorkout => ({ id: 'w', name: 'Тренировка №1', startedAt: 0, routineId: null, notes: '', exercises });
const noHistory = new Map<string, { sets: SetValues[] }>();

test('новая карточка с выполненными подходами', () => {
  const outcome = applyQuickEntry(workoutWith([]), [{ exerciseId: 'squat', sets: [{ type: 'normal', ...values({ weightKg: 70, reps: 7 }) }, { type: 'normal', ...values({ weightKg: 70, reps: 6 }) }] }], noHistory, 1000);
  expect(outcome.workout.exercises).toHaveLength(1);
  expect(outcome.workout.exercises[0].sets.map((set) => [set.weightKg, set.reps, set.completed, set.completedAt])).toEqual([[70, 7, true, 1000], [70, 6, true, 1000]]);
  expect(outcome.addedSetCount).toBe(2);
  expect(outcome.workoutExerciseIds).toEqual([outcome.workout.exercises[0].id]);
});

test('заполняет запланированные пустые подходы на месте, лишние дописывает', () => {
  const previous = values({ weightKg: 65, reps: 8 });
  const card: ActiveExercise = { id: 'card', exerciseId: 'squat', supersetGroup: null, note: '', restSeconds: null,
    sets: [plannedSet('a', { completed: true, completedAt: 5, weightKg: 60, reps: 10 }), plannedSet('b', { previous }), plannedSet('c')] };
  const commits = [{ exerciseId: 'squat', sets: [7, 6, 5].map((reps) => ({ type: 'normal' as const, ...values({ weightKg: 70, reps }) })) }];
  const outcome = applyQuickEntry(workoutWith([card]), commits, new Map([['squat', { sets: [previous, previous, previous, values({ weightKg: 65, reps: 6 })] }]]), 1000);
  const sets = outcome.workout.exercises[0].sets;
  expect(sets.map((set) => set.id).slice(0, 3)).toEqual(['a', 'b', 'c']);
  expect(sets.map((set) => [set.weightKg, set.reps, set.completed])).toEqual([[60, 10, true], [70, 7, true], [70, 6, true], [70, 5, true]]);
  expect(sets[1].previous).toEqual(previous);
  expect(sets[3].previous).toEqual(values({ weightKg: 65, reps: 6 }));
  expect(outcome.addedSetCount).toBe(3);
});

test('две записи одного упражнения — одна карточка', () => {
  const commit = (reps: number) => ({ exerciseId: 'squat', sets: [{ type: 'normal' as const, ...values({ weightKg: 70, reps }) }] });
  const outcome = applyQuickEntry(workoutWith([]), [commit(7), commit(6)], noHistory, 1000);
  expect(outcome.workout.exercises).toHaveLength(1);
  expect(outcome.workout.exercises[0].sets.map((set) => set.reps)).toEqual([7, 6]);
  expect(outcome.workoutExerciseIds).toHaveLength(1);
});

test('только название — карточка с пустыми подходами из прошлого раза, ничего не выполнено', () => {
  const outcome = applyQuickEntry(workoutWith([]), [{ exerciseId: 'squat', sets: [] }], new Map([['squat', { sets: [values({ weightKg: 60, reps: 8 }), values({ weightKg: 60, reps: 8 })] }]]), 1000);
  expect(outcome.workout.exercises[0].sets.map((set) => [set.completed, set.previous?.weightKg])).toEqual([[false, 60], [false, 60]]);
  expect(outcome.addedSetCount).toBe(0);
});

test('тип подхода из записи сохраняется', () => {
  const outcome = applyQuickEntry(workoutWith([]), [{ exerciseId: 'squat', sets: [{ type: 'warmup', ...values({ weightKg: 40, reps: 10 }) }] }], noHistory, 1000);
  expect(outcome.workout.exercises[0].sets[0].type).toBe('warmup');
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx jest src/store/__tests__/activeWorkoutQuickEntry.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `applyQuickEntry` и подключить `addQuickEntry` в стор**

`makeSet` и `makeSetsFromLastPerformance` из `activeWorkout.ts` перенести в `activeWorkoutQuickEntry.ts`? — нет: вынести их в новый `src/store/activeWorkoutSets.ts` и импортировать из обоих файлов, чтобы `activeWorkoutQuickEntry.ts` не тянул стор (а значит, и базу) в тесты.

- [ ] **Step 4: Убедиться, что тесты проходят и типы сходятся**

Run: `npx jest src/store && npm run typecheck`
Expected: PASS, без ошибок типов.

- [ ] **Step 5: Коммит**

`npm run format`; предложить: `Добавление подходов из быстрой записи в активную тренировку`.

---

### Task 6: Две кнопки добавления и строки интерфейса

**Files:**
- Modify: `src/ui/Button.tsx` (`title?: string`; подпись не рисуется, если `title` пуст — иконка по центру), `src/i18n/ru.ts`, `src/i18n/en.ts` (раздел `workout`)
- Create: `src/features/workout/quickEntry/AddExerciseButtons.tsx`

**Interfaces:**
- Produces:

```tsx
interface AddExerciseButtonsProps {
  /** Жёлтые кнопки, пока в тренировке нет ни одного упражнения (как у текущей кнопки). */
  isPrimary: boolean;
  onPickFromList: () => void;
  onQuickEntry: () => void;
}
export function AddExerciseButtons(props: AddExerciseButtonsProps): JSX.Element;
```

Вёрстка: `View` с `flexDirection: 'row'`, `gap: spacing.sm`; каждая `Button` с `size="lg"`, `style={{ flex: 1 }}`, `variant` = `isPrimary ? 'primary' : 'secondary'`, без `title`; иконки `ListPlus` и `MessageSquarePlus` из `lucide-react-native` через `<Icon icon={…} size={22} color={isPrimary ? 'onAccent' : 'text'} strokeWidth={2.5} />`. `accessibilityLabel` — соответствующие переводы.

Новые ключи `workout.*` (ru / en):

| ключ | ru | en |
| --- | --- | --- |
| `quickEntryTitle` | Быстрая запись | Quick entry |
| `quickEntryPlaceholder` | Присед со штангой 70кг х 7/6/5 | Squat 70kg x 7/6/5 |
| `quickEntryHint` | Каждое упражнение с новой строки. Вес х повторы, подходы через / | One exercise per line. Weight x reps, sets separated by / |
| `quickEntryNewExercise` | Новое упражнение | New exercise |
| `quickEntryErrorMissingName` | Напишите название упражнения | Start with the exercise name |
| `quickEntryErrorUnexpected` | Не понял: «{{fragment}}» | Can't read: "{{fragment}}" |
| `quickEntryErrorRepsExpected` | У этого упражнения считаются повторы | This exercise counts reps |
| `quickEntryAdded_one/few/many/other` | Добавлено: {{name}} · {{count}} подход / подхода / подходов / подходов | `_one` Added: {{name}} · {{count}} set, `_other` … sets |
| `quickEntryAddedMany` | Добавлено: {{exercises}} · {{sets}} | Added: {{exercises}} · {{sets}} |
| `quickEntrySets_one/few/many/other` | {{count}} подход / подхода / подходов / подходов | set / sets |
| `quickEntryAddedNameOnly` | Добавлено: {{name}} | Added: {{name}} |
| `addExerciseFromList` | Из списка | From list |

Для «{{exercises}}» в `quickEntryAddedMany` используется уже существующий `home.exercisesCount` с `count`.

- [ ] **Step 1: Сделать `title` необязательным в `Button`**

В `Button.tsx`: `title?: string`; `<Text …>` рендерится только при `title`. Проверить, что в `styles.content` без подписи иконка остаётся по центру (`gap` не добавляет отступ одному ребёнку).

- [ ] **Step 2: Добавить ключи переводов в оба словаря**

- [ ] **Step 3: Создать `AddExerciseButtons.tsx`**

- [ ] **Step 4: Проверить типы и линтер**

Run: `npm run typecheck && npx eslint src/ui/Button.tsx src/features/workout/quickEntry src/i18n`
Expected: без ошибок.

- [ ] **Step 5: Коммит**

`npm run format`; предложить: `Две кнопки добавления упражнения: из списка и быстрая запись`.

---

### Task 7: Шторка быстрой записи с предпросмотром

**Files:**
- Create: `src/features/workout/quickEntry/useQuickEntry.ts`, `src/features/workout/quickEntry/QuickEntryPreview.tsx`, `src/features/workout/quickEntry/QuickEntrySheet.tsx`, `src/features/workout/quickEntry/commitQuickEntry.ts`

**Interfaces:**
- Consumes: `parseEntryText` (Задача 2); `prepareCandidates`, `ExerciseCandidate` (Задача 3); `resolveLine`, `ResolvedLine` (Задача 4); `QuickEntryCommit` (Задача 5); `listExercises`, `getExerciseUsage`, `createExercise`, `exerciseName` из `@/db/repo/exercises`; `useQuery` из `@/db/version`; `groupSets`, `formatGroup`, `ValueFormatters` из `@/domain/summary`; `formatWeight`, `formatDuration`, `formatDistance` из `@/domain/units`; `Sheet`, `Input`, `Button`, `Text`, `toast`, `useColors`, `spacing` из `@/ui`.
- Produces:

```ts
// useQuickEntry.ts
export interface PreviewLine {
  lineIndex: number;
  /** Название найденного или нового упражнения. */
  title: string;
  /** «70 кг × 7 / 6 / 5» или '' для «только название». */
  setsText: string;
  status: 'matched' | 'new' | 'error';
  /** Готовая подсказка об ошибке на языке интерфейса. */
  errorText?: string;
}
export interface QuickEntryState {
  previewLines: PreviewLine[];
  resolvedLines: ResolvedLine[];
  canSubmit: boolean; // есть хотя бы одна строка и ни одной ошибки
}
/** Кандидаты и их основы считаются один раз на открытие шторки (useMemo по списку упражнений). */
export function useQuickEntry(text: string, exerciseIdsInWorkout: string[]): QuickEntryState;

// commitQuickEntry.ts
/** Создаёт в базе упражнения для строк kind: 'new' и превращает все строки в коммиты для стора. */
export function commitQuickEntry(resolvedLines: ResolvedLine[]): QuickEntryCommit[];

// QuickEntrySheet.tsx
interface QuickEntrySheetProps {
  visible: boolean;
  onClose: () => void;
  /** Текст поля живёт в active.tsx и обнуляется при каждом открытии. */
  text: string;
  onTextChange: (text: string) => void;
  exerciseIdsInWorkout: string[];
  onSubmit: (commits: QuickEntryCommit[], previewLines: PreviewLine[]) => void;
}
export function QuickEntrySheet(props: QuickEntrySheetProps): JSX.Element;
```

Поведение:
- `useQuickEntry`: кандидаты — `listExercises()` (не архивные) → `ExerciseCandidate { names: [nameRu, nameEn], isCustom, usageCount: usage.get(id)?.count ?? 0, isInWorkout: exerciseIdsInWorkout.includes(id), order: index }`, через `useQuery` и `useMemo`; `typeByExerciseId` — `Map` из того же списка. Разбор: `parseEntryText(text, { weightUnit, distanceUnit })` из `useSettings`. Текст предпросмотра подходов — `groupSets` + `formatGroup` с форматтерами `formatWeight(kg, weightUnit)`, `formatDuration`, `formatDistance(m, distanceUnit)`; для «new» заголовок — `translate('workout.quickEntryNewExercise') + ': ' + name`. Для `matched` заголовок — `exerciseName(row, i18n.language)`.
- `QuickEntrySheet`: текст приходит через `text`/`onTextChange`; сброс делает `active.tsx` при открытии (`setState` в эффекте запрещён линтером). `Input` `multiline`, `autoFocus`, `placeholder = quickEntryPlaceholder`, `hint = quickEntryHint`, `autoCapitalize="sentences"`, `blurOnSubmit={false}`. Под ним `QuickEntryPreview`, затем `Button title=common.add size="lg" fullWidth disabled={!canSubmit}`. Нажатие: `onSubmit(commitQuickEntry(resolvedLines), previewLines)`.
- `QuickEntryPreview`: строка = `Text bodyMedium` заголовок + `Text caption muted` подходы; для ошибки — заголовок = исходный текст строки (`color="muted"`), подсказка `color="danger"`. Между строками `spacing.xs`. Пустой список — ничего.

- [ ] **Step 1: Реализовать `useQuickEntry.ts`**

- [ ] **Step 2: Реализовать `commitQuickEntry.ts`**

Для `kind: 'new'` — `createExercise({ name, muscleGroup, secondaryMuscles: [], equipment, type, description: '', restSeconds: null })` и взять `row.id`. Одинаковые новые названия в одном вводе (сравнение по `nameToStems(name).join(' ')`) создают одно упражнение. Подходы переводятся в `{ type, weightKg, reps, durationSec, distanceM, rpe: null }` — `weightSign` дальше не нужен.

- [ ] **Step 3: Реализовать `QuickEntryPreview.tsx` и `QuickEntrySheet.tsx`**

- [ ] **Step 4: Проверить типы и линтер**

Run: `npm run typecheck && npx eslint src/features/workout/quickEntry`
Expected: без ошибок.

- [ ] **Step 5: Коммит**

`npm run format`; предложить: `Шторка быстрой записи с живым предпросмотром`.

---

### Task 8: Подключение к экрану тренировки

**Files:**
- Modify: `src/app/workout/active.tsx` (тип `SheetState`, обработчик `toggleSet` строки ~129–140, блок кнопки ~388–399, список шторок внизу)

**Interfaces:**
- Consumes: `AddExerciseButtons` (Задача 6), `QuickEntrySheet`, `PreviewLine` (Задача 7), `useActiveWorkout.getState().addQuickEntry` (Задача 5).

Изменения:
1. В `SheetState` добавить `| { kind: 'quickEntry' }`; текст поля хранить в `active.tsx` как `quickEntryText` и обнулять при открытии.
2. Из `toggleSet` вынести `startRestAfterCompletedSet(workoutExerciseId: string)` (та же проверка `mode === 'new' && autoStartRest`, тот же `requestAnimationFrame`), и вызывать её из `toggleSet`.
3. Обработчик `submitQuickEntry(commits, previewLines)`: `const outcome = getWorkoutStore().addQuickEntry(commits)`; закрыть шторку; если `outcome?.addedSetCount > 0` — `startRestAfterCompletedSet(последний id из outcome.workoutExerciseIds)`; тост: одна карточка и подходы > 0 → `quickEntryAdded` с `name` = заголовок строки предпросмотра и `count`; одна карточка и 0 подходов → `quickEntryAddedNameOnly`; несколько карточек → `quickEntryAddedMany` с `exercises = translate('home.exercisesCount', { count })` и `sets = translate('workout.quickEntrySets', { count })`.
4. Заменить `<Button title=addExercise …>` на `<AddExerciseButtons isPrimary={hasNoExercises} onPickFromList={…тот же push…} onQuickEntry={() => { setQuickEntryText(''); setSheet({ kind: 'quickEntry' }); }} />`.
5. Добавить `<QuickEntrySheet visible={sheet.kind === 'quickEntry'} text={quickEntryText} onTextChange={setQuickEntryText} exerciseIdsInWorkout={exerciseIds} onSubmit={submitQuickEntry} />` рядом с остальными шторками.

- [ ] **Step 1: Внести изменения 1–5**

- [ ] **Step 2: Полная проверка**

Run: `npm run format && npm run typecheck && npm run lint && npm test`
Expected: всё зелёное. Затем запустить сабагент `i18n-check`.

- [ ] **Step 3: Проверка на телефоне через Metro**

Владелец запускает тренировку, жмёт правую кнопку, вводит `Присед со штангой 70кг х 7/6/5`, видит предпросмотр «Приседания со штангой · 70 кг × 7 / 6 / 5», жмёт «Добавить»: появляется карточка с тремя выполненными подходами, стартует таймер отдыха, виден тост. Затем вводит `Присед 70х5` — в ту же карточку добавляется четвёртый подход. Затем `Фермерская прогулка 30х40` — создаётся новое упражнение.

- [ ] **Step 4: Коммит**

Предложить: `Быстрая запись подходов текстом на экране тренировки`.
