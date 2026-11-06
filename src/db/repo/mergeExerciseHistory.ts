import type { ExerciseHistoryEntry } from './exercises';

/** Одна и та же заметка в каждом круге показывается один раз. */
function joinDistinctNotes(notes: string[]): string {
  const filledNotes = notes.filter((note) => note.length > 0);
  return [...new Set(filledNotes)].join('\n');
}

/** Группы в порядке первого появления ключа. */
function groupInOrder<Item>(items: Item[], getKey: (item: Item) => string): Item[][] {
  const groupByKey = new Map<string, Item[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groupByKey.get(key) ?? [];
    group.push(item);
    groupByKey.set(key, group);
  }
  return [...groupByKey.values()];
}

/**
 * Склеивает записи одной тренировки. В круговой тренировке упражнение встречается в каждом круге
 * отдельной записью, но для истории это один день: подходы идут подряд, «5/4/3».
 * Записи должны приходить в порядке выполнения.
 */
export function mergeEntriesOfSameWorkout(entries: ExerciseHistoryEntry[]): ExerciseHistoryEntry[] {
  const mergedEntries: ExerciseHistoryEntry[] = [];
  for (const rounds of groupInOrder(entries, (entry) => entry.workoutId)) {
    const [firstRound] = rounds;
    if (!firstRound) continue;
    mergedEntries.push({
      ...firstRound,
      note: joinDistinctNotes(rounds.map((round) => round.note)),
      sets: rounds.flatMap((round) => round.sets),
    });
  }
  return mergedEntries;
}

/**
 * То же для страницы тренировки: круги одного упражнения становятся одним блоком на месте
 * первого круга, иначе три подхода выглядят как три упражнения по одному подходу.
 * Только для показа: запись тренировки и её правка работают с кругами как есть.
 */
export function mergeRepeatedExercises<SetItem, Exercise extends RepeatableExercise<SetItem>>(
  exercises: Exercise[],
): Exercise[] {
  const mergedExercises: Exercise[] = [];
  for (const rounds of groupInOrder(exercises, (exercise) => exercise.exerciseId)) {
    const [firstRound] = rounds;
    if (!firstRound) continue;
    mergedExercises.push({
      ...firstRound,
      note: joinDistinctNotes(rounds.map((round) => round.note)),
      sets: rounds.flatMap((round) => round.sets),
    });
  }
  return mergedExercises;
}

interface RepeatableExercise<SetItem> {
  exerciseId: string;
  note: string;
  sets: SetItem[];
}
