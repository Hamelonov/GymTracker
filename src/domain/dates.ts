import { format, isSameDay, isSameYear, isToday, isYesterday, startOfWeek } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';

export function dateLocale(language: string) {
  return language.startsWith('ru') ? ru : enUS;
}

export function getWeekStart(date: Date | number): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function toWeekKey(date: Date | number): string {
  return format(getWeekStart(date), 'yyyy-MM-dd');
}

export function toDayKey(date: Date | number): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatRelativeDay(
  timestamp: number,
  language: string,
  translate: (key: string) => string,
): string {
  const date = new Date(timestamp);
  if (isToday(date)) return translate('dates.today');
  if (isYesterday(date)) return translate('dates.yesterday');
  const locale = dateLocale(language);
  if (isSameYear(date, new Date())) return format(date, 'd MMM', { locale });
  return format(date, 'd MMM yyyy', { locale });
}

export function formatDateTime(timestamp: number, language: string): string {
  return format(timestamp, 'd MMM yyyy, HH:mm', { locale: dateLocale(language) });
}

/** День недели с заглавной буквы: «Суббота», «Saturday». */
export function weekdayName(timestamp: number, language: string): string {
  const name = format(timestamp, 'EEEE', { locale: dateLocale(language) });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Короткое название дня недели с заглавной буквы: «Пн», «Вт» по-русски и «Mon», «Tue» по-английски. */
export function weekdayShortName(date: Date | number, language: string): string {
  // На токене EEE date-fns даёт для русского редкие «пнд», «втр»; токен EEEEEE даёт привычные «пн», «вт».
  const pattern = language.startsWith('ru') ? 'EEEEEE' : 'EEE';
  const name = format(date, pattern, { locale: dateLocale(language) });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatLongDate(timestamp: number, language: string): string {
  return format(timestamp, 'EEEE, d MMMM', { locale: dateLocale(language) });
}

/** Дата целиком без времени: «31 октября 2026». */
export function formatFullDate(timestamp: number, language: string): string {
  return format(timestamp, 'd MMMM yyyy', { locale: dateLocale(language) });
}

export function formatShortDate(timestamp: number, language: string): string {
  return format(timestamp, 'd MMM', { locale: dateLocale(language) });
}

export function formatMonthYear(timestamp: number, language: string): string {
  return format(timestamp, 'LLLL yyyy', { locale: dateLocale(language) });
}

export function formatTime(timestamp: number): string {
  return format(timestamp, 'HH:mm');
}

export { isSameDay };
