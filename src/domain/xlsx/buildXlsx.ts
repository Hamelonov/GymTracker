import { strToU8, zipSync, type Zippable } from 'fflate';
import { buildSheetXml } from './sheetXml';
import { StyleRegistry } from './styles';
import type { XlsxWorkbook } from './types';
import { RELATIONSHIPS_NAMESPACE, SPREADSHEET_NAMESPACE, XML_DECLARATION, escapeXml } from './xml';

const PACKAGE_RELATIONSHIPS_NAMESPACE = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DOCUMENT_RELATIONSHIP_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CONTENT_TYPE_PREFIX = 'application/vnd.openxmlformats-officedocument.spreadsheetml';

/** MIME-тип файла .xlsx для окна «Поделиться». */
export const XLSX_MIME_TYPE = `${CONTENT_TYPE_PREFIX}.sheet`;

// Excel ограничивает имя листа 31 символом и запрещает в нём []:*?/\
const SHEET_NAME_MAX_LENGTH = 31;
const FORBIDDEN_SHEET_NAME_CHARACTERS = /[[\]:*?/\\]/g;

/** Имена листов без запрещённых символов и без повторов: «Жим лёжа», «Жим лёжа (2)». */
export function uniqueSheetNames(names: string[]): string[] {
  const usedNames = new Set<string>();
  return names.map((name) => {
    const cleanName =
      name.replace(FORBIDDEN_SHEET_NAME_CHARACTERS, ' ').replace(/\s+/g, ' ').trim() || 'Sheet';
    let candidate = cleanName.slice(0, SHEET_NAME_MAX_LENGTH);
    let copyNumber = 2;
    // Excel сравнивает имена листов без учёта регистра.
    while (usedNames.has(candidate.toLowerCase())) {
      const suffix = ` (${copyNumber})`;
      candidate = cleanName.slice(0, SHEET_NAME_MAX_LENGTH - suffix.length) + suffix;
      copyNumber += 1;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
  });
}

function contentTypesXml(sheetCount: number): string {
  const sheetOverrides = Array.from(
    { length: sheetCount },
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="${CONTENT_TYPE_PREFIX}.worksheet+xml"/>`,
  ).join('');
  return (
    XML_DECLARATION +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    `<Override PartName="/xl/workbook.xml" ContentType="${CONTENT_TYPE_PREFIX}.sheet.main+xml"/>` +
    sheetOverrides +
    `<Override PartName="/xl/styles.xml" ContentType="${CONTENT_TYPE_PREFIX}.styles+xml"/>` +
    '</Types>'
  );
}

function rootRelationshipsXml(): string {
  return (
    XML_DECLARATION +
    `<Relationships xmlns="${PACKAGE_RELATIONSHIPS_NAMESPACE}">` +
    `<Relationship Id="rId1" Type="${DOCUMENT_RELATIONSHIP_TYPE}/officeDocument" Target="xl/workbook.xml"/>` +
    '</Relationships>'
  );
}

function workbookXml(sheetNames: string[]): string {
  const sheets = sheetNames
    .map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join('');
  return (
    XML_DECLARATION +
    `<workbook xmlns="${SPREADSHEET_NAMESPACE}" xmlns:r="${RELATIONSHIPS_NAMESPACE}">` +
    `<sheets>${sheets}</sheets>` +
    '</workbook>'
  );
}

function workbookRelationshipsXml(sheetCount: number): string {
  const sheetRelationships = Array.from(
    { length: sheetCount },
    (_, index) =>
      `<Relationship Id="rId${index + 1}" Type="${DOCUMENT_RELATIONSHIP_TYPE}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join('');
  const stylesRelationship = `<Relationship Id="rId${sheetCount + 1}" Type="${DOCUMENT_RELATIONSHIP_TYPE}/styles" Target="styles.xml"/>`;
  return (
    XML_DECLARATION +
    `<Relationships xmlns="${PACKAGE_RELATIONSHIPS_NAMESPACE}">${sheetRelationships}${stylesRelationship}</Relationships>`
  );
}

/** Собирает книгу в байты файла .xlsx: XML-части Office Open XML, упакованные в zip. */
export function buildXlsx(workbook: XlsxWorkbook): Uint8Array {
  const styles = new StyleRegistry();
  const sheetNames = uniqueSheetNames(workbook.sheets.map((sheet) => sheet.name));
  const files: Zippable = {
    '[Content_Types].xml': strToU8(contentTypesXml(workbook.sheets.length)),
    '_rels/.rels': strToU8(rootRelationshipsXml()),
    'xl/workbook.xml': strToU8(workbookXml(sheetNames)),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelationshipsXml(workbook.sheets.length)),
  };
  workbook.sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(buildSheetXml(sheet, styles));
  });
  // Стили пишутся последними: реестр заполняется, пока строятся листы.
  files['xl/styles.xml'] = strToU8(styles.toXml());
  return zipSync(files, { level: 6 });
}
