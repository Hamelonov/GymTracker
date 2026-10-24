# План: дополнительные поля подхода (RIR, RPE, вес по желанию)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** кнопка «+» в заголовке карточки включает колонки RIR / RPE / вес для этого упражнения (с необязательным запоминанием), быстрая запись понимает `9(1)`, история показывает только непустые значения, глобальный переключатель RPE исчезает.

**Architecture:** новая колонка `sets.rir`, json-список включённых полей у `workout_exercises` и запомненных — у `exercises`; `ActiveExercise.extraFields` управляет колонками карточки вместо `showRpe`. Разбор `9(1)` — расширение токенизатора и парсера быстрой записи.

**Tech Stack:** TypeScript 6, React Native 0.88 / Expo 58, zustand 5, drizzle-orm + drizzle-kit (sqlite, driver expo), jest.

**Spec:** `docs/superpowers/specs/2026-10-24-extra-set-fields-design.md`

## Global Constraints

- Правила AGENTS.md: полные имена, комментарии на русском, файлы ≲ 250 строк (SetRow и ExerciseCard уже длиннее — не раздувать, выносить новое в отдельные файлы), нет вложенных тернарников.
- Новые строки интерфейса — в `workout` обоих словарей `src/i18n/ru.ts` и `src/i18n/en.ts`.
- Коммиты делает владелец; задача заканчивается `npm run format` и предложенным названием коммита.
- Перед финалом: `npm run format && npm run typecheck && npm run lint && npm test`.
- Миграция генерируется только командой `npm run db:generate`, файлы в `drizzle/` руками не править.

## Review Focus

1. Активная тренировка, сохранённая старой версией (без `extraFields`), после обновления открывается и не падает — тест на `normalizeActiveWorkout` в Задаче 4.
2. `8(1)о` и `8о(1)` дают один и тот же подход: отказ, 8 повторов, RIR 1 — тест в Задаче 3.
3. У подтягиваний без включённого поля «Вес» история не показывает вес; с полем и весом 10 — `+10 кг × 8` — проверка на телефоне в Задаче 6 (история без тестов).
4. Выключение поля RIR не стирает введённые значения — тест стора в Задаче 4 (`setExtraFields` меняет только список).
5. Быстрая запись `Подтягивания +10кг х 8` включает поле «Вес» на карточке — тест `commitQuickEntry`/`applyQuickEntry` в Задаче 3.

---

### Task 0: Убрать «объём» из интерфейса

Владелец (2026-10-24): «Убери из программы везде полностью "объём"». Колонка `workouts.volume_kg` и её
подсчёт в `saveWorkout` остаются (миграция на удаление колонки не стоит риска, данные никто не видит);
убирается всё, что видит пользователь, и тип рекорда `volume`.

**Files:** `src/app/(tabs)/profile.tsx` (плитка), `src/features/stats/StatsSummaryTiles.tsx` (плитка),
`src/features/stats/WeeklyChart.tsx` + `weeklyChartPoints.ts` (метрика `volume`),
`src/features/exercises/ExerciseChartsTab.tsx` (график `volume`), `src/domain/records.ts`
(`recordTypesForExercise` без `volume`; `setMetric` ветку оставить для старых строк), везде, где
перечисляются рекорды для показа — отфильтровать тип `volume` (`getRecordDetails`, `ExerciseRecordsTab`,
`TopRecordsCard`, `NewRecordsBlock`/`pickRecordMetric` уже не получат новых хитов), словари: удалить
`workout.volume`, `stats.volume`, `stats.totalVolume`, `exercise.chartVolume`, `exercise.bestVolume`;
`pr.volume` оставить (старые бейджи в истории).

