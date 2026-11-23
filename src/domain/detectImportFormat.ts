export type ImportFileFormat = 'json' | 'csv' | 'xlsx';

// Каждый .xlsx — это zip-архив, а любой zip начинается с этих двух байт.
const ZIP_SIGNATURE = [0x50, 0x4b];
const BYTE_ORDER_MARK = [0xef, 0xbb, 0xbf];
const WHITESPACE_BYTES = new Set([0x20, 0x09, 0x0a, 0x0d]);
const OPENING_BRACE_BYTE = 0x7b;

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((byte, index) => bytes[index] === byte);
}

/**
 * Формат файла для импорта определяется по содержимому, а не по расширению или типу:
 * мессенджеры и облака часто отдают файл с неправильным типом.
 * Всё, что не архив и не JSON-объект, считается CSV; если это не наш и не Hevy CSV,
 * разбор позже сам скажет, что формат неизвестен.
 */
export function detectImportFormat(bytes: Uint8Array): ImportFileFormat {
  if (startsWith(bytes, ZIP_SIGNATURE)) return 'xlsx';

  let position = startsWith(bytes, BYTE_ORDER_MARK) ? BYTE_ORDER_MARK.length : 0;
  while (position < bytes.length && WHITESPACE_BYTES.has(bytes[position] ?? 0)) position += 1;
  if (bytes[position] === OPENING_BRACE_BYTE) return 'json';

  return 'csv';
}
