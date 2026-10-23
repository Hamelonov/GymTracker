import { estimateOneRm, repsAtPercent, weightForReps } from '../oneRm';
import { platesPerSide } from '../plates';
import { bestOf, detectPrs, prTypesFor } from '../records';
import { formatDuration, formatWeight, parseDurationInput, parseNumberInput, unitToKg } from '../units';
import { countWorkingSets, totalVolume } from '../volume';
import type { SetType } from '../types';

const set = (weightKg: number | null, reps: number | null, type: SetType = 'normal', completed = true) => ({
  weightKg,
  reps,
  durationSec: null,
  distanceM: null,
  rpe: null,
  type,
  completed,
});

describe('oneRm', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRm(100, 1)).toBe(100);
  });
  it('estimates a plausible 1RM for 5 reps', () => {
    const v = estimateOneRm(100, 5);
    expect(v).toBeGreaterThan(112);
    expect(v).toBeLessThan(118);
  });
  it('is monotonic in reps', () => {
    expect(estimateOneRm(100, 8)).toBeGreaterThan(estimateOneRm(100, 5));
  });
  it('inverts with weightForReps', () => {
    const oneRm = estimateOneRm(100, 12);
    expect(weightForReps(oneRm, 12)).toBeCloseTo(100, 0);
  });
  it('maps percentages to reps', () => {
    expect(repsAtPercent(100)).toBe(1);
    expect(repsAtPercent(75)).toBe(10);
  });
});

describe('volume', () => {
  it('ignores warm-ups and incomplete sets', () => {
    const sets = [set(60, 10, 'warmup'), set(100, 5), set(100, 5, 'normal', false), set(90, 8, 'drop')];
    expect(totalVolume(sets)).toBe(500 + 720);
    expect(countWorkingSets(sets)).toBe(2);
  });
});

describe('records', () => {
  it('detects weight, 1RM, volume and reps PRs on the first set that beats them', () => {
    const hits = detectPrs([set(100, 5), set(100, 5), set(105, 3)], 'weight_reps', { weight: 100, one_rm: 110, volume: 600, reps: 8 });
    expect(hits.get(0)?.map((h) => h.type)).toEqual(['one_rm']);
    expect(hits.get(1)).toBeUndefined();
    // 105×3 ≈ 113 kg 1RM, below the 100×5 estimate (≈115 kg) set just before.
    expect(hits.get(2)?.map((h) => h.type)).toEqual(['weight']);
  });
  it('treats an empty record table as all-new records', () => {
    const hits = detectPrs([set(50, 10)], 'weight_reps', {});
    expect(hits.get(0)?.map((h) => h.type).sort()).toEqual(['one_rm', 'reps', 'volume', 'weight']);
  });
  it('only tracks reps for bodyweight exercises', () => {
    expect(prTypesFor('bodyweight_reps')).toEqual(['reps']);
    expect(bestOf([set(null, 12), set(null, 15)], 'reps')).toBe(15);
  });
});

describe('plates', () => {
  it('splits 100 kg on a 20 kg bar', () => {
    expect(platesPerSide(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25])).toEqual({ plates: [25, 15], remainder: 0 });
  });
  it('reports what cannot be loaded', () => {
    expect(platesPerSide(61, 20, [20, 10, 5])).toEqual({ plates: [20], remainder: 1 });
  });
});

describe('units', () => {
  it('converts lb to kg', () => {
    expect(unitToKg(100, 'lb')).toBeCloseTo(45.36, 2);
    expect(formatWeight(unitToKg(100, 'lb'), 'lb')).toBe('100 lb');
  });
  it('parses comma decimals and durations', () => {
    expect(parseNumberInput('62,5')).toBe(62.5);
    expect(parseNumberInput('')).toBeNull();
    expect(parseDurationInput('1:30')).toBe(90);
    expect(parseDurationInput('45')).toBe(45);
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(95, { compact: true })).toBe('1m 35s');
  });
});
