import { weekdayShortName } from '../dates';

describe('weekdayShortName', () => {
  // 1 января 2024 года — понедельник, дальше семь дней подряд.
  const weekDays = Array.from({ length: 7 }, (_, offset) => new Date(2024, 0, 1 + offset));

  it('даёт привычные русские сокращения вместо «пнд», «втр»', () => {
    expect(weekDays.map((day) => weekdayShortName(day, 'ru'))).toEqual([
      'Пн',
      'Вт',
      'Ср',
      'Чт',
      'Пт',
      'Сб',
      'Вс',
    ]);
  });

  it('даёт английские сокращения из трёх букв', () => {
    expect(weekDays.map((day) => weekdayShortName(day, 'en'))).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
  });
});
