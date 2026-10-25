import { buildExportFileName, slugifyProfileName } from '../exportFileName';

test('имя файла по шаблону data_приложение_профиль_дата_номер', () => {
  expect(
    buildExportFileName({
      profileName: 'Andrey',
      date: new Date(2026, 9, 24),
      sequence: 432,
      extension: 'csv',
    }),
  ).toBe('data_gymtracker_andrey_20261024_432.csv');
});

test('пустое имя профиля заменяется на user, пробелы — на дефис, запрещённые символы убираются', () => {
  expect(slugifyProfileName('')).toBe('user');
  expect(slugifyProfileName('  Иван Петров ')).toBe('иван-петров');
  expect(slugifyProfileName('a/b:c?')).toBe('abc');
});
