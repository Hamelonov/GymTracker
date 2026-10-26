import { strFromU8, unzipSync } from 'fflate';
import type { XlsxCellValue } from './types';

/** Лист, прочитанный из файла: значения ячеек по строкам, пропуски — null. */
export interface ReadSheet {
  name: string;
  rows: XlsxCellValue[][];
}

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function unescapeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X'))
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)));
    return XML_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Атрибуты тега в любом порядке: Excel и другие программы пишут их по-разному. */
function readAttributes(attributesText: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of attributesText.matchAll(/([\w:]+)="([^"]*)"/g)) {
    attributes.set(match[1] ?? '', unescapeXml(match[2] ?? ''));
  }
  return attributes;
}

/** Весь текст внутри элемента: у форматированного текста он разбит на несколько <t>. */
function joinTextRuns(xml: string): string {
  return [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => unescapeXml(match[1] ?? '')).join('');
}

/** «C12» → номер колонки с нуля. */
function columnIndexFromReference(reference: string): number {
  const letters = reference.replace(/\d+$/, '').toUpperCase();
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

/** Общая таблица строк: в неё Excel переносит весь текст, когда пересохраняет файл. */
function readSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => joinTextRuns(match[1] ?? ''));
}

function readCellValue(
  attributes: Map<string, string>,
  innerXml: string,
  sharedStrings: string[],
): XlsxCellValue {
  const type = attributes.get('t');
  if (type === 'inlineStr') return joinTextRuns(innerXml);
  const rawValue = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(innerXml)?.[1];
  if (rawValue === undefined) return null;
  const value = unescapeXml(rawValue);
  if (type === 's') return sharedStrings[Number(value)] ?? null;
  if (type === 'str' || type === 'e') return value;
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function readSheetRows(xml: string, sharedStrings: string[]): XlsxCellValue[][] {
  const rows: XlsxCellValue[][] = [];
  // Строка или ячейка может быть пустой самозакрытой: <row r="5"/>, <c r="B2" s="3"/>.
  for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowAttributes = readAttributes(rowMatch[1] ?? '');
    const rowIndex = Number(rowAttributes.get('r') ?? rows.length + 1) - 1;
    const cells: XlsxCellValue[] = [];
    for (const cellMatch of (rowMatch[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const cellAttributes = readAttributes(cellMatch[1] ?? '');
      const reference = cellAttributes.get('r');
      const columnIndex = reference ? columnIndexFromReference(reference) : cells.length;
      cells[columnIndex] = readCellValue(cellAttributes, cellMatch[2] ?? '', sharedStrings);
    }
    rows[rowIndex] = Array.from(cells, (cell) => cell ?? null);
  }
  return Array.from(rows, (row) => row ?? []);
}

/** Путь части файла из ссылки книги: «worksheets/sheet1.xml» или «/xl/worksheets/sheet1.xml». */
function resolvePartPath(target: string): string {
  return target.startsWith('/') ? target.slice(1) : `xl/${target}`;
}

/** Читает листы книги .xlsx в порядке вкладок. Формулы не считаются: берётся сохранённое значение. */
export function readXlsx(bytes: Uint8Array): ReadSheet[] {
  const files = unzipSync(bytes);
  const readPart = (path: string): string | undefined => {
    const part = files[path];
    return part ? strFromU8(part) : undefined;
  };
  const workbookXml = readPart('xl/workbook.xml');
  if (!workbookXml) throw new Error('not an xlsx workbook');

  const targetById = new Map<string, string>();
  for (const match of (readPart('xl/_rels/workbook.xml.rels') ?? '').matchAll(
    /<Relationship\b([^>]*?)\/?>/g,
  )) {
    const attributes = readAttributes(match[1] ?? '');
    targetById.set(attributes.get('Id') ?? '', attributes.get('Target') ?? '');
  }
  const sharedStrings = readSharedStrings(readPart('xl/sharedStrings.xml'));

  const sheets: ReadSheet[] = [];
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const attributes = readAttributes(match[1] ?? '');
    const target = targetById.get(attributes.get('r:id') ?? '');
    const sheetXml = target ? readPart(resolvePartPath(target)) : undefined;
    if (!sheetXml) continue;
    sheets.push({ name: attributes.get('name') ?? '', rows: readSheetRows(sheetXml, sharedStrings) });
  }
  return sheets;
}
