import { formatSetsLine, isSetFilled, pickRecordMetric, recordGain, type LineSet } from '../summary';
import { setFieldsFor, type PrHit, type SetType } from '../types';

const fmt = {
  weight: (kg: number) => `${kg} kg`,
  duration: (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`,
  distance: (m: number) => `${m / 1000} km`,
};

const s = (weightKg: number | null, reps: number | null, type: SetType = 'normal'): LineSet => ({
  weightKg,
  reps,
  durationSec: null,
  distanceM: null,
  rpe: null,
  type,
});

const hit = (type: PrHit['type'], value: number, previous: number | null): PrHit => ({ type, value, previous });

describe('pickRecordMetric', () => {
  it('shows weight for a weighted exercise when the weight record moved', () => {
    expect(pickRecordMetric(setFieldsFor('weight_reps'), [hit('weight', 42.5, 40), hit('reps', 10, 8)])).toBe('weight');
  });
  it('shows reps for a weighted exercise when only reps improved', () => {
    expect(pickRecordMetric(setFieldsFor('weight_reps'), [hit('reps', 12, 10), hit('volume', 480, 400)])).toBe('reps');
  });
  it('never shows weight for bodyweight exercises', () => {
    expect(pickRecordMetric(setFieldsFor('bodyweight_reps'), [hit('reps', 15, 12)])).toBe('reps');
  });
  it('uses distance or time for cardio', () => {
    expect(pickRecordMetric(setFieldsFor('distance_duration'), [hit('distance', 5000, 4000)])).toBe('distance');
    expect(pickRecordMetric(setFieldsFor('duration'), [hit('duration', 90, 60)])).toBe('duration');
  });
});

describe('recordGain', () => {
  it('returns the old record and the best new value', () => {
    expect(recordGain([hit('reps', 9, 8), hit('reps', 10, 9)], 'reps')).toEqual({ previous: 8, best: 10 });
  });
  it('returns null previous for a first-ever record', () => {
    expect(recordGain([hit('weight', 20, null)], 'weight')).toEqual({ previous: null, best: 20 });
  });
  it('returns null when that record did not move', () => {
    expect(recordGain([hit('reps', 10, 8)], 'weight')).toBeNull();
  });
});

describe('formatSetsLine', () => {
  const wr = setFieldsFor('weight_reps');
  it('groups sets with the same weight', () => {
    expect(formatSetsLine([s(80, 8), s(80, 7), s(80, 6)], wr, fmt)).toBe('80 kg × 8/7/6');
  });
  it('splits groups when the weight changes', () => {
    expect(formatSetsLine([s(80, 8), s(80, 7), s(85, 5)], wr, fmt)).toBe('80 kg × 8/7 · 85 kg × 5');
  });
  it('leaves warm-ups out', () => {
    expect(formatSetsLine([s(40, 10, 'warmup'), s(30, 12), s(30, 10)], wr, fmt)).toBe('30 kg × 12/10');
  });
  it('shows reps only for bodyweight exercises', () => {
    expect(formatSetsLine([s(null, 8), s(null, 7), s(null, 7)], setFieldsFor('bodyweight_reps'), fmt)).toBe('8/7/7');
  });
  it('shows reps only for weighted-bodyweight sets done without extra weight', () => {
    expect(formatSetsLine([s(null, 8), s(0, 7)], setFieldsFor('weighted_bodyweight'), fmt)).toBe('8/7');
  });
  it('formats timed sets', () => {
    const t = (sec: number): LineSet => ({ ...s(null, null), durationSec: sec });
    expect(formatSetsLine([t(60), t(45)], setFieldsFor('duration'), fmt)).toBe('1:00/0:45');
  });
});

describe('isSetFilled', () => {
  it('rejects empty and zero sets', () => {
    expect(isSetFilled(s(null, null), setFieldsFor('weight_reps'))).toBe(false);
    expect(isSetFilled(s(0, 0), setFieldsFor('weight_reps'))).toBe(false);
  });
  it('accepts a set with any value', () => {
    expect(isSetFilled(s(60, null), setFieldsFor('weight_reps'))).toBe(true);
    expect(isSetFilled(s(null, 8), setFieldsFor('bodyweight_reps'))).toBe(true);
  });
  it('ignores fields the exercise does not use', () => {
    expect(isSetFilled(s(20, null), setFieldsFor('bodyweight_reps'))).toBe(false);
  });
});
