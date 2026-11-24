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
  it('в светлой теме делает границы темнее сильной границы приложения', () => {
    expect(getLogTableColors(lightColors).border).toBe('#BCBCB5');
  });

  it('в тёмной теме делает границы светлее сильной границы приложения', () => {
    expect(getLogTableColors(darkColors).border).toBe('#4D4D4D');
  });

  it('красит заголовок в бледно-жёлтый, а строки — в два разных цвета', () => {
    const tableColors = getLogTableColors(lightColors);
    expect(tableColors.headerBackground).toBe(lightColors.accentFaint);
    expect(tableColors.firstRowBackground).not.toBe(tableColors.secondRowBackground);
  });

  it('в тёмной теме заголовок остаётся тёмно-жёлтым, а не ярким', () => {
    expect(getLogTableColors(darkColors).headerBackground).toBe(darkColors.accentFaint);
  });

  it('красит чётные строки в светло-серый вместо жёлтого оттенка', () => {
    expect(getLogTableColors(lightColors).secondRowBackground).toBe(lightColors.surfaceAlt);
  });
});
