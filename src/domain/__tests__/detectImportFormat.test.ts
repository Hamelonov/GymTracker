import { detectImportFormat } from '../detectImportFormat';

const toBytes = (text: string) => new TextEncoder().encode(text);

describe('detectImportFormat', () => {
  it('узнаёт xlsx по сигнатуре zip', () => {
    expect(detectImportFormat(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBe('xlsx');
  });

  it('узнаёт json-бэкап', () => {
    expect(detectImportFormat(toBytes('{"app":"gymtracker"}'))).toBe('json');
  });

  it('узнаёт json после BOM и пробелов', () => {
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...toBytes('\n  {"app":"gymtracker"}')]);
    expect(detectImportFormat(withBom)).toBe('json');
  });

  it('остальное считает csv', () => {
    expect(detectImportFormat(toBytes('date,workout,duration,exercise,set\n'))).toBe('csv');
    expect(detectImportFormat(toBytes('sep=;\ndate;workout\n'))).toBe('csv');
  });

  it('пустой файл считает csv, дальше его отклонит разбор', () => {
    expect(detectImportFormat(new Uint8Array([]))).toBe('csv');
  });
});
