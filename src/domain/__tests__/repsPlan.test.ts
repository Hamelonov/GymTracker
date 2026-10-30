import { buildRepsPlan, repsAtPercentOfMax } from '../repsPlan';

describe('repsPlan', () => {
  it('rounds reps to the nearest whole number', () => {
    expect(repsAtPercentOfMax(10, 85)).toBe(9);
    expect(repsAtPercentOfMax(10, 70)).toBe(7);
  });
  it('never suggests fewer than one rep', () => {
    expect(repsAtPercentOfMax(1, 70)).toBe(1);
  });
  it('goes from the top of the range down to the bottom', () => {
    const plan = buildRepsPlan(10, 4);
    expect(plan.map((set) => set.percent)).toEqual([85, 80, 75, 70]);
    expect(plan.map((set) => set.reps)).toEqual([9, 8, 8, 7]);
  });
  it('uses the top of the range for a single set', () => {
    expect(buildRepsPlan(20, 1)).toEqual([{ percent: 85, reps: 17 }]);
  });
  it('returns an empty plan without a max', () => {
    expect(buildRepsPlan(0, 4)).toEqual([]);
  });
});
