import type { WorkoutSummary } from '@/db/repo/workouts';
import { buildHistoryRows, findMonthRowIndices } from '../historyRows';

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

  it('находит индексы строк-месяцев', () => {
    const rows = buildHistoryRows([makeWorkout('a', 2026, 9, 31), makeWorkout('b', 2026, 8, 1)]);
    expect(findMonthRowIndices(rows)).toEqual([0, 2]);
  });
});
