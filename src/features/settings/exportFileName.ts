/** Имя приложения в именах файлов экспорта. */
const APP_NAME = 'gymtracker';

function padToTwoDigits(number: number): string {
  return String(number).padStart(2, '0');
}

/** `YYYYMMDD` по локальному времени. */
export function formatExportDate(date: Date): string {
  return `${date.getFullYear()}${padToTwoDigits(date.getMonth() + 1)}${padToTwoDigits(date.getDate())}`;
}

/** Имя профиля в имени файла: строчные буквы, пробелы → дефис, без символов, запрещённых в именах файлов. */
export function slugifyProfileName(profileName: string): string {
  const slug = profileName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\\/:*?"<>|_]+/g, '');
  return slug.length > 0 ? slug : 'user';
}

interface ExportFileNameOptions {
  profileName: string;
  date: Date;
  /** Порядковый номер экспорта, чтобы файлы одного дня не перезаписывали друг друга. */
  sequence: number;
  extension: 'csv' | 'json';
}

/** `data_gymtracker_andrey_20261024_432.csv` — шаблон имени, заданный владельцем. */
export function buildExportFileName({
  profileName,
  date,
  sequence,
  extension,
}: ExportFileNameOptions): string {
  return `data_${APP_NAME}_${slugifyProfileName(profileName)}_${formatExportDate(date)}_${sequence}.${extension}`;
}
