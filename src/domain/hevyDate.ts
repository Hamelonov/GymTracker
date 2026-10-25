/** Разбор дат из экспорта Hevy: «25 Oct 2026, 18:30», ISO и «2026-10-25 18:30:00», всё как локальное время. */
const MONTH_INDEX_BY_SHORT_NAME: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function parseHevyDate(text: string): number | null {
  const trimmed = text.trim();

  // Формат Hevy: «25 Oct 2026, 18:30».
  const hevyMatch = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (hevyMatch) {
    const monthIndex = MONTH_INDEX_BY_SHORT_NAME[(hevyMatch[2] ?? '').toLowerCase()];
    if (monthIndex === undefined) return null;
    return buildLocalTimestamp(
      Number(hevyMatch[3]),
      monthIndex,
      Number(hevyMatch[1]),
      Number(hevyMatch[4]),
      Number(hevyMatch[5]),
      Number(hevyMatch[6] ?? 0),
    );
  }

  // ISO «2026-10-25T18:30:00» или «2026-10-25 18:30:00» — как локальное время.
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
  if (isoMatch) {
    return buildLocalTimestamp(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
      Number(isoMatch[4]),
      Number(isoMatch[5]),
      Number(isoMatch[6] ?? 0),
    );
  }

  return null;
}

function buildLocalTimestamp(
  year: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
): number | null {
  const date = new Date(year, monthIndex, day, hours, minutes, seconds);
  // Date «исправляет» 31 февраля на март — считаем такую дату невалидной.
  const isSameCalendarDay = date.getMonth() === monthIndex && date.getDate() === day;
  if (!isSameCalendarDay || Number.isNaN(date.getTime())) return null;
  return date.getTime();
}
