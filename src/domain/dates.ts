import { format, isSameDay, isSameYear, isToday, isYesterday, startOfWeek } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';

export function dateLocale(lang: string) {
  return lang.startsWith('ru') ? ru : enUS;
}

export function weekStart(d: Date | number): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function weekKey(d: Date | number): string {
  return format(weekStart(d), 'yyyy-MM-dd');
}

export function dayKey(d: Date | number): string {
  return format(d, 'yyyy-MM-dd');
}

export function formatRelativeDay(ts: number, lang: string, t: (k: string) => string): string {
  const d = new Date(ts);
  if (isToday(d)) return t('dates.today');
  if (isYesterday(d)) return t('dates.yesterday');
  const loc = dateLocale(lang);
  return isSameYear(d, new Date())
    ? format(d, 'd MMM', { locale: loc })
    : format(d, 'd MMM yyyy', { locale: loc });
}

export function formatDateTime(ts: number, lang: string): string {
  return format(ts, 'd MMM yyyy, HH:mm', { locale: dateLocale(lang) });
}

export function formatLongDate(ts: number, lang: string): string {
  return format(ts, 'EEEE, d MMMM', { locale: dateLocale(lang) });
}

export function formatShortDate(ts: number, lang: string): string {
  return format(ts, 'd MMM', { locale: dateLocale(lang) });
}

export function formatMonthYear(ts: number, lang: string): string {
  return format(ts, 'LLLL yyyy', { locale: dateLocale(lang) });
}

export function formatTime(ts: number): string {
  return format(ts, 'HH:mm');
}

export { isSameDay };
