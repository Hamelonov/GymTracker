import type { StyleRegistry } from './styles';
import type { XlsxCell, XlsxRow, XlsxSheet } from './types';
import {
  RELATIONSHIPS_NAMESPACE,
  SPREADSHEET_NAMESPACE,
  XML_DECLARATION,
  cellReference,
  escapeXml,
} from './xml';

function cellXml(cell: XlsxCell, columnIndex: number, rowIndex: number, styles: StyleRegistry): string {
  const reference = cellReference(columnIndex, rowIndex);
  const styleIndex = styles.styleIndex(cell.style);
  const styleAttribute = styleIndex > 0 ? ` s="${styleIndex}"` : '';
  if (cell.value == null) {
    // Пустая ячейка со стилем всё равно пишется: на ней держится рамка или заливка строки.
    return styleIndex > 0 ? `<c r="${reference}"${styleAttribute}/>` : '';
  }
  if (typeof cell.value === 'number') {
    return `<c r="${reference}"${styleAttribute}><v>${cell.value}</v></c>`;
  }
  // Текст пишется прямо в ячейку, без общей таблицы строк: так проще, и Excel это понимает.
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`;
}

function rowXml(row: XlsxRow, rowIndex: number, styles: StyleRegistry): string {
  const cells = row.cells.map((cell, columnIndex) => cellXml(cell, columnIndex, rowIndex, styles)).join('');
  const height = row.height != null ? ` ht="${row.height}" customHeight="1"` : '';
  return `<row r="${rowIndex + 1}"${height}>${cells}</row>`;
}

function sheetViewXml(frozenRowCount: number): string {
  if (frozenRowCount <= 0) return '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const topLeftCell = cellReference(0, frozenRowCount);
  return (
    '<sheetViews><sheetView workbookViewId="0">' +
    `<pane ySplit="${frozenRowCount}" topLeftCell="${topLeftCell}" activePane="bottomLeft" state="frozen"/>` +
    `<selection pane="bottomLeft" activeCell="${topLeftCell}" sqref="${topLeftCell}"/>` +
    '</sheetView></sheetViews>'
  );
}

/** XML одного листа; стили ячеек попутно регистрируются в общем реестре книги. */
export function buildSheetXml(sheet: XlsxSheet, styles: StyleRegistry): string {
  const columns = sheet.columnWidths
    .map((width, index) => {
      const styleIndex = styles.styleIndex(sheet.columnStyles?.[index]);
      const styleAttribute = styleIndex > 0 ? ` style="${styleIndex}"` : '';
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"${styleAttribute}/>`;
    })
    .join('');
  const rows = sheet.rows.map((row, rowIndex) => rowXml(row, rowIndex, styles)).join('');
  const merges = sheet.merges ?? [];
  const mergeCells =
    merges.length > 0
      ? `<mergeCells count="${merges.length}">${merges.map((range) => `<mergeCell ref="${range}"/>`).join('')}</mergeCells>`
      : '';
  return (
    XML_DECLARATION +
    `<worksheet xmlns="${SPREADSHEET_NAMESPACE}" xmlns:r="${RELATIONSHIPS_NAMESPACE}">` +
    sheetViewXml(sheet.frozenRowCount ?? 0) +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    (columns ? `<cols>${columns}</cols>` : '') +
    `<sheetData>${rows}</sheetData>` +
    mergeCells +
    '</worksheet>'
  );
}
