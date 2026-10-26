/**
 * Разбор дат из экспорта других приложений (Hevy, Strong и похожих).
 * Hevy пишет «25 Oct 2026, 18:30», но в локализованной версии приложения
 * месяцы могут быть русскими: «25 окт. 2026 г., 18:30». ISO и числовые
 * форматы тоже встречаются. Всё без часового пояса считаем локальным временем.
 */

const MONTH_INDEX_BY_NAME: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
  янв: 0,
  январь: 0,
  января: 0,
  фев: 1,
  февраль: 1,
  февраля: 1,
  мар: 2,
  март: 2,
  марта: 2,
  апр: 3,
  апрель: 3,
  апреля: 3,
  май: 4,
  мая: 4,
  июн: 5,
  июнь: 5,
  июня: 5,
  июл: 6,
  июль: 6,
  июля: 6,
  авг: 7,
  август: 7,
  августа: 7,
  сен: 8,
  сент: 8,
  сентябрь: 8,
  сентября: 8,
  окт: 9,
  октябрь: 9,
  октября: 9,
  ноя: 10,
  ноябрь: 10,
  ноября: 10,
  дек: 11,
  декабрь: 11,
  декабря: 11,
};

const ISO_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/;

const NAMED_MONTH_DATE_PATTERN =
  /^(\d{1,2})\s+([A-Za-zА-Яа-яЁё.]+)\s+(\d{4})(?:\s*(?:г\.?|года?))?,?\s*(?:(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i;

const NUMERIC_DATE_PATTERN =
  /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})(?:[T ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i;

export function parseHevyDate(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;

  const isoDate = parseIsoDate(trimmed);
  if (isoDate !== null) return isoDate;

  const namedMonthDate = parseNamedMonthDate(trimmed);
  if (namedMonthDate !== null) return namedMonthDate;

  return parseNumericDate(trimmed);
}

function parseIsoDate(text: string): number | null {
  const match = ISO_DATE_PATTERN.exec(text);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hours = Number(match[4] ?? 0);
  const minutes = Number(match[5] ?? 0);
  const seconds = Number(match[6] ?? 0);
  const timeZone = match[7];

  if (!timeZone) return buildLocalTimestamp(year, monthIndex, day, hours, minutes, seconds);

  // Смещение в строке — абсолютное время, его нельзя сдвигать по часовому поясу телефона.
  const normalizedTimeZone = timeZone === 'Z' ? 'Z' : timeZone.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
  const timestamp = Date.parse(
    `${padNumber(year, 4)}-${padNumber(monthIndex + 1, 2)}-${padNumber(day, 2)}` +
      `T${padNumber(hours, 2)}:${padNumber(minutes, 2)}:${padNumber(seconds, 2)}${normalizedTimeZone}`,
  );
  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseNamedMonthDate(text: string): number | null {
  const match = NAMED_MONTH_DATE_PATTERN.exec(text);
  if (!match) return null;

  const monthName = (match[2] ?? '').trim().toLowerCase().replace(/\./g, '');
  const monthIndex = MONTH_INDEX_BY_NAME[monthName];
  if (monthIndex === undefined) return null;

  return buildLocalTimestamp(
    Number(match[3]),
    monthIndex,
    Number(match[1]),
    to24Hour(Number(match[4] ?? 0), match[7]),
    Number(match[5] ?? 0),
    Number(match[6] ?? 0),
  );
}

function parseNumericDate(text: string): number | null {
  const match = NUMERIC_DATE_PATTERN.exec(text);
  if (!match) return null;

  const firstText = match[1] ?? '';
  const secondText = match[2] ?? '';
  const thirdText = match[3] ?? '';
  const first = Number(firstText);
  const second = Number(secondText);
  const third = Number(thirdText);
  const isYearFirst = firstText.length === 4 || first > 31;
  let year: number;
  let day: number;
  let monthIndex: number;

  if (isYearFirst) {
    year = first;
    monthIndex = second - 1;
    day = third;
  } else {
    year = thirdText.length <= 2 ? 2000 + third : third;
    // Если месяц больше 12, а день нет — порядок однозначен; иначе считаем день первым, как в русской локали.
    const isMonthFirst = second > 12;
    day = isMonthFirst ? second : first;
    monthIndex = (isMonthFirst ? first : second) - 1;
  }

  return buildLocalTimestamp(
    year,
    monthIndex,
    day,
    to24Hour(Number(match[4] ?? 0), match[7]),
    Number(match[5] ?? 0),
    Number(match[6] ?? 0),
  );
}

function to24Hour(hours: number, meridiem: string | undefined): number {
  if (!meridiem) return hours;
  const isPm = meridiem.toLowerCase() === 'pm';
  if (isPm) return hours === 12 ? 12 : hours + 12;
  return hours === 12 ? 0 : hours;
}

function padNumber(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

function buildLocalTimestamp(
  year: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
): number | null {
  if (monthIndex < 0 || monthIndex > 11) return null;
  if (day < 1 || day > 31) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;

  const date = new Date(year, monthIndex, day, hours, minutes, seconds);
  // Date «исправляет» 31 февраля на март — считаем такую дату невалидной.
  const isSameCalendarDay = date.getMonth() === monthIndex && date.getDate() === day;
  if (!isSameCalendarDay || Number.isNaN(date.getTime())) return null;
  return date.getTime();
}
