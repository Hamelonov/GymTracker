import type { WorkoutSummary } from '@/db/repo/workouts';
import { buildHistoryRows, findMonthRowForIndex } from '../historyRows';

function makeWorkout(id: string, year: number, monthIndex: number, day: number): WorkoutSummary {
  return { id, startedAt: new Date(year, monthIndex, day, 12).getTime() } as WorkoutSummary;
}

describe('buildHistoryRows', () => {
  it('ставит строку месяца перед тренировками этого месяца и считает их', () => {
    const rows = buildHistoryRows([
      makeWorkout('a', 2026, 9, 31),
      makeWorkout('b', 2026, 9, 5),
      makeWorkout('c', 2026, 8, 20),
    ]);

    expect(rows.map((row) => row.kind)).toEqual(['month', 'workout', 'workout', 'month', 'workout']);
    expect(rows[0]).toMatchObject({ key: '2026-10', workoutCount: 2 });
    expect(rows[3]).toMatchObject({ key: '2026-09', workoutCount: 1 });
  });

  it('возвращает пустой список без тренировок', () => {
    expect(buildHistoryRows([])).toEqual([]);
  });
});

describe('findMonthRowForIndex', () => {
  const rows = buildHistoryRows([
    makeWorkout('a', 2026, 9, 31),
    makeWorkout('b', 2026, 9, 5),
    makeWorkout('c', 2026, 8, 20),
  ]);

  it('для строки тренировки находит её месяц', () => {
    expect(findMonthRowForIndex(rows, 2)?.key).toBe('2026-10');
    expect(findMonthRowForIndex(rows, 4)?.key).toBe('2026-09');
  });

  it('для строки месяца возвращает её саму', () => {
    expect(findMonthRowForIndex(rows, 3)?.key).toBe('2026-09');
  });

  it('за пределами списка ничего не находит', () => {
    expect(findMonthRowForIndex(rows, -1)).toBeUndefined();
    expect(findMonthRowForIndex([], 0)).toBeUndefined();
  });
});
