/** Пространства имён Office Open XML, которые повторяются в нескольких частях файла. */
export const SPREADSHEET_NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
export const RELATIONSHIPS_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

// Управляющие символы запрещены в XML: Excel отказывается открывать файл, если они попадут в заметку.
const FORBIDDEN_XML_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function escapeXml(text: string): string {
  return text
    .replace(FORBIDDEN_XML_CHARACTERS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Номер колонки с нуля в букву Excel: 0 → A, 25 → Z, 26 → AA. */
export function columnLetter(columnIndex: number): string {
  let letters = '';
  let remaining = columnIndex + 1;
  while (remaining > 0) {
    const letterIndex = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + letterIndex) + letters;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return letters;
}

/** Адрес ячейки: колонка и строка с нуля → 'B3'. */
export function cellReference(columnIndex: number, rowIndex: number): string {
  return `${columnLetter(columnIndex)}${rowIndex + 1}`;
}

const MS_PER_DAY = 86_400_000;
// Excel считает дни от 30 декабря 1899 года: так он учитывает свою историческую ошибку с 1900 годом.
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

/** Дата тренировки как число дней Excel; берётся календарный день по местному времени телефона. */
export function toExcelDateSerial(timestamp: number): number {
  const date = new Date(timestamp);
  const localDayUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((localDayUtc - EXCEL_EPOCH_UTC) / MS_PER_DAY);
}
