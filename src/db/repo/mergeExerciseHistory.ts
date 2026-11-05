import type { ExerciseHistoryEntry } from './exercises';

/** Одна и та же заметка в каждом круге показывается один раз. */
function joinDistinctNotes(rounds: ExerciseHistoryEntry[]): string {
  const notes = rounds.map((round) => round.note).filter((note) => note.length > 0);
  return [...new Set(notes)].join('\n');
}

/**
 * Склеивает записи одной тренировки. В круговой тренировке упражнение встречается в каждом круге
 * отдельной записью, но для истории это один день: подходы идут подряд, «5/4/3».
 * Записи должны приходить в порядке выполнения.
 */
export function mergeEntriesOfSameWorkout(entries: ExerciseHistoryEntry[]): ExerciseHistoryEntry[] {
  const roundsByWorkoutId = new Map<string, ExerciseHistoryEntry[]>();
  for (const entry of entries) {
    const rounds = roundsByWorkoutId.get(entry.workoutId) ?? [];
    rounds.push(entry);
    roundsByWorkoutId.set(entry.workoutId, rounds);
  }

  const mergedEntries: ExerciseHistoryEntry[] = [];
  for (const rounds of roundsByWorkoutId.values()) {
    const [firstRound] = rounds;
    if (!firstRound) continue;
    mergedEntries.push({
      ...firstRound,
      note: joinDistinctNotes(rounds),
      sets: rounds.flatMap((round) => round.sets),
    });
  }
  return mergedEntries;
}