- [ ] **Step 1:** правки по списку; `npm run typecheck` ловит остатки.
- [ ] **Step 2:** тест в `domain.test.ts`: `recordTypesForExercise('weight_reps')` → `['weight','one_rm','reps']`; `detectPersonalRecords` не возвращает хит типа `volume` (дописать к существующему тесту, если есть).
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm test`; коммит: `Убрать объём из статистики, графиков и рекордов`.

---

### Task 1: Данные — типы, схема, миграция, репозитории

**Files:**
- Modify: `src/domain/types.ts` (ExtraField, `SetValues.rir`, `EMPTY_SET_VALUES`, `ActiveExercise.extraFields`), `src/db/schema.ts`, `src/db/repo/workouts.ts`, `src/db/repo/exercises.ts`, `src/db/repo/backup.ts`, `src/db/repo/routines.ts`, `src/store/routineDraft.ts`, `src/app/workout/[id].tsx` (поле `rpe` в `previous`), всё, что покажет `tsc`.
- Create (генерация): `drizzle/0001_*.sql`, обновлённые `drizzle/migrations.js`, `drizzle/meta/*`.

**Interfaces:**
- Produces:

```ts
// src/domain/types.ts
export type ExtraField = 'weight' | 'rir' | 'rpe';
export const EXTRA_FIELDS: ExtraField[] = ['weight', 'rir', 'rpe']; // порядок колонок и пунктов меню
export interface SetValues { …; rpe: number | null; rir: number | null }
export interface ActiveExercise { …; extraFields: ExtraField[] }

// src/db/schema.ts
sets.rir: integer('rir')
workoutExercises.extraFields: text('extra_fields', { mode: 'json' }).$type<ExtraField[]>().notNull().default([])
exercises.rememberedExtraFields: text('remembered_extra_fields', { mode: 'json' }).$type<ExtraField[]>().notNull().default([])

// src/db/repo/exercises.ts
ExerciseInput.rememberedExtraFields?: ExtraField[]   // updateExercise пишет его, createExercise ставит []
```

- [ ] **Step 1: Добавить типы и колонки**, затем `npm run db:generate`. Expected: новый `drizzle/0001_*.sql` с тремя `ALTER TABLE … ADD`, `_journal.json` с двумя записями, `migrations.js` ссылается на оба файла.
- [ ] **Step 2: Пройти по ошибкам `npm run typecheck`**: везде, где собирается `SetValues`/подход, добавить `rir` (`saveWorkout` insert, `workoutToActiveWorkout`, `getLastPerformance(s)`, `routineDraft`, `[id].tsx` повтор тренировки, `commitQuickEntry.toCommitSets`, тесты `summary.test.ts`/`activeWorkoutQuickEntry.test.ts` хелперы); в `saveWorkout` писать `extraFields: workoutExercise.extraFields`, в `workoutToActiveWorkout` читать `extraFields: withFieldsThatHaveValues(workoutExercise.extraFields, sets, fields)` — чистая функция из `src/domain/extraFields.ts` (Задача 2; до неё — временно `workoutExercise.extraFields`): добавляет `rpe`, если у какого-то подхода `rpe != null`, `rir` — если `rir != null`, `weight` — если у типа нет поля веса, а `weightKg != null`. В CSV (`backup.ts`) колонка `rir` после `rpe`.
- [ ] **Step 3: Проверка**: `npm run typecheck && npm test` — зелёные. Старый тест `summary.test.ts` не меняет ожиданий.
- [ ] **Step 4: Коммит**: `Поле RIR и список дополнительных полей в базе и типах`.

---

### Task 2: Домен — `extraFields.ts` и «9(1)» в итогах

**Files:**
- Create: `src/domain/extraFields.ts`, `src/domain/__tests__/extraFields.test.ts`
- Modify: `src/domain/summary.ts` (`formatReps`), `src/domain/__tests__/summary.test.ts`

**Interfaces:**
```ts
// src/domain/extraFields.ts
/** Какие поля можно включить у упражнения: вес — только если его нет в основных полях. */
export function availableExtraFields(fields: SetFields): ExtraField[];
/** Включённые поля в порядке EXTRA_FIELDS, без дублей и без тех, что недоступны для fields. */
export function normalizeExtraFields(extraFields: readonly ExtraField[] | undefined, fields: SetFields): ExtraField[];
export function toggleExtraField(extraFields: readonly ExtraField[], field: ExtraField): ExtraField[];
/** Старые записи: поля, у которых есть значения, считаются включёнными. */
export function withFieldsThatHaveValues(extraFields: readonly ExtraField[], sets: readonly SetValues[], fields: SetFields): ExtraField[];
```
`formatReps` в `summary.ts`: `9(1)`, если `rir != null`. `groupSets`: группировать по весу любые подходы с `weightKg > 0`, не только при `fields.weight` (дополнительный вес у подтягиваний → `10 kg × 8/8`); тест: `bodyweight_reps`-поля, подходы `{weightKg: 10, reps: 8}, {10, 8}` → `'10 kg × 8 / 8'`, без веса — `'8 / 8'`.

- [ ] **Step 1: Тесты** (`extraFields.test.ts`): `withFieldsThatHaveValues([], [{rpe: 8, rir: null, weightKg: 10, …}], REPS)` → `['weight','rpe']`; `withFieldsThatHaveValues(['rir'], [{all null}], WEIGHT_REPS)` → `['rir']`; `availableExtraFields(WEIGHT_REPS)` → `['rir','rpe']`; `availableExtraFields(REPS)` → `['weight','rir','rpe']`; `normalizeExtraFields(['rpe','rir','rir'], WEIGHT_REPS)` → `['rir','rpe']`; `normalizeExtraFields(['weight'], WEIGHT_REPS)` → `[]`; `normalizeExtraFields(undefined, REPS)` → `[]`; `toggleExtraField(['rir'], 'rir')` → `[]`, `toggleExtraField([], 'rpe')` → `['rpe']`. В `summary.test.ts`: `formatSetsLine` для подходов `{weightKg:70, reps:9, rir:1}, {70, 8, rir:1}, {70, 8, rir:0}` → `'70 kg × 9(1) / 8(1) / 8(0)'`; без rir — как раньше.
- [ ] **Step 2: Убедиться, что падают** (`npx jest src/domain`).
- [ ] **Step 3: Реализовать.** `getSetFieldsForExerciseType` остаётся источником `fields`.
- [ ] **Step 4: Зелёные тесты, коммит**: `Порядок и доступность дополнительных полей, RIR в скобках в итогах`.

---

### Task 3: Быстрая запись — `9(1)` и включение полей

**Files:**
- Modify: `src/domain/quickEntry/tokenize.ts`, `parseLine.ts`, `types.ts` (`ParsedSet.rir`), `src/features/workout/quickEntry/commitQuickEntry.ts`, `src/store/activeWorkoutQuickEntry.ts` (`QuickEntryCommit.extraFields`), тесты `tokenize.test.ts`, `parseLine.test.ts`, `activeWorkoutQuickEntry.test.ts`.

**Interfaces:**
```ts
// tokenize.ts
| { kind: 'rir'; value: number }      // «(1)»: скобки с целым неотрицательным числом, пробел перед ними допустим
// parseLine.ts: после числа повторов — суффиксы setType и rir в любом порядке
// activeWorkoutQuickEntry.ts
export interface QuickEntryCommit { exerciseId: string; sets: …; /** Поля, которые надо включить на карточке. */ extraFields: ExtraField[] }
// applyQuickEntry: карточка получает extraFields = normalize([...card.extraFields, ...commit.extraFields]) — порядок EXTRA_FIELDS, без дублей (normalizeExtraFields требует fields — здесь тип неизвестен, поэтому объединять через EXTRA_FIELDS.filter(includes)).
// commitQuickEntry.ts: extraFields = ['rir' если есть set.rir] + ['weight' если есть set.weightKg и у типа упражнения нет поля веса]; тип берётся из typeByExerciseId для matched и из inferred для new — значит resolveLine должен класть exerciseType в ResolvedLine 'matched' (добавить поле `exerciseType`).
```

- [ ] **Step 1: Тесты.** tokenize: `'9(1)/8(1)/8(0)'` → number 9, rir 1, slash, number 8, rir 1, slash, number 8, rir 0; `'9 (1)'` → number, rir; `'8(1)о'` → number, rir, setType; `'8о(1)'` → number, setType, rir; `'(abc)'` → без токена rir (скобки пропускаются, слово `abc`). parseLine: `'Присед 70х9(1)/8(1)/8(0)'` → три подхода weightKg 70, reps 9/8/8, rir 1/1/0; `'Жим 60х8(1)о'` и `'Жим 60х8о(1)'` → одинаковый `{ type: 'failure', reps: 8, rir: 1 }`; `'Присед 70кг 3 по 8(2)'` → три подхода rir 2; `'Присед 70х8(-1)'` → ошибка `unexpectedText` с fragment `'(-1)'`. applyQuickEntry: коммит с `extraFields: ['rir']` на карточку с `extraFields: ['rpe']` → `['rir','rpe']`; с `['weight']` на новую карточку → `['weight']`. commitQuickEntry без теста (база); логику выбора полей вынести в чистую `extraFieldsForSets(sets: ParsedSet[], exerciseType: ExerciseType): ExtraField[]` в `src/domain/quickEntry/extraFieldsForSets.ts` и покрыть тестом: `[{reps 8, rir 1}]`, `'weight_reps'` → `['rir']`; `[{weightKg 10, weightSign 'extra', reps 8}]`, `'bodyweight_reps'` → `['weight']`; `[{weightKg 70, reps 8}]`, `'weight_reps'` → `[]`.
- [ ] **Step 2: Убедиться, что падают.**
- [ ] **Step 3: Реализовать.**
- [ ] **Step 4: `npx jest src/domain src/store` зелёные; коммит**: `Быстрая запись понимает RIR в скобках и включает нужные поля карточки`.

---

### Task 4: Стор — `extraFields` на карточке и запоминание

**Files:**
- Modify: `src/store/activeWorkout.ts`, `src/store/activeWorkoutSets.ts` (если нужно), `src/store/__tests__/activeWorkoutQuickEntry.test.ts` (хелперы), Create: `src/store/normalizeActiveWorkout.ts` + `src/store/__tests__/normalizeActiveWorkout.test.ts`.

**Interfaces:**
```ts
// normalizeActiveWorkout.ts — чистая
/** Дополняет тренировку из старого хранилища полями, которых тогда не было (extraFields, rir). */
export function normalizeActiveWorkout(workout: ActiveWorkout | null): ActiveWorkout | null;
// activeWorkout.ts
setExtraFields: (workoutExerciseId: string, extraFields: ExtraField[]) => void;
// addExercises / replaceExercise / startFromRoutine: extraFields = rememberedExtraFields упражнения (getExercisesByIds)
// persist: merge: (persisted, current) => ({ ...current, ...persisted, workout: normalizeActiveWorkout(persisted.workout) })
```

- [ ] **Step 1: Тест** `normalizeActiveWorkout`: тренировка с упражнением без `extraFields` и подходом без `rir` → `extraFields: []`, `rir: null`, остальное без изменений; `null` → `null`.
- [ ] **Step 2: Падает → реализовать → зелёный.**
- [ ] **Step 3: `setExtraFields` и чтение `rememberedExtraFields` при добавлении.** Проверка типами.
- [ ] **Step 4: Коммит**: `Дополнительные поля карточки в сторе активной тренировки и запоминание у упражнения`.

---

### Task 5: Интерфейс — кнопка «+», шторка, колонки, история, настройки

**Files:**
- Create: `src/features/workout/sheets/ExtraFieldsSheet.tsx`
- Modify: `src/features/workout/ExerciseCard.tsx` (кнопка `Plus` первой в `headerActions`, колонки по `extraFields`, пропс `showRpe` удалён), `src/features/workout/SetRow.tsx` (пропс `extraFields: ExtraField[]`; поле веса показывается при `fields.weight || extraFields.includes('weight')`; поля RIR (целое 0–10) и RPE по списку), `src/features/routines/RoutineExerciseEditor.tsx` (убрать `showRpe={false}`), `src/app/workout/active.tsx` (`SheetState` + `{ kind: 'extraFields'; workoutExerciseId }`, `onExtraFieldsPress`, обработчики), `src/features/workout/format.ts` (новая `formatSetLineWithExtras(set, fields, units): string` — `formatSetValues` + вес при `!fields.weight && weightKg != null` как `+10 кг × 8`, ` · RIR 1`, ` · @8.5`), `src/app/workout/[id].tsx` и `src/features/exercises/ExerciseHistoryTab.tsx` (оба используют её), `src/features/routines/RoutineExerciseEditor.tsx` (`extraFields={[]}`, без кнопки «+»: пропс `onExtraFieldsPress` необязателен), стили колонок RIR/RPE `flex: 0.75` в `SetRow` и заголовке `ExerciseCard`, `src/features/workout/quickEntry/useQuickEntry.ts` (`rir` в подходах предпросмотра), `src/app/settings/index.tsx` и `src/store/settings.ts` (удалить `showRpe`), `src/i18n/ru.ts`, `src/i18n/en.ts`.

**ExtraFieldsSheet props:**
```ts
interface ExtraFieldsSheetProps {
  visible: boolean;
  onClose: () => void;
  workoutExercise: ActiveExercise | undefined;
  exerciseDetails: ExerciseRow | undefined;
  weightUnit: WeightUnit;
  onToggleField: (workoutExerciseId: string, field: ExtraField) => void;
  onRememberChange: (exerciseId: string, remember: boolean) => void;
}
```
Содержимое: по строке `SettingSwitchRow`-подобной (`src/features/settings/SettingSwitchRow.tsx`, проверить переиспользуемость; иначе `ListItem` + `Switch`) на каждое поле из `availableExtraFields(fields)`; разделитель; строка «Запоминать для этого упражнения» со значением `exerciseDetails.rememberedExtraFields.length > 0`. Обработчик в `active.tsx`: `toggleExtraField` → `setExtraFields`; если запоминание включено — `updateExercise(exerciseId, { rememberedExtraFields: новыйСписок })`. `onRememberChange(true)` → записать текущий список; `(false)` → `[]`.

Ключи `workout.*`: `extraFieldsTitle` «Дополнительные поля» / «Extra fields»; `extraFieldWeight` «Вес, {{unit}}» / «Weight, {{unit}}»; `extraFieldRir` «RIR (повторы в запасе)» / «RIR (reps in reserve)»; `extraFieldRpe` «RPE (усилие 1–10)» / «RPE (effort 1–10)»; `rememberExtraFields` «Запоминать для этого упражнения» / «Remember for this exercise»; `rememberExtraFieldsHint` «Эти поля будут включаться в каждой тренировке» / «These fields will be on in every workout»; `rir` «RIR». Удалить `settings.showRpe` (и `showRpeHint`, если есть).

- [ ] **Step 1: SetRow и ExerciseCard** на `extraFields`; `npm run typecheck` покажет все места с `showRpe`.
- [ ] **Step 2: ExtraFieldsSheet + подключение в active.tsx.**
- [ ] **Step 3: История `[id].tsx`, настройки, словари.**
- [ ] **Step 4: `npm run format && npm run typecheck && npm run lint && npm test`.**
- [ ] **Step 5: Коммит**: `Кнопка «+» на карточке: RIR, RPE и вес по желанию, запоминание для упражнения`.

---

### Task 6: Проверка на телефоне (владелец)

- Обновлённое приложение открывает старую активную тренировку (если была) без падения; миграция проходит на существующей базе.
- «+» на карточке → включить RIR → колонка появилась, значения вводятся, после завершения тренировки в истории видно `RIR 1` только там, где заполнено.
- Подтягивания: «+» → «Вес» → колонка веса; в истории `+10 кг × 8`.
- Быстрая запись `Присед 70х9(1)/8(1)/8(0)` → карточка с RIR и заполненными значениями.
- Запоминание: включить для приседа, начать новую тренировку, добавить присед — колонка RIR уже есть.
