import { strFromU8, unzipSync } from 'fflate';
import { buildXlsx, uniqueSheetNames } from '../buildXlsx';
import { columnLetter, escapeXml, toExcelDateSerial } from '../xml';

test('буквы колонок как в Excel', () => {
  expect([0, 25, 26, 27, 701, 702].map(columnLetter)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
});

test('дата превращается в номер дня Excel по местному календарю', () => {
  expect(toExcelDateSerial(new Date(2024, 0, 1, 23, 30).getTime())).toBe(45292);
});

test('из текста убираются символы, ломающие XML', () => {
  expect(escapeXml('Жим <тяжело> & "долго"\u0007')).toBe('Жим &lt;тяжело&gt; &amp; &quot;долго&quot;');
});

test('имена листов: без запрещённых символов, не длиннее 31 символа и без повторов', () => {
  expect(uniqueSheetNames(['Жим лёжа', 'жим лёжа', 'Тяга [блок]: верх/низ', 'А'.repeat(40)])).toEqual([
    'Жим лёжа',
    'жим лёжа (2)',
    'Тяга блок верх низ',
    'А'.repeat(31),
  ]);
});

test('книга собирается в zip со всеми частями, листами и стилями', () => {
  const bytes = buildXlsx({
    sheets: [
      {
        name: 'Присед',
        columnWidths: [12, 10],
        frozenRowCount: 1,
        merges: ['A1:B1'],
        rows: [
          {
            cells: [
              { value: 'Заголовок & <ко>', style: { bold: true, fillColor: 'FFD400' } },
              { value: null },
            ],
          },
          { cells: [{ value: 45292, style: { numberFormat: 'dd.mm.yyyy' } }, { value: 70 }] },
        ],
      },
      { name: 'Присед', columnWidths: [], rows: [] },
    ],
  });
  const files = unzipSync(bytes);
  expect(Object.keys(files).sort()).toEqual(
    [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ].sort(),
  );
  const read = (path: string) => strFromU8(files[path] ?? new Uint8Array());
  expect(read('xl/workbook.xml')).toContain('<sheet name="Присед (2)" sheetId="2" r:id="rId2"/>');
  const sheet = read('xl/worksheets/sheet1.xml');
  expect(sheet).toContain('<t xml:space="preserve">Заголовок &amp; &lt;ко&gt;</t>');
  expect(sheet).toContain('<c r="A2" s="2"><v>45292</v></c>');
  expect(sheet).toContain('<c r="B2"><v>70</v></c>');
  expect(sheet).toContain('<mergeCell ref="A1:B1"/>');
  expect(sheet).toContain('state="frozen"');
  const styles = read('xl/styles.xml');
  expect(styles).toContain('<numFmt numFmtId="164" formatCode="dd.mm.yyyy"/>');
  expect(styles).toContain('<fgColor rgb="FFFFD400"/>');
  expect(styles).toContain('<cellXfs count="3">');
});
