/**
 * Разбор CSV по RFC 4180: кавычки, удвоенные кавычки, переводы строк внутри полей.
 * Разделитель определяется по строке заголовка: программы и Excel в русской локали
 * сохраняют CSV через «;» или табуляцию, а не только через запятую.
 */

function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let isInsideQuotes = false;
  let count = 0;

  for (let position = 0; position < line.length; position += 1) {
    const character = line[position];

    if (character === '"') {
      if (isInsideQuotes && line[position + 1] === '"') {
        position += 1;
        continue;
      }
      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (!isInsideQuotes && character === delimiter) count += 1;
  }

  return count;
}

export function detectCsvDelimiter(firstLine: string): string {
  let bestDelimiter = ',';
  let bestCount = 0;

  for (const delimiter of [',', ';', '\t']) {
    const count = countDelimiterOutsideQuotes(firstLine, delimiter);
    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

interface PreparedCsvText {
  text: string;
  /** Разделитель из служебной строки Excel «sep=;», если она есть. */
  delimiter?: string;
}

/** Убирает служебную первую строку «sep=;», которую Excel добавляет при экспорте. */
export function prepareCsvText(text: string): PreparedCsvText {
  const firstLine = text.split(/\r\n|\r|\n/, 1)[0] ?? '';
  const separatorMatch = /^sep=(.)\s*$/i.exec(firstLine.trim());
  if (!separatorMatch) return { text };

  return {
    text: text.slice(firstLine.length).replace(/^(\r\n|\r|\n)/, ''),
    delimiter: separatorMatch[1],
  };
}

export function parseCsvRecords(text: string, delimiter?: string): string[][] {
  const prepared = prepareCsvText(text);
  const actualDelimiter =
    delimiter ?? prepared.delimiter ?? detectCsvDelimiter(prepared.text.split(/\r\n|\r|\n/, 1)[0] ?? '');

  const records: string[][] = [];
  const source = prepared.text;
  let currentRecord: string[] = [];
  let currentField = '';
  let isInsideQuotes = false;

  for (let position = 0; position < source.length; position += 1) {
    const character = source[position];

    if (isInsideQuotes) {
      if (character !== '"') {
        currentField += character;
      } else if (source[position + 1] === '"') {
        // Удвоенная кавычка внутри поля — это одна литеральная кавычка.
        currentField += '"';
        position += 1;
      } else {
        isInsideQuotes = false;
      }
      continue;
    }

    if (character === '"') {
      isInsideQuotes = true;
    } else if (character === actualDelimiter) {
      currentRecord.push(currentField);
      currentField = '';
    } else if (character === '\n' || character === '\r') {
      // \r\n считаем одним переводом строки.
      if (character === '\r' && source[position + 1] === '\n') {
        position += 1;
      }
      currentRecord.push(currentField);
      records.push(currentRecord);
      currentRecord = [];
      currentField = '';
    } else {
      currentField += character;
    }
  }

  // Последняя строка может быть без перевода строки в конце.
  if (currentField !== '' || currentRecord.length > 0) {
    currentRecord.push(currentField);
    records.push(currentRecord);
  }

  return records;
}

/** Число из CSV: в локализованных файлах дробная часть отделена запятой. */
export function parseCsvNumber(text: string | undefined): number | null {
  if (text === undefined) return null;
  const trimmed = text.trim();
  if (trimmed === '') return null;

  const normalized = trimmed.includes('.') ? trimmed : trimmed.replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
