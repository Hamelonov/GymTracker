import { newId } from '@/domain/ids';
import { EMPTY_SET_VALUES, type ActiveSet, type SetType, type SetValues } from '@/domain/types';

export function makeSet(
  previous: SetValues | null,
  type: SetType = 'normal',
  initialValues?: SetValues,
): ActiveSet {
  return {
    id: newId(),
    type,
    completed: false,
    completedAt: null,
    previous,
    ...EMPTY_SET_VALUES,
    ...(initialValues ?? {}),
  };
}

/** Пустые подходы, заранее заполненные «прошлыми» значениями с прошлого выполнения упражнения. */
export function makeSetsFromLastPerformance(lastSets: SetValues[] | undefined): ActiveSet[] {
  const setCount = Math.max(1, lastSets?.length ?? 0);
  return Array.from({ length: setCount }, (_, setIndex) => makeSet(lastSets?.[setIndex] ?? null));
}
