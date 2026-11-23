import { formatHoursMinutesSeconds, formatMinutesSeconds } from '../formatClockTime';

test('таймер: минуты и секунды двумя цифрами', () => {
  expect(formatMinutesSeconds(60)).toBe('01:00');
  expect(formatMinutesSeconds(75)).toBe('01:15');
  expect(formatMinutesSeconds(0)).toBe('00:00');
});

test('секундомер: часы, минуты и секунды, дробные секунды отбрасываются', () => {
  expect(formatHoursMinutesSeconds(0)).toBe('00:00:00');
  expect(formatHoursMinutesSeconds(3723.9)).toBe('01:02:03');
});

test('отрицательное время показывается как ноль', () => {
  expect(formatMinutesSeconds(-5)).toBe('00:00');
  expect(formatHoursMinutesSeconds(-5)).toBe('00:00:00');
});
