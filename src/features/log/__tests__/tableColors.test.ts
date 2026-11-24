import { darkColors, lightColors } from '@/ui/tokens';
import { getLogTableColors, scaleColorDifference } from '../tableColors';

describe('scaleColorDifference', () => {
  it('с коэффициентом 1 возвращает исходный цвет', () => {
    expect(scaleColorDifference('#E6E6E2', '#FFFFFF', 1)).toBe('#E6E6E2');
  });

  it('усиливает отличие от фона на 10%', () => {
    expect(scaleColorDifference('#E6E6E2', '#FFFFFF', 1.1)).toBe('#E4E4DF');
  });

  it('не выходит за границы канала', () => {
    expect(scaleColorDifference('#000000', '#101010', 3)).toBe('#000000');
    expect(scaleColorDifference('#FFFFFF', '#F0F0F0', 3)).toBe('#FFFFFF');
  });
});

describe('getLogTableColors', () => {
  it('в светлой теме делает границы темнее обычных', () => {
    expect(getLogTableColors(lightColors).border).toBe('#E4E4DF');
  });

  it('в тёмной теме делает границы светлее обычных', () => {
    expect(getLogTableColors(darkColors).border).toBe('#272727');
  });

  it('красит заголовок в акцентный цвет, а строки — в два разных цвета', () => {
    const tableColors = getLogTableColors(lightColors);
    expect(tableColors.headerBackground).toBe(lightColors.accent);
    expect(tableColors.firstRowBackground).not.toBe(tableColors.secondRowBackground);
  });
});
