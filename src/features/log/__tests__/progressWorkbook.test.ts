import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import type { SetRow } from '@/db/schema';
import type { XlsxRow } from '@/domain/xlsx/types';
import { buildProgressWorkbook } from '../progressWorkbook';

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

const entry = (startedAt: Date, sets: SetRow[], note = ''): ExerciseHistoryEntry => ({
  workoutId: `workout-${startedAt.getTime()}`,
  workoutName: 'Тренировка',
  startedAt: startedAt.getTime(),
  note,
  sets,
});

const options = {
  weightUnit: 'kg' as const,
  distanceUnit: 'km' as const,
  language: 'ru',
  translate: (key: string) => key,
};

const values = (row: XlsxRow | undefined) => row?.cells.map((cell) => cell.value);

test('лист упражнения повторяет журнал: строка на каждый вес, RIR и примечание в первой строке дня', () => {
  const workbook = buildProgressWorkbook(
    [
      {
        name: 'Приседания со штангой',
        exerciseType: 'weight_reps',
        // Журнал отдаёт тренировки от новых к старым, в файле они идут от старых к новым.
        entries: [
          entry(
            new Date(2026, 9, 27),
            [
              set({ weightKg: 70, reps: 9, rir: 0 }),
              set({ weightKg: 70, reps: 9, rir: 1 }),
              set({ weightKg: 70, reps: 8, rir: 1 }),
            ],
            'Прогресс!',
          ),
          entry(
            new Date(2026, 9, 25),
            [
              set({ weightKg: 70, reps: 9, rir: 0 }),
              set({ weightKg: 70, reps: 8, rir: 1 }),
              set({ weightKg: 65, reps: 10, rir: 1 }),
            ],
            'Было тяжело',
          ),
        ],
      },
    ],
    options,
  );

  const sheet = workbook.sheets[0];
  expect(sheet?.name).toBe('Приседания со штангой');
  // RPE нигде не записан, поэтому его колонки нет: шесть колонок, заголовок объединён на все.
  expect(sheet?.merges).toEqual(['A1:F1']);
  expect(values(sheet?.rows[0])?.[0]).toBe('Приседания со штангой');
  expect(values(sheet?.rows[1])).toEqual([
    'log.columnDay',
    'log.columnWeight',
    null,
    'log.columnSets',
    'workout.rir',
    'log.columnNote',
  ]);
  expect(sheet?.rows.slice(2).map(values)).toEqual([
    [46320, 70, 'х', '9/8', '0/1/1', 'Было тяжело'],
    [null, 65, 'х', '10', null, null],
    [46322, 70, 'х', '9/9/8', '0/1/1', 'Прогресс!'],
  ]);
  expect(sheet?.rows[2]?.cells[1]?.style?.numberFormat).toBe('General"кг"');
  expect(sheet?.rows[2]?.cells[0]?.style?.borderTopColor).toBeDefined();
  expect(sheet?.rows[3]?.cells[0]?.style?.borderTopColor).toBeUndefined();
});

test('подтягивания без отягощения: колонок веса нет, с отягощением вес со знаком «+»', () => {
  const workbook = buildProgressWorkbook(
    [
      {
        name: 'Подтягивания',
        exerciseType: 'bodyweight_reps',
        entries: [entry(new Date(2026, 9, 25), [set({ reps: 10 }), set({ reps: 8 })])],
      },
      {
        name: 'Отжимания',
        exerciseType: 'weighted_bodyweight',
        entries: [entry(new Date(2026, 9, 25), [set({ weightKg: 10, reps: 8 })])],
      },
    ],
    options,
  );
  expect(values(workbook.sheets[0]?.rows[1])).toEqual(['log.columnDay', 'log.columnSets', 'log.columnNote']);
  expect(values(workbook.sheets[0]?.rows[2])).toEqual([46320, '10/8', null]);
  expect(workbook.sheets[1]?.rows[2]?.cells[1]?.style?.numberFormat).toBe('"+"General"кг"');
});
