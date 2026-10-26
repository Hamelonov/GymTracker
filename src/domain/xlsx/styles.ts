import type { XlsxCellStyle } from './types';
import { SPREADSHEET_NAMESPACE, XML_DECLARATION, escapeXml } from './xml';

const DEFAULT_FONT_SIZE = 11;
const DEFAULT_FONT_COLOR = '000000';
// Свои форматы чисел в Excel нумеруются со 164: номера ниже заняты встроенными.
const FIRST_CUSTOM_NUMBER_FORMAT_ID = 164;

/** Список без повторов: одинаковые шрифты, заливки и рамки хранятся в файле один раз. */
class UniqueList {
  private readonly indexByKey = new Map<string, number>();
  readonly items: string[] = [];

  constructor(initialItems: string[]) {
    initialItems.forEach((item) => this.add(item));
  }

  add(item: string): number {
    const existingIndex = this.indexByKey.get(item);
    if (existingIndex != null) return existingIndex;
    this.items.push(item);
    this.indexByKey.set(item, this.items.length - 1);
    return this.items.length - 1;
  }
}

function fontXml(style: XlsxCellStyle): string {
  const bold = style.bold ? '<b/>' : '';
  const size = style.fontSize ?? DEFAULT_FONT_SIZE;
  const color = style.fontColor ?? DEFAULT_FONT_COLOR;
  return `<font>${bold}<sz val="${size}"/><color rgb="FF${color}"/><name val="Calibri"/><family val="2"/></font>`;
}

function fillXml(fillColor: string): string {
  return `<fill><patternFill patternType="solid"><fgColor rgb="FF${fillColor}"/><bgColor indexed="64"/></patternFill></fill>`;
}

function borderSideXml(side: 'top' | 'bottom', color: string | undefined): string {
  if (!color) return `<${side}/>`;
  return `<${side} style="thin"><color rgb="FF${color}"/></${side}>`;
}

function borderXml(style: XlsxCellStyle): string {
  const top = borderSideXml('top', style.borderTopColor);
  const bottom = borderSideXml('bottom', style.borderBottomColor);
  return `<border><left/><right/>${top}${bottom}<diagonal/></border>`;
}

function alignmentXml(style: XlsxCellStyle): string {
  const attributes = [
    style.horizontalAlign ? `horizontal="${style.horizontalAlign}"` : '',
    style.verticalAlign ? `vertical="${style.verticalAlign}"` : '',
    style.wrapText ? 'wrapText="1"' : '',
  ].filter((attribute) => attribute.length > 0);
  return attributes.length > 0 ? `<alignment ${attributes.join(' ')}/>` : '';
}

/**
 * Собирает стили ячеек в styles.xml. Каждой ячейке отдаёт номер стиля,
 * одинаковые описания получают один и тот же номер.
 */
export class StyleRegistry {
  private readonly fonts = new UniqueList([fontXml({})]);
  // Две первые заливки Excel требует именно такими, иначе считает файл повреждённым.
  private readonly fills = new UniqueList([
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
  ]);
  private readonly borders = new UniqueList([borderXml({})]);
  private readonly numberFormats = new UniqueList([]);
  private readonly cellFormats = new UniqueList([
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
  ]);

  /** Номер стиля для атрибута s ячейки; 0 — стиль по умолчанию. */
  styleIndex(style: XlsxCellStyle | undefined): number {
    if (!style) return 0;
    const fontId = this.fonts.add(fontXml(style));
    const fillId = style.fillColor ? this.fills.add(fillXml(style.fillColor)) : 0;
    const borderId = this.borders.add(borderXml(style));
    const numberFormatId = style.numberFormat
      ? FIRST_CUSTOM_NUMBER_FORMAT_ID + this.numberFormats.add(style.numberFormat)
      : 0;
    const alignment = alignmentXml(style);
    const attributes =
      `numFmtId="${numberFormatId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
      ' applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"' +
      (alignment ? ' applyAlignment="1"' : '');
    const cellFormat = alignment ? `<xf ${attributes}>${alignment}</xf>` : `<xf ${attributes}/>`;
    return this.cellFormats.add(cellFormat);
  }

  toXml(): string {
    const numberFormats =
      this.numberFormats.items.length > 0
        ? `<numFmts count="${this.numberFormats.items.length}">${this.numberFormats.items
            .map(
              (formatCode, index) =>
                `<numFmt numFmtId="${FIRST_CUSTOM_NUMBER_FORMAT_ID + index}" formatCode="${escapeXml(formatCode)}"/>`,
            )
            .join('')}</numFmts>`
        : '';
    return (
      XML_DECLARATION +
      `<styleSheet xmlns="${SPREADSHEET_NAMESPACE}">` +
      numberFormats +
      `<fonts count="${this.fonts.items.length}">${this.fonts.items.join('')}</fonts>` +
      `<fills count="${this.fills.items.length}">${this.fills.items.join('')}</fills>` +
      `<borders count="${this.borders.items.length}">${this.borders.items.join('')}</borders>` +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${this.cellFormats.items.length}">${this.cellFormats.items.join('')}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>'
    );
  }
}
