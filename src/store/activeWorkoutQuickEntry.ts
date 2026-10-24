import { newId } from '@/domain/ids';
import type { ActiveExercise, ActiveSet, ActiveWorkout, SetType, SetValues } from '@/domain/types';
import { makeSetsFromLastPerformance } from './activeWorkoutSets';

export interface QuickEntryCommit {
  exerciseId: string;
  /** Уже в кг и метрах; пустой список = «только название». */
  sets: ({ type: SetType } & SetValues)[];
}

export interface QuickEntryOutcome {
  workout: ActiveWorkout;
  /** Карточки, которых коснулась запись, в порядке ввода, без повторов. */
  workoutExerciseIds: string[];
  /** Последняя карточка, куда реально добавлены подходы: от неё считается таймер отдыха. */
  lastWorkoutExerciseIdWithNewSets: string | null;
  addedSetCount: number;
}

type LastPerformanceByExerciseId = Map<string, { sets: SetValues[] }>;

function makeEmptyCard(exerciseId: string, sets: ActiveSet[]): ActiveExercise {
  return { id: newId(), exerciseId, supersetGroup: null, note: '', restSeconds: null, sets };
}

/**
 * Подходы из строки по порядку занимают первые незавершённые подходы карточки (запланированные из
 * программы или пустые), а когда те кончаются — дописываются в конец. Значения из прошлого раза
 * не подставляются: записывается ровно то, что напечатано.
 */
function fillSets(
  card: ActiveExercise,
  entrySets: QuickEntryCommit['sets'],
  lastSets: SetValues[] | undefined,
  now: number,
): ActiveSet[] {
  const remaining = [...entrySets];
  const filled = card.sets.map((set) => {
    const entrySet = set.completed ? undefined : remaining.shift();
    if (!entrySet) return set;
    return { ...set, ...entrySet, completed: true, completedAt: now };
  });
  const appended = remaining.map((entrySet, offset) => {
    const setIndex = filled.length + offset;
    return {
      id: newId(),
      ...entrySet,
      completed: true,
      completedAt: now,
      previous: lastSets?.[setIndex] ?? null,
    };
  });
  return [...filled, ...appended];
}

/** Применяет записи быстрого ввода к тренировке; чистая функция без обращения к базе и стору. */
export function applyQuickEntry(
  workout: ActiveWorkout,
  commits: QuickEntryCommit[],
  lastPerformanceByExerciseId: LastPerformanceByExerciseId,
  now: number,
): QuickEntryOutcome {
  let exercises = workout.exercises;
  const touchedCardIds: string[] = [];
  let lastWorkoutExerciseIdWithNewSets: string | null = null;
  let addedSetCount = 0;

  for (const commit of commits) {
    const lastSets = lastPerformanceByExerciseId.get(commit.exerciseId)?.sets;
    let card = exercises.find((exercise) => exercise.exerciseId === commit.exerciseId);
    if (!card) {
      // «Только название» без карточки — как добавление из списка: пустые подходы из прошлого раза.
      const initialSets = commit.sets.length === 0 ? makeSetsFromLastPerformance(lastSets) : [];
      card = makeEmptyCard(commit.exerciseId, initialSets);
      exercises = [...exercises, card];
    }
    const cardId = card.id;
    if (!touchedCardIds.includes(cardId)) touchedCardIds.push(cardId);
    if (commit.sets.length === 0) continue;

    const updatedSets = fillSets(card, commit.sets, lastSets, now);
    exercises = exercises.map((exercise) =>
      exercise.id === cardId ? { ...exercise, sets: updatedSets } : exercise,
    );
    addedSetCount += commit.sets.length;
    lastWorkoutExerciseIdWithNewSets = cardId;
  }

  return {
    workout: { ...workout, exercises },
    workoutExerciseIds: touchedCardIds,
    lastWorkoutExerciseIdWithNewSets,
    addedSetCount,
  };
}
