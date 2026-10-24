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

/** Одна строка текста «Ручки», уже привязанная к упражнению. */
export interface QuickEntryCommit {
  exerciseId: string;
  /** Уже в кг и метрах; пустой список = «только название». */
  sets: ({ type: SetType } & SetValues)[];
  /** Поля, которые надо включить на карточке, чтобы показать всё из строки (RIR, вес у подтягиваний). */
  extraFields: ExtraField[];
}

type LastPerformanceByExerciseId = Map<string, { sets: SetValues[] }>;

function hasAnyValue(set: SetValues): boolean {
  return set.weightKg != null || set.reps != null || set.durationSec != null || set.distanceM != null;
}

/** Объединение полей в общем порядке колонок, без дублей. */
export function mergeExtraFields(current: readonly ExtraField[], added: readonly ExtraField[]): ExtraField[] {
  const enabled = new Set([...current, ...added]);
  return EXTRA_FIELDS.filter((field) => enabled.has(field));
}

/** Карточка в процессе сборки: подходы из текста идут первыми, пустой план — после них. */
interface CardDraft {
  card: ActiveExercise;
  /** Выполненные подходы старой карточки: по позициям отдают id, completedAt, previous и RPE. */
  completedOldSets: ActiveSet[];
  parsedSets: ActiveSet[];
  /** Невыполненные подходы (план): новые строки занимают их по порядку, остаток идёт в конец. */
  planSets: ActiveSet[];
  lastSets: SetValues[] | undefined;
}

/** Вес из текста округлён до двух знаков в единицах пользователя; если он тот же, старый вес в кг точнее. */
function keepOldWeightIfSame(
  entryWeightKg: number | null,
  oldWeightKg: number | null | undefined,
): number | null {
  if (entryWeightKg == null || oldWeightKg == null) return entryWeightKg;
  return Math.abs(entryWeightKg - oldWeightKg) < 0.01 ? oldWeightKg : entryWeightKg;
}

function toActiveSet(
  entrySet: QuickEntryCommit['sets'][number],
  oldSet: ActiveSet | undefined,
  previousFromHistory: SetValues | null,
  now: number,
): ActiveSet {
  return {
    id: oldSet?.id ?? newId(),
    ...entrySet,
    weightKg: keepOldWeightIfSame(entrySet.weightKg, oldSet?.weightKg),
    // RPE в текст не попадает, поэтому у подхода на том же месте он сохраняется.
    rpe: entrySet.rpe ?? oldSet?.rpe ?? null,
    completed: true,
    completedAt: oldSet?.completed ? oldSet.completedAt : now,
    previous: oldSet?.previous ?? previousFromHistory,
  };
}

/**
 * Собирает тренировку заново из строк текста: упражнения в порядке строк, подходы из текста
 * выполнены, у существующих карточек сохраняются заметка, отдых, суперсет, поля и пустой план,
 * карточки без строки удаляются.
 */
export function rebuildWorkoutFromLines(
  workout: ActiveWorkout,
  commits: QuickEntryCommit[],
  lastPerformanceByExerciseId: LastPerformanceByExerciseId,
  rememberedExtraFieldsByExerciseId: Map<string, ExtraField[]>,
  now: number,
): ActiveWorkout {
  const drafts: CardDraft[] = [];

  for (const commit of commits) {
    // N-я строка упражнения идёт в N-ю его карточку (упражнение можно добавить дважды); лишние строки — в последнюю.
    const sameExerciseDrafts = drafts.filter((candidate) => candidate.card.exerciseId === commit.exerciseId);
    const oldCards = workout.exercises.filter((exercise) => exercise.exerciseId === commit.exerciseId);
    const nextOldCard = oldCards[sameExerciseDrafts.length];
    let draft = nextOldCard ? undefined : sameExerciseDrafts[sameExerciseDrafts.length - 1];
    if (!draft) {
      draft = startDraft(nextOldCard, commit, lastPerformanceByExerciseId, rememberedExtraFieldsByExerciseId);
      drafts.push(draft);
    }
    draft.card = { ...draft.card, extraFields: mergeExtraFields(draft.card.extraFields, commit.extraFields) };
    for (const entrySet of commit.sets) {
      const position = draft.parsedSets.length;
      // Сначала выполненные подходы по позициям, потом по порядку план, потом совсем новые.
      const oldSet = draft.completedOldSets[position] ?? draft.planSets.shift();
      draft.parsedSets.push(toActiveSet(entrySet, oldSet, draft.lastSets?.[position] ?? null, now));
    }
  }

  return {
    ...workout,
    exercises: drafts.map((draft) => ({
      ...draft.card,
      sets: [...draft.parsedSets, ...draft.planSets],
    })),
  };
}

function startDraft(
  oldCard: ActiveExercise | undefined,
  commit: QuickEntryCommit,
  lastPerformanceByExerciseId: LastPerformanceByExerciseId,
  rememberedExtraFieldsByExerciseId: Map<string, ExtraField[]>,
): CardDraft {
  const lastSets = lastPerformanceByExerciseId.get(commit.exerciseId)?.sets;
  if (oldCard) {
    return {
      card: oldCard,
      // Выполненные подходы без единого значения в текст не попали, поэтому позиции считаются без них.
      completedOldSets: oldCard.sets.filter((set) => set.completed && hasAnyValue(set)),
      parsedSets: [],
      planSets: oldCard.sets.filter((set) => !set.completed),
      lastSets,
    };
  }
  // Новая карточка «только название» получает пустые подходы из прошлого раза, как при добавлении из списка.
  const planSets = commit.sets.length === 0 ? makeSetsFromLastPerformance(lastSets) : [];
  return {
    card: {
      id: newId(),
      exerciseId: commit.exerciseId,
      supersetGroup: null,
      note: '',
      restSeconds: null,
      extraFields: rememberedExtraFieldsByExerciseId.get(commit.exerciseId) ?? [],
      sets: [],
    },
    completedOldSets: [],
    parsedSets: [],
    planSets,
    lastSets,
  };
}
