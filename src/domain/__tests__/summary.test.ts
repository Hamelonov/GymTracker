import {
  formatSetsLine,
  groupSets,
  isSetFilled,
  pickRecordMetric,
  recordGain,
  type LineSet,
} from '../summary';
import { getSetFieldsForExerciseType, type RecordHit, type SetType } from '../types';

const formatters = {
  weight: (kg: number) => `${kg} kg`,
  duration: (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
  distance: (meters: number) => `${meters / 1000} km`,
};

const makeSet = (weightKg: number | null, reps: number | null, type: SetType = 'normal'): LineSet => ({
  weightKg,
  reps,
  durationSec: null,
  distanceM: null,
  rpe: null,
  type,
});

const hit = (type: RecordHit['type'], value: number, previous: number | null): RecordHit => ({
  type,
  value,
  previous,
});

describe('pickRecordMetric', () => {
  it('shows weight for a weighted exercise when the weight record moved', () => {
    expect(
      pickRecordMetric(getSetFieldsForExerciseType('weight_reps'), [
        hit('weight', 42.5, 40),
        hit('reps', 10, 8),
      ]),
    ).toBe('weight');
  });
  it('shows reps for a weighted exercise when only reps improved', () => {
    expect(
      pickRecordMetric(getSetFieldsForExerciseType('weight_reps'), [
        hit('reps', 12, 10),
        hit('volume', 480, 400),
      ]),
    ).toBe('reps');
  });
  it('never shows weight for bodyweight exercises', () => {
    expect(pickRecordMetric(getSetFieldsForExerciseType('bodyweight_reps'), [hit('reps', 15, 12)])).toBe(
      'reps',
    );
  });
  it('uses distance or time for cardio', () => {
    expect(
      pickRecordMetric(getSetFieldsForExerciseType('distance_duration'), [hit('distance', 5000, 4000)]),
    ).toBe('distance');
    expect(pickRecordMetric(getSetFieldsForExerciseType('duration'), [hit('duration', 90, 60)])).toBe(
      'duration',
    );
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
  const weightRepsFields = getSetFieldsForExerciseType('weight_reps');
  it('groups sets with the same weight', () => {
    expect(
      formatSetsLine([makeSet(80, 8), makeSet(80, 7), makeSet(80, 6)], weightRepsFields, formatters),
    ).toBe('80 kg × 8 / 7 / 6');
  });
  it('splits groups when the weight changes', () => {
    expect(
      formatSetsLine([makeSet(82.5, 7), makeSet(82.5, 6), makeSet(80, 8)], weightRepsFields, formatters),
    ).toBe('82.5 kg × 7 / 6, 80 kg × 8');
  });
  it('exposes weight and reps separately for the table', () => {
    expect(
      groupSets([makeSet(82.5, 7), makeSet(82.5, 6), makeSet(80, 8)], weightRepsFields, formatters),
    ).toEqual([
      { weightKg: 82.5, values: ['7', '6'] },
      { weightKg: 80, values: ['8'] },
    ]);
  });
  it('leaves warm-ups out', () => {
    expect(
      formatSetsLine(
        [makeSet(40, 10, 'warmup'), makeSet(30, 12), makeSet(30, 10)],
        weightRepsFields,
        formatters,
      ),
    ).toBe('30 kg × 12 / 10');
  });
  it('shows reps only for bodyweight exercises', () => {
    expect(
      formatSetsLine(
        [makeSet(null, 8), makeSet(null, 7), makeSet(null, 7)],
        getSetFieldsForExerciseType('bodyweight_reps'),
        formatters,
      ),
    ).toBe('8 / 7 / 7');
  });
  it('shows reps only for weighted-bodyweight sets done without extra weight', () => {
    expect(
      formatSetsLine(
        [makeSet(null, 8), makeSet(0, 7)],
        getSetFieldsForExerciseType('weighted_bodyweight'),
        formatters,
      ),
    ).toBe('8 / 7');
  });
  it('formats timed sets', () => {
    const timedSet = (seconds: number): LineSet => ({ ...makeSet(null, null), durationSec: seconds });
    expect(
      formatSetsLine([timedSet(60), timedSet(45)], getSetFieldsForExerciseType('duration'), formatters),
    ).toBe('1:00 / 0:45');
  });
});

describe('isSetFilled', () => {
  it('rejects empty and zero sets', () => {
    expect(isSetFilled(makeSet(null, null), getSetFieldsForExerciseType('weight_reps'))).toBe(false);
    expect(isSetFilled(makeSet(0, 0), getSetFieldsForExerciseType('weight_reps'))).toBe(false);
  });
  it('accepts a set with any value', () => {
    expect(isSetFilled(makeSet(60, null), getSetFieldsForExerciseType('weight_reps'))).toBe(true);
    expect(isSetFilled(makeSet(null, 8), getSetFieldsForExerciseType('bodyweight_reps'))).toBe(true);
  });
  it('ignores fields the exercise does not use', () => {
    expect(isSetFilled(makeSet(20, null), getSetFieldsForExerciseType('bodyweight_reps'))).toBe(false);
  });
});
