import { isSetFilled, pickRecordMetric, recordGain } from '../summary';
import { getSetFieldsForExerciseType, type RecordHit, type SetType, type SetValues } from '../types';

const makeSet = (
  weightKg: number | null,
  reps: number | null,
  type: SetType = 'normal',
): SetValues & { type: SetType } => ({
  weightKg,
  reps,
  durationSec: null,
  distanceM: null,
  rpe: null,
  rir: null,
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
