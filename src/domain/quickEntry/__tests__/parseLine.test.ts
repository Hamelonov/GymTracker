import { parseEntryText, parseLine } from '../parseLine';
import type { ParseOptions, ParsedSet } from '../types';

const options: ParseOptions = { weightUnit: 'kg', distanceUnit: 'km' };

const set = (partial: Partial<ParsedSet>): ParsedSet => ({
  type: 'normal',
  weightKg: null,
  weightSign: null,
  reps: null,
  durationSec: null,
  distanceM: null,
  rir: null,
  ...partial,
});

/** Подходы успешно разобранной строки; падает, если строка не разобралась. */
function setsOf(text: string, parseOptions = options): ParsedSet[] {
  const result = parseLine(text, 0, parseOptions);
  if (!result.ok) throw new Error(`Строка не разобралась: ${result.error.reason}`);
  return result.line.sets;
}

test('три подхода одним весом', () => {
  expect(parseLine('Присед со штангой 70кг х 7/6/5', 0, options)).toEqual({
    ok: true,
    line: {
      lineIndex: 0,
      rawText: 'Присед со штангой 70кг х 7/6/5',
      name: 'Присед со штангой',
      sets: [set({ weightKg: 70, reps: 7 }), set({ weightKg: 70, reps: 6 }), set({ weightKg: 70, reps: 5 })],
    },
  });
});

test('группы с разным весом и наследование веса', () => {
  expect(setsOf('Присед 70х7/6, 80х5, 4')).toEqual([
    set({ weightKg: 70, reps: 7 }),
    set({ weightKg: 70, reps: 6 }),
    set({ weightKg: 80, reps: 5 }),
    set({ weightKg: 80, reps: 4 }),
  ]);
});

test('«3 по 7», типы подходов, фунты', () => {
  expect(setsOf('Присед 70кг 3 по 7')).toEqual([
    set({ weightKg: 70, reps: 7 }),
    set({ weightKg: 70, reps: 7 }),
    set({ weightKg: 70, reps: 7 }),
  ]);
  expect(setsOf('Жим 60х7р/7/5о').map((parsedSet) => parsedSet.type)).toEqual([
    'warmup',
    'normal',
    'failure',
  ]);
  expect(setsOf('Bench 100lb x 5')[0]?.weightKg).toBeCloseTo(45.36, 1);
  expect(setsOf('Bench 100 x 5', { weightUnit: 'lb', distanceUnit: 'mi' })[0]?.weightKg).toBeCloseTo(
    45.36,
    1,
  );
});

test('только повторы, доп. вес и помощь', () => {
  expect(setsOf('Подтягивания 12/10/8')).toEqual([set({ reps: 12 }), set({ reps: 10 }), set({ reps: 8 })]);
  expect(setsOf('Подтягивания +10кг х 8')[0]).toEqual(set({ weightKg: 10, weightSign: 'extra', reps: 8 }));
  expect(setsOf('Подтягивания -20 х 8')[0]).toEqual(set({ weightKg: 20, weightSign: 'assist', reps: 8 }));
});

test('время и дистанция', () => {
  expect(setsOf('Планка 1:00/0:45')).toEqual([set({ durationSec: 60 }), set({ durationSec: 45 })]);
  expect(setsOf('Бег 5км 25:00')).toEqual([set({ distanceM: 5000, durationSec: 1500 })]);
  expect(setsOf('Бег 1км 5:00 / 1км 4:50')).toEqual([
    set({ distanceM: 1000, durationSec: 300 }),
    set({ distanceM: 1000, durationSec: 290 }),
  ]);
  expect(setsOf('Велосипед 20 мин')).toEqual([set({ durationSec: 1200 })]);
  expect(setsOf('Планка 1ч20м')).toEqual([set({ durationSec: 4800 })]);
  expect(setsOf('Run 3mi')[0]?.distanceM).toBeCloseTo(4828, 0);
});

test('два числа без х: вес и повторы; название с цифрой внутри слова', () => {
  expect(setsOf('Присед 70 7')).toEqual([set({ weightKg: 70, reps: 7 })]);
  const tBar = parseLine('Тяга Т-грифа 60х10', 0, options);
  expect(tBar.ok && tBar.line.name).toBe('Тяга Т-грифа');
});

test('только название — пустой список подходов', () => {
  expect(parseLine('Присед', 0, options)).toEqual({
    ok: true,
    line: { lineIndex: 0, rawText: 'Присед', name: 'Присед', sets: [] },
  });
});

test('ошибки', () => {
  expect(parseLine('70х7', 0, options)).toEqual({
    ok: false,
    error: { lineIndex: 0, rawText: '70х7', reason: 'missingName' },
  });
  expect(parseLine('Присед 70х7 ура', 0, options)).toEqual({
    ok: false,
    error: { lineIndex: 0, rawText: 'Присед 70х7 ура', reason: 'unexpectedText', fragment: 'ура' },
  });
});

test('несколько строк, пустые пропускаются', () => {
  const results = parseEntryText('Присед 70х7\n\nЖим 60х8', options);
  expect(results.map((result) => result.ok && result.line.name)).toEqual(['Присед', 'Жим']);
  expect(results.map((result) => result.ok && result.line.lineIndex)).toEqual([0, 2]);
});

test('группы через запятую без пробела', () => {
  expect(setsOf('Жим 60х8,70х6')).toEqual([set({ weightKg: 60, reps: 8 }), set({ weightKg: 70, reps: 6 })]);
  expect(setsOf('Присед 70кг 3по7')).toHaveLength(3);
  expect(setsOf('Присед 70кгх7')).toEqual([set({ weightKg: 70, reps: 7 })]);
});

test('повторы — только целое число больше нуля', () => {
  expect(parseLine('Жим 60х8.5', 0, options)).toEqual({
    ok: false,
    error: { lineIndex: 0, rawText: 'Жим 60х8.5', reason: 'unexpectedText', fragment: '8.5' },
  });
  expect(parseLine('Присед 0', 0, options)).toEqual({
    ok: false,
    error: { lineIndex: 0, rawText: 'Присед 0', reason: 'unexpectedText', fragment: '0' },
  });
});

test('RIR в скобках', () => {
  expect(setsOf('Присед 70х9(1)/8(1)/8(0)')).toEqual([
    set({ weightKg: 70, reps: 9, rir: 1 }),
    set({ weightKg: 70, reps: 8, rir: 1 }),
    set({ weightKg: 70, reps: 8, rir: 0 }),
  ]);
  const failureFirst = setsOf('Жим 60х8о(1)');
  const rirFirst = setsOf('Жим 60х8(1)о');
  expect(failureFirst).toEqual([set({ weightKg: 60, reps: 8, rir: 1, type: 'failure' })]);
  expect(rirFirst).toEqual(failureFirst);
  expect(setsOf('Присед 70кг 3 по 8(2)').map((parsedSet) => parsedSet.rir)).toEqual([2, 2, 2]);
  expect(parseLine('Присед 70х8(-1)', 0, options)).toEqual({
    ok: false,
    error: { lineIndex: 0, rawText: 'Присед 70х8(-1)', reason: 'unexpectedText', fragment: '(-1)' },
  });
});

test('RIR больше 10 — ошибка разбора', () => {
  expect(parseLine('Присед 70х8(15)', 0, options)).toEqual({
    ok: false,
    error: { lineIndex: 0, rawText: 'Присед 70х8(15)', reason: 'unexpectedText', fragment: '(15)' },
  });
});
