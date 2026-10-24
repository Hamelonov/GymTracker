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

export function formatLongDate(timestamp: number, language: string): string {
  return format(timestamp, 'EEEE, d MMMM', { locale: dateLocale(language) });
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
