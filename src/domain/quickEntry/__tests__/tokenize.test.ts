import { tokenize } from '../tokenize';

test('вес, х и повторы через слэш', () => {
  expect(tokenize('Присед со штангой 70кг х 7/6/5')).toMatchObject([
    { kind: 'word', text: 'присед' },
    { kind: 'word', text: 'со' },
    { kind: 'word', text: 'штангой' },
    { kind: 'number', value: 70 },
    { kind: 'weightUnit', unit: 'kg' },
    { kind: 'times' },
    { kind: 'number', value: 7 },
    { kind: 'slash' },
    { kind: 'number', value: 6 },
    { kind: 'slash' },
    { kind: 'number', value: 5 },
  ]);
});

test('приклеенный х и латинский x', () => {
  expect(tokenize('70х7')).toMatchObject([
    { kind: 'number', value: 70 },
    { kind: 'times' },
    { kind: 'number', value: 7 },
  ]);
  expect(tokenize('70 X 7')).toMatchObject([
    { kind: 'number', value: 70 },
    { kind: 'times' },
    { kind: 'number', value: 7 },
  ]);
});

test('десятичная запятая только у веса', () => {
  expect(tokenize('72,5кг х 5')).toMatchObject([
    { kind: 'number', value: 72.5 },
    { kind: 'weightUnit', unit: 'kg' },
    { kind: 'times' },
    { kind: 'number', value: 5 },
  ]);
  expect(tokenize('70х7,6')).toMatchObject([
    { kind: 'number', value: 70 },
    { kind: 'times' },
    { kind: 'number', value: 7 },
    { kind: 'comma' },
    { kind: 'number', value: 6 },
  ]);
});

test('суффиксы типа подхода', () => {
  expect(tokenize('7р/7/5о')).toMatchObject([
    { kind: 'number', value: 7 },
    { kind: 'setType', type: 'warmup' },
    { kind: 'slash' },
    { kind: 'number', value: 7 },
    { kind: 'slash' },
    { kind: 'number', value: 5 },
    { kind: 'setType', type: 'failure' },
  ]);
});

test('время и дистанция', () => {
  expect(tokenize('1:00/0:45')).toMatchObject([
    { kind: 'clock', seconds: 60 },
    { kind: 'slash' },
    { kind: 'clock', seconds: 45 },
  ]);
  expect(tokenize('5км 25:00')).toMatchObject([
    { kind: 'number', value: 5 },
    { kind: 'distanceUnit', unit: 'km' },
    { kind: 'clock', seconds: 1500 },
  ]);
  expect(tokenize('1ч20м')).toMatchObject([
    { kind: 'number', value: 1 },
    { kind: 'timeUnit', unit: 'hour' },
    { kind: 'number', value: 20 },
    { kind: 'timeUnit', unit: 'min' },
  ]);
  expect(tokenize('500м')).toMatchObject([
    { kind: 'number', value: 500 },
    { kind: 'distanceUnit', unit: 'm' },
  ]);
  expect(tokenize('45 сек')).toMatchObject([
    { kind: 'number', value: 45 },
    { kind: 'timeUnit', unit: 'sec' },
  ]);
});

test('знак, «по» и дефис в слове', () => {
  expect(tokenize('+10кг х 8')).toMatchObject([
    { kind: 'sign', sign: 'plus' },
    { kind: 'number', value: 10 },
    { kind: 'weightUnit', unit: 'kg' },
    { kind: 'times' },
    { kind: 'number', value: 8 },
  ]);
  expect(tokenize('3 по 7')).toMatchObject([
    { kind: 'number', value: 3 },
    { kind: 'per' },
    { kind: 'number', value: 7 },
  ]);
  expect(tokenize('Тяга Т-грифа')).toMatchObject([
    { kind: 'word', text: 'тяга' },
    { kind: 'word', text: 'т-грифа' },
  ]);
});

test('у каждого токена есть позиция в исходной строке', () => {
  expect(tokenize('Присед 70х7').map((token) => token.start)).toEqual([0, 7, 9, 10]);
});

test('запятая после слэша или х разделяет группы, а не дробь', () => {
  expect(tokenize('70х7/6,80х5')).toMatchObject([
    { kind: 'number', value: 70 },
    { kind: 'times' },
    { kind: 'number', value: 7 },
    { kind: 'slash' },
    { kind: 'number', value: 6 },
    { kind: 'comma' },
    { kind: 'number', value: 80 },
    { kind: 'times' },
    { kind: 'number', value: 5 },
  ]);
  expect(tokenize('60х8,70х6')).toMatchObject([
    { kind: 'number', value: 60 },
    { kind: 'times' },
    { kind: 'number', value: 8 },
    { kind: 'comma' },
    { kind: 'number', value: 70 },
    { kind: 'times' },
    { kind: 'number', value: 6 },
  ]);
  expect(tokenize('70х7/6, 72,5х5')).toMatchObject([
    { kind: 'number', value: 70 },
    { kind: 'times' },
    { kind: 'number', value: 7 },
    { kind: 'slash' },
    { kind: 'number', value: 6 },
    { kind: 'comma' },
    { kind: 'number', value: 72.5 },
    { kind: 'times' },
    { kind: 'number', value: 5 },
  ]);
});

test('х сразу после единицы веса и «по» без пробелов', () => {
  expect(tokenize('70кгх7')).toMatchObject([
    { kind: 'number', value: 70 },
    { kind: 'weightUnit', unit: 'kg' },
    { kind: 'times' },
    { kind: 'number', value: 7 },
  ]);
  expect(tokenize('100kgx5')).toMatchObject([
    { kind: 'number', value: 100 },
    { kind: 'weightUnit', unit: 'kg' },
    { kind: 'times' },
    { kind: 'number', value: 5 },
  ]);
  expect(tokenize('3по7')).toMatchObject([
    { kind: 'number', value: 3 },
    { kind: 'per' },
    { kind: 'number', value: 7 },
  ]);
});
