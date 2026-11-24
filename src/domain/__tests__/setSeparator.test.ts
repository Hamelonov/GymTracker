import { DEFAULT_SET_SEPARATOR, parseSetSeparator } from '../setSeparator';

describe('parseSetSeparator', () => {
  it('принимает любой знак', () => {
    for (const symbol of ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '|', '·']) {
      expect(parseSetSeparator(symbol)).toBe(symbol);
    }
  });

  it('берёт первый непробельный символ из введённого', () => {
    expect(parseSetSeparator(' -')).toBe('-');
    expect(parseSetSeparator('#!')).toBe('#');
  });

  it('не режет эмодзи пополам', () => {
    expect(parseSetSeparator('🔥')).toBe('🔥');
  });

  it('отклоняет пустой ввод, пробелы и цифры', () => {
    expect(parseSetSeparator('')).toBeNull();
    expect(parseSetSeparator('   ')).toBeNull();
    expect(parseSetSeparator('7')).toBeNull();
  });

  it('по умолчанию разделитель — слэш', () => {
    expect(DEFAULT_SET_SEPARATOR).toBe('/');
  });
});
