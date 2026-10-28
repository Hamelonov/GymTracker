import { stringifyBackupAsync } from '../backupSerialization';

describe('stringifyBackupAsync', () => {
  it('creates the same JSON as JSON.stringify and reports progress across chunks', async () => {
    const backup = {
      app: 'gymtracker',
      version: 1,
      empty: [],
      workouts: Array.from({ length: 450 }, (_, index) => ({
        id: `workout-${index}`,
        note: index % 2 === 0 ? 'sets, "quoted"' : null,
      })),
    };
    const progressUpdates: [number, number][] = [];

    const content = await stringifyBackupAsync(backup, (current, total) => {
      progressUpdates.push([current, total]);
    });

    expect(content).toBe(JSON.stringify(backup));
    expect(JSON.parse(content)).toEqual(backup);
    expect(progressUpdates[progressUpdates.length - 1]).toEqual([453, 453]);
    expect(progressUpdates.some(([current]) => current === 203)).toBe(true);
  });
});
