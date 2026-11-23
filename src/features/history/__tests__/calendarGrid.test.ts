import {
  buildMonthWeeks,
  buildWorkoutDayKeys,
  countRestDays,
  listMonthsNewestFirst,
  listYearsNewestFirst,
} from '../calendarGrid';

describe('buildMonthWeeks', () => {
  it('начинает неделю с понедельника и дополняет месяц пустыми ячейками', () => {
    // 1 ноября 2026 — воскресенье, значит в первой неделе шесть пустых ячеек перед ним.
    const weeks = buildMonthWeeks(new Date(2026, 10, 1));
    const firstWeek = weeks[0] ?? [];
    const lastWeek = weeks[weeks.length - 1] ?? [];
    expect(firstWeek.slice(0, 6).every((cell) => cell === null)).toBe(true);
    expect(firstWeek[6]?.getDate()).toBe(1);
    expect(weeks).toHaveLength(6);
    expect(lastWeek[0]?.getDate()).toBe(30);
    expect(lastWeek.slice(1).every((cell) => cell === null)).toBe(true);
  });

  it('держит в каждой неделе ровно семь ячеек', () => {
    for (const month of [0, 1, 2, 6, 11]) {
      const weeks = buildMonthWeeks(new Date(2026, month, 1));
      expect(weeks.every((week) => week.length === 7)).toBe(true);
    }
  });

  it('содержит все дни месяца по одному разу', () => {
    const days = buildMonthWeeks(new Date(2026, 1, 1))
      .flat()
      .filter((cell): cell is Date => cell !== null)
      .map((cell) => cell.getDate());
    expect(days).toEqual(Array.from({ length: 28 }, (_, index) => index + 1));
  });
});

describe('listMonthsNewestFirst', () => {
  const now = new Date(2026, 10, 23).getTime();

  it('без тренировок показывает только текущий месяц', () => {
    expect(listMonthsNewestFirst(now, null, null)).toEqual([new Date(2026, 10, 1)]);
  });

  it('идёт от текущего месяца назад до первой тренировки', () => {
    const earliest = new Date(2026, 7, 24).getTime();
    expect(listMonthsNewestFirst(now, earliest, now)).toEqual([
      new Date(2026, 10, 1),
      new Date(2026, 9, 1),
      new Date(2026, 8, 1),
      new Date(2026, 7, 1),
    ]);
  });

  it('добавляет месяц тренировки из будущего', () => {
    const future = new Date(2026, 11, 5).getTime();
    expect(listMonthsNewestFirst(now, future, future)[0]).toEqual(new Date(2026, 11, 1));
  });
});

describe('listYearsNewestFirst', () => {
  it('перечисляет годы от нового к старому', () => {
    const now = new Date(2026, 10, 23).getTime();
    const earliest = new Date(2024, 2, 1).getTime();
    expect(listYearsNewestFirst(now, earliest, now)).toEqual([2026, 2025, 2024]);
  });
});

describe('countRestDays', () => {
  const now = new Date(2026, 10, 23, 12).getTime();

  it('считает календарные дни с последней тренировки', () => {
    expect(countRestDays(new Date(2026, 10, 20, 18).getTime(), now)).toBe(3);
    expect(countRestDays(new Date(2026, 10, 23, 7).getTime(), now)).toBe(0);
  });

  it('без тренировок возвращает ноль', () => {
    expect(countRestDays(null, now)).toBe(0);
  });
});

describe('buildWorkoutDayKeys', () => {
  it('сводит несколько тренировок одного дня в один ключ', () => {
    const morning = new Date(2026, 10, 20, 8).getTime();
    const evening = new Date(2026, 10, 20, 19).getTime();
    const nextDay = new Date(2026, 10, 21, 7).getTime();
    expect(buildWorkoutDayKeys([evening, morning, nextDay])).toEqual(new Set(['2026-11-20', '2026-11-21']));
  });
});
