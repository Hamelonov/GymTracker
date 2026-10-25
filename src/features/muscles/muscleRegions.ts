import type { MuscleGroup } from '@/domain/types';

export type BodySide = 'front' | 'back';

/** Зоны силуэта, которые можно подсветить. Спереди и сзади у них разные контуры. */
export type MuscleRegion =
  | 'neck'
  | 'shouldersFront'
  | 'chest'
  | 'biceps'
  | 'forearmsFront'
  | 'abs'
  | 'quads'
  | 'traps'
  | 'shouldersBack'
  | 'upperBack'
  | 'lats'
  | 'lowerBack'
  | 'triceps'
  | 'forearmsBack'
  | 'glutes'
  | 'hamstrings'
  | 'calves';

export const FRONT_REGIONS: MuscleRegion[] = [
  'neck',
  'shouldersFront',
  'chest',
  'biceps',
  'forearmsFront',
  'abs',
  'quads',
];

export const BACK_REGIONS: MuscleRegion[] = [
  'traps',
  'shouldersBack',
  'upperBack',
  'lats',
  'lowerBack',
  'triceps',
  'forearmsBack',
  'glutes',
  'hamstrings',
  'calves',
];

const ALL_REGIONS: MuscleRegion[] = [...FRONT_REGIONS, ...BACK_REGIONS];

/** Какие зоны силуэта относятся к группе мышц из базы упражнений. */
const REGIONS_BY_MUSCLE: Record<MuscleGroup, MuscleRegion[]> = {
  chest: ['chest'],
  back: ['upperBack', 'lats'],
  lats: ['lats'],
  traps: ['traps'],
  lower_back: ['lowerBack'],
  shoulders: ['shouldersFront', 'shouldersBack'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearmsFront', 'forearmsBack'],
  abs: ['abs'],
  quads: ['quads'],
  hamstrings: ['hamstrings'],
  glutes: ['glutes'],
  calves: ['calves'],
  neck: ['neck'],
  // Кардио и «всё тело» подсвечивают весь силуэт: у них нет одной главной мышцы.
  cardio: ALL_REGIONS,
  full_body: ALL_REGIONS,
};

export function regionsForMuscle(muscle: MuscleGroup): MuscleRegion[] {
  return REGIONS_BY_MUSCLE[muscle];
}

/** Сторона, с которой основную мышцу видно; для превью в списке показывается только она. */
export function sideForMuscle(muscle: MuscleGroup): BodySide {
  const regions = regionsForMuscle(muscle);
  return regions.some((region) => FRONT_REGIONS.includes(region)) ? 'front' : 'back';
}

export type RegionEmphasis = 'primary' | 'secondary';

/** Подсветка зон: основная мышца перекрывает вспомогательную, если они делят зону. */
export function buildRegionEmphasis(
  primary: MuscleGroup,
  secondary: readonly MuscleGroup[],
): Map<MuscleRegion, RegionEmphasis> {
  const emphasisByRegion = new Map<MuscleRegion, RegionEmphasis>();
  for (const muscle of secondary) {
    for (const region of regionsForMuscle(muscle)) emphasisByRegion.set(region, 'secondary');
  }
  for (const region of regionsForMuscle(primary)) emphasisByRegion.set(region, 'primary');
  return emphasisByRegion;
}
