/** Разбор CSV по RFC 4180: кавычки, удвоенные кавычки, переводы строк внутри полей. */
export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = '';
  let isInsideQuotes = false;

  for (let position = 0; position < text.length; position += 1) {
    const character = text[position];

    if (isInsideQuotes) {
      if (character !== '"') {
        currentField += character;
      } else if (text[position + 1] === '"') {
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
    } else if (character === ',') {
      currentRecord.push(currentField);
      currentField = '';
    } else if (character === '\n' || character === '\r') {
      // \r\n считаем одним переводом строки.
      if (character === '\r' && text[position + 1] === '\n') {
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
