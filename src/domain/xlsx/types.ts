/**
 * Минимальное описание книги Excel: только то, что нужно выгрузке прогресса.
 * Цвета — шесть шестнадцатеричных цифр без решётки: 'FFD400'.
 */

export interface XlsxCellStyle {
  bold?: boolean;
  fontSize?: number;
  fontColor?: string;
  fillColor?: string;
  borderTopColor?: string;
  borderBottomColor?: string;
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center';
  wrapText?: boolean;
  /** Формат числа Excel, например 'dd.mm.yyyy' или 'General"кг"'. */
  numberFormat?: string;
}

/** Строка — текст, число — число (даты тоже числа, см. toExcelDateSerial), null — пустая ячейка. */
export type XlsxCellValue = string | number | null;

export interface XlsxCell {
  value: XlsxCellValue;
  style?: XlsxCellStyle;
}

export interface XlsxRow {
  cells: XlsxCell[];
  /** Высота строки в пунктах; без неё Excel подбирает сам. */
  height?: number;
}

export interface XlsxSheet {
  name: string;
  /** Ширина колонок в символах, как в Excel. */
  columnWidths: number[];
  /** Стиль всей колонки, включая пустые строки ниже таблицы: его получит то, что впишут вручную. */
  columnStyles?: (XlsxCellStyle | undefined)[];
  rows: XlsxRow[];
  /** Сколько верхних строк закрепить при прокрутке. */
  frozenRowCount?: number;
  /** Объединённые диапазоны вида 'A1:G1'. */
  merges?: string[];
}

export interface XlsxWorkbook {
  sheets: XlsxSheet[];
}
