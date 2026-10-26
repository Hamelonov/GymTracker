import { strToU8, zipSync } from 'fflate';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import type { SetRow } from '@/db/schema';
import { buildXlsx } from '@/domain/xlsx/buildXlsx';
import { readXlsx } from '@/domain/xlsx/readXlsx';
import { buildProgressWorkbook } from '../progressWorkbook';
import { parseProgressWorkbook, type ProgressHeaderAliases } from '../progressWorkbookImport';

const RU_LABELS: Record<string, string> = {
  'log.columnDay': 'Дата',
  'log.columnWeight': 'Вес',
  'log.columnVariation': 'Усложнение',
  'log.columnSets': 'Подходы',
  'log.columnNote': 'Примечание',
  'workout.rir': 'RIR',
  'workout.rpe': 'RPE',
};
const aliases: ProgressHeaderAliases = {
  day: ['Дата', 'Date'],
  weight: ['Вес', 'Усложнение', 'Weight', 'Added weight'],
  sets: ['Подходы', 'Sets'],
  rir: ['RIR'],
  rpe: ['RPE'],
  note: ['Примечание', 'Note'],
};
const importOptions = {
  aliases,
  weightUnit: 'kg' as const,
  distanceUnit: 'km' as const,
  workoutTitle: 'Тренировка',
};

let nextId = 0;
const set = (partial: Partial<SetRow>): SetRow => ({
  id: `set-${(nextId += 1)}`,
  workoutExerciseId: 'card',
  position: nextId,
  type: 'normal',
  weightKg: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rpe: null,
  rir: null,
  completed: true,
  completedAt: 1,
  prTypes: [],
  ...partial,
});
const entry = (day: number, sets: SetRow[], note = ''): ExerciseHistoryEntry => ({
  workoutId: `w-${day}`,
  workoutName: '',
  startedAt: new Date(2026, 9, day, 18, 30).getTime(),
  note,
  sets,
});
const noon = (day: number) => new Date(2026, 9, day, 12).getTime();

test('выгрузка в XLSX и импорт обратно возвращают те же подходы, по тренировке на день', () => {
  const bytes = buildXlsx(
    buildProgressWorkbook(
      [
        {
          name: 'Приседания со штангой',
          exerciseType: 'weight_reps',
          entries: [
            entry(
              25,
              [
                set({ weightKg: 70, reps: 9, rir: 0 }),
                set({ weightKg: 70, reps: 8, rir: 1, rpe: 9 }),
                set({ weightKg: 67.5, reps: 10, rir: 1, type: 'failure' }),
              ],
              'Было тяжело',
            ),
            entry(22, [set({ weightKg: 20, reps: 12, type: 'warmup' }), set({ weightKg: 65, reps: 9 })]),
          ],
        },
        {
          name: 'Подтягивания',
          exerciseType: 'bodyweight_reps',
          entries: [entry(25, [set({ reps: 10 }), set({ weightKg: 10, reps: 6 })])],
        },
        {
          name: 'Планка',
          exerciseType: 'duration',
          entries: [entry(22, [set({ durationSec: 60 }), set({ durationSec: 45 })])],
        },
      ],
      { weightUnit: 'kg', distanceUnit: 'km', language: 'ru', translate: (key) => RU_LABELS[key] ?? key },
    ),
  );

  const result = parseProgressWorkbook(readXlsx(bytes), importOptions);
  expect(result.skippedRowCount).toBe(0);
  expect(result.workouts.map((workout) => workout.startedAt)).toEqual([noon(22), noon(25)]);

  const [firstDay, secondDay] = result.workouts;
  expect(firstDay?.exercises.map((exercise) => exercise.title)).toEqual(['Приседания со штангой', 'Планка']);
  expect(
    firstDay?.exercises[0]?.sets.map((importedSet) => [
      importedSet.type,
      importedSet.weightKg,
      importedSet.reps,
    ]),
  ).toEqual([
    ['warmup', 20, 12],
    ['normal', 65, 9],
  ]);
  expect(firstDay?.exercises[1]?.sets.map((importedSet) => importedSet.durationSec)).toEqual([60, 45]);

  const squat = secondDay?.exercises[0];
  expect(squat?.note).toBe('Было тяжело');
  expect(squat?.sets).toEqual([
    { type: 'normal', weightKg: 70, reps: 9, durationSec: null, distanceM: null, rpe: null, rir: 0 },
    { type: 'normal', weightKg: 70, reps: 8, durationSec: null, distanceM: null, rpe: 9, rir: 1 },
    { type: 'failure', weightKg: 67.5, reps: 10, durationSec: null, distanceM: null, rpe: null, rir: 1 },
  ]);
  const pullUps = secondDay?.exercises[1];
  expect(pullUps?.sets.map((importedSet) => [importedSet.weightKg, importedSet.reps])).toEqual([
    [null, 10],
    [10, 6],
  ]);
});

test('файл, пересохранённый в Excel: текст в общей таблице строк, вес текстом с запятой', () => {
  const sharedStrings = [
    'Жим лёжа',
    'Дата',
    'Вес',
    'Подходы',
    'Примечание',
    '67,5кг',
    '8/8о',
    'Тяжело &amp; долго',
  ];
  const xml = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>${body}`;
  const bytes = zipSync({
    'xl/workbook.xml': strToU8(
      xml('<workbook xmlns:r="r"><sheets><sheet r:id="rId3" sheetId="1" name="Жим"/></sheets></workbook>'),
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      xml(
        '<Relationships><Relationship Target="/xl/worksheets/sheet7.xml" Id="rId3" Type="ws"/></Relationships>',
      ),
    ),
    'xl/sharedStrings.xml': strToU8(
      xml(
        `<sst>${sharedStrings.map((text) => `<si><r><t xml:space="preserve">${text}</t></r></si>`).join('')}</sst>`,
      ),
    ),
    'xl/worksheets/sheet7.xml': strToU8(
      xml(
        '<worksheet><sheetData>' +
          '<row r="1"><c r="A1" t="s"><v>0</v></c></row>' +
          '<row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2" t="s"><v>2</v></c><c r="D2" t="s"><v>3</v></c><c r="E2" t="s"><v>4</v></c></row>' +
          '<row r="3" spans="1:5"><c r="A3" s="4"><v>46320</v></c><c r="B3" t="s"><v>5</v></c><c r="C3" s="2"/><c r="D3" t="s"><v>6</v></c><c r="E3" t="s"><v>7</v></c></row>' +
          '<row r="4"/>' +
          '</sheetData></worksheet>',
      ),
    ),
  });

  const sheets = readXlsx(bytes);
  expect(sheets[0]?.name).toBe('Жим');
  const result = parseProgressWorkbook(sheets, importOptions);
  expect(result.workouts).toHaveLength(1);
  expect(result.workouts[0]?.startedAt).toBe(noon(25));
  expect(result.workouts[0]?.exercises[0]).toMatchObject({ title: 'Жим лёжа', note: 'Тяжело & долго' });
  expect(
    result.workouts[0]?.exercises[0]?.sets.map((importedSet) => [
      importedSet.weightKg,
      importedSet.reps,
      importedSet.type,
    ]),
  ).toEqual([
    [67.5, 8, 'normal'],
    [67.5, 8, 'failure'],
  ]);
});

test('лист без шапки журнала пропускается', () => {
  const bytes = buildXlsx({
    sheets: [
      { name: 'Список покупок', columnWidths: [], rows: [{ cells: [{ value: 'Хлеб' }, { value: 50 }] }] },
    ],
  });
  expect(parseProgressWorkbook(readXlsx(bytes), importOptions).workouts).toEqual([]);
});
