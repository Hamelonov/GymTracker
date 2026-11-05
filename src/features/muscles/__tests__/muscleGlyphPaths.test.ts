import { basePathForSide, pathForMuscles, viewBoxForSide } from '../muscleGlyphPaths';

describe('muscleGlyphPaths', () => {
  it('склеивает силуэт в одну непустую строку', () => {
    expect(basePathForSide('front').length).toBeGreaterThan(1000);
    expect(basePathForSide('back').length).toBeGreaterThan(1000);
  });

  it('грудь есть спереди и пуста сзади', () => {
    expect(pathForMuscles('front', ['chest']).length).toBeGreaterThan(0);
    expect(pathForMuscles('back', ['chest'])).toBe('');
  });

  it('возвращает один и тот же результат из кэша', () => {
    expect(pathForMuscles('back', ['lats'])).toBe(pathForMuscles('back', ['lats']));
  });

  it('отдаёт область просмотра для каждой стороны', () => {
    expect(viewBoxForSide('front')).toBe('0 0 724 1448');
    expect(viewBoxForSide('back')).toBe('724 0 724 1448');
  });
});
