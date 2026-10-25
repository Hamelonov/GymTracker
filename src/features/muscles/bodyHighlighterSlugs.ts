import type { Slug } from 'react-native-body-highlighter';
import type { MuscleGroup } from '@/domain/types';

/** Зоны рисованного тела из react-native-body-highlighter для каждой группы мышц из базы. */
const SLUGS_BY_MUSCLE: Record<MuscleGroup, Slug[]> = {
  chest: ['chest'],
  back: ['upper-back', 'trapezius'],
  lats: ['upper-back'],
  traps: ['trapezius'],
  lower_back: ['lower-back'],
  shoulders: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  abs: ['abs', 'obliques'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  neck: ['neck'],
  // Кардио и «всё тело» подсвечивают основные мышечные массивы целиком.
  cardio: ['quadriceps', 'hamstring', 'calves', 'gluteal'],
  full_body: ['chest', 'upper-back', 'deltoids', 'quadriceps', 'hamstring', 'gluteal', 'abs'],
};

/** Группы, которых не видно спереди: для превью таких упражнений показывается спина. */
const BACK_ONLY_MUSCLES: MuscleGroup[] = [
  'back',
  'lats',
  'traps',
  'lower_back',
  'triceps',
  'hamstrings',
  'glutes',
  'calves',
];

export function slugsForMuscle(muscle: MuscleGroup): Slug[] {
  return SLUGS_BY_MUSCLE[muscle];
}

export function sideForMuscle(muscle: MuscleGroup): 'front' | 'back' {
  return BACK_ONLY_MUSCLES.includes(muscle) ? 'back' : 'front';
}

export interface HighlightedPart {
  slug: Slug;
  intensity: number;
}

/** Основная мышца — интенсивность 1 (ярко), вспомогательные — 2 (бледнее); основная перекрывает вспомогательную. */
export function buildHighlightedParts(
  primary: MuscleGroup,
  secondary: readonly MuscleGroup[],
): HighlightedPart[] {
  const intensityBySlug = new Map<Slug, number>();
  for (const muscle of secondary) {
    for (const slug of slugsForMuscle(muscle)) intensityBySlug.set(slug, 2);
  }
  for (const slug of slugsForMuscle(primary)) intensityBySlug.set(slug, 1);
  return [...intensityBySlug.entries()].map(([slug, intensity]) => ({ slug, intensity }));
}
