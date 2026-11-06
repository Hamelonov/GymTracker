import type { SetRow } from '@/db/schema';
import type { ExerciseHistoryEntry } from '../exercises';
import { mergeEntriesOfSameWorkout, mergeRepeatedExercises } from '../mergeExerciseHistory';

function makeEntry(workoutId: string, reps: number[], note = ''): ExerciseHistoryEntry {
  return {
    workoutId,
    workoutName: 'Фулбади',
    startedAt: 1,
    note,
    sets: reps.map((repCount) => ({ reps: repCount }) as SetRow),
  };
}

const repsOf = (entry: ExerciseHistoryEntry | undefined) => entry?.sets.map((set) => set.reps);

describe('mergeEntriesOfSameWorkout', () => {
  it('склеивает круги одной тренировки в одну запись, подходы идут подряд', () => {
    const merged = mergeEntriesOfSameWorkout([
      makeEntry('circuit', [5]),
      makeEntry('circuit', [4]),
      makeEntry('circuit', [3]),
    ]);

    expect(merged).toHaveLength(1);
    expect(repsOf(merged[0])).toEqual([5, 4, 3]);
  });

  it('не трогает разные тренировки и сохраняет их порядок', () => {
    const merged = mergeEntriesOfSameWorkout([makeEntry('newer', [8]), makeEntry('older', [7])]);

    expect(merged.map((entry) => entry.workoutId)).toEqual(['newer', 'older']);
  });

  it('показывает одинаковую заметку кругов один раз', () => {
    const merged = mergeEntriesOfSameWorkout([
      makeEntry('circuit', [5], 'Плавно'),
      makeEntry('circuit', [4], 'Плавно'),
    ]);

    expect(merged[0]?.note).toBe('Плавно');
  });

  it('узнаёт повтор и у заметки из нескольких строк', () => {
    const note = 'Первый подход быстрой техникой.\nСо второго плавнее';
    const merged = mergeEntriesOfSameWorkout([
      makeEntry('circuit', [5], note),
      makeEntry('circuit', [5], note),
      makeEntry('circuit', [5], note),
    ]);

    expect(merged[0]?.note).toBe(note);
  });

  it('разные заметки кругов ставит друг под другом, пустые пропускает', () => {
    const merged = mergeEntriesOfSameWorkout([
      makeEntry('circuit', [5]),
      makeEntry('circuit', [4], 'Тяжело'),
      makeEntry('circuit', [3], 'Отказ'),
    ]);

    expect(merged[0]?.note).toBe('Тяжело\nОтказ');
  });

  it('не меняет исходные записи', () => {
    const firstRound = makeEntry('circuit', [5]);

    mergeEntriesOfSameWorkout([firstRound, makeEntry('circuit', [4])]);

    expect(firstRound.sets).toHaveLength(1);
  });
});

describe('mergeRepeatedExercises', () => {
  const makeRound = (id: string, exerciseId: string, reps: number[], note = '') => ({
    id,
    exerciseId,
    note,
    sets: reps.map((repCount) => ({ reps: repCount })),
  });

  it('собирает круги упражнения в один блок на месте первого круга', () => {
    const merged = mergeRepeatedExercises([
      makeRound('first', 'pull-up', [5]),
      makeRound('second', 'squat', [20]),
      makeRound('third', 'pull-up', [4]),
      makeRound('fourth', 'squat', [18]),
      makeRound('fifth', 'pull-up', [3]),
    ]);

    expect(merged.map((exercise) => exercise.id)).toEqual(['first', 'second']);
    expect(merged[0]?.sets.map((set) => set.reps)).toEqual([5, 4, 3]);
    expect(merged[1]?.sets.map((set) => set.reps)).toEqual([20, 18]);
  });

  it('заметку кругов показывает один раз', () => {
    const merged = mergeRepeatedExercises([
      makeRound('first', 'pull-up', [5], 'Плавно'),
      makeRound('second', 'pull-up', [4], 'Плавно'),
    ]);

    expect(merged[0]?.note).toBe('Плавно');
  });

  it('обычную тренировку оставляет как есть', () => {
    const rounds = [makeRound('first', 'pull-up', [5, 4]), makeRound('second', 'squat', [20])];

    expect(mergeRepeatedExercises(rounds)).toEqual(rounds);
  });
});
