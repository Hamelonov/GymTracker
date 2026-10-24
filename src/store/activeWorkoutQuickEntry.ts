import { newId } from '@/domain/ids';
import {
  EXTRA_FIELDS,
  type ActiveExercise,
  type ActiveSet,
  type ActiveWorkout,
  type ExtraField,
  type SetType,
  type SetValues,
} from '@/domain/types';
import { makeSetsFromLastPerformance } from './activeWorkoutSets';

export interface QuickEntryCommit {
  exerciseId: string;
  /** Уже в кг и метрах; пустой список = «только название». */
  sets: ({ type: SetType } & SetValues)[];
  /** Поля, которые надо включить на карточке, чтобы показать всё из строки (RIR, вес у подтягиваний). */
  extraFields: ExtraField[];
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

/** Объединение полей карточки и полей из записи в общем порядке колонок, без дублей. */
function mergeExtraFields(current: readonly ExtraField[], added: readonly ExtraField[]): ExtraField[] {
  const enabled = new Set([...current, ...added]);
  return EXTRA_FIELDS.filter((field) => enabled.has(field));
}

function makeEmptyCard(exerciseId: string, sets: ActiveSet[]): ActiveExercise {
  return { id: newId(), exerciseId, supersetGroup: null, note: '', restSeconds: null, extraFields: [], sets };
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
  rememberedExtraFieldsByExerciseId: Map<string, ExtraField[]> = new Map(),
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
      // Новая карточка начинает с полей, запомненных у упражнения, как при добавлении из списка.
      card = { ...card, extraFields: rememberedExtraFieldsByExerciseId.get(commit.exerciseId) ?? [] };
      exercises = [...exercises, card];
    }
    const cardId = card.id;
    if (!touchedCardIds.includes(cardId)) touchedCardIds.push(cardId);
    const extraFields = mergeExtraFields(card.extraFields, commit.extraFields);
    if (commit.sets.length === 0) {
      exercises = exercises.map((exercise) =>
        exercise.id === cardId ? { ...exercise, extraFields } : exercise,
      );
      continue;
    }

    const updatedSets = fillSets(card, commit.sets, lastSets, now);
    exercises = exercises.map((exercise) =>
      exercise.id === cardId ? { ...exercise, extraFields, sets: updatedSets } : exercise,
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
