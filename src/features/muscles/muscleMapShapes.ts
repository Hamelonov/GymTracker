import type { BodySide, MuscleRegion } from './muscleRegions';

/** Силуэт и зоны нарисованы в системе координат 100 × 200; по оси X фигура симметрична относительно 50. */
export const BODY_VIEWBOX = '0 0 100 200';

/** Отражает контур относительно вертикальной оси: правая половина тела получается из левой. */
function mirror(path: string): string {
  return path.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (match, x, y) => `${100 - Number(x)} ${y}`);
}

const HEAD = 'M 50 5 C 56 5 61 10 61 17 C 61 24 56 29 50 29 C 44 29 39 24 39 17 C 39 10 44 5 50 5 Z';
const NECK = 'M 45 27 L 55 27 L 56 37 L 44 37 Z';
const TORSO =
  'M 26 37 L 74 37 C 79 38 80 42 79 48 L 73 98 L 74 114 L 26 114 L 27 98 L 21 48 C 20 42 21 38 26 37 Z';
const LEFT_UPPER_ARM = 'M 22 39 L 12 43 C 9 45 9 48 9 52 L 8 74 L 19 75 L 24 50 Z';
const LEFT_FOREARM = 'M 8 74 L 19 75 L 17 104 L 6 103 Z';
const LEFT_HAND = 'M 6 103 L 17 104 L 16 114 C 13 118 8 118 5 114 Z';
const LEFT_THIGH = 'M 27 114 L 49 114 L 47 160 L 30 160 Z';
const LEFT_SHIN = 'M 30 160 L 47 160 L 45 190 C 44 196 33 196 32 190 Z';

/** Контуры тела, одинаковые спереди и сзади. */
export const BODY_OUTLINE: string[] = [
  HEAD,
  NECK,
  TORSO,
  LEFT_UPPER_ARM,
  mirror(LEFT_UPPER_ARM),
  LEFT_FOREARM,
  mirror(LEFT_FOREARM),
  LEFT_HAND,
  mirror(LEFT_HAND),
  LEFT_THIGH,
  mirror(LEFT_THIGH),
  LEFT_SHIN,
  mirror(LEFT_SHIN),
];

/** Каждая зона — один или два контура (левая и правая половины). */
const FRONT_SHAPES: Partial<Record<MuscleRegion, string[]>> = {
  neck: ['M 46 28 L 54 28 L 55 37 L 45 37 Z'],
  shouldersFront: [
    'M 24 39 C 18 40 14 44 13 50 L 22 52 C 23 46 26 42 30 40 Z',
    mirror('M 24 39 C 18 40 14 44 13 50 L 22 52 C 23 46 26 42 30 40 Z'),
  ],
  chest: [
    'M 30 40 L 49 40 L 49 60 C 42 64 32 62 27 54 Z',
    mirror('M 30 40 L 49 40 L 49 60 C 42 64 32 62 27 54 Z'),
  ],
  biceps: ['M 13 51 L 22 53 L 20 73 L 10 72 Z', mirror('M 13 51 L 22 53 L 20 73 L 10 72 Z')],
  forearmsFront: ['M 9 76 L 18 77 L 17 101 L 7 100 Z', mirror('M 9 76 L 18 77 L 17 101 L 7 100 Z')],
  abs: ['M 41 62 L 59 62 L 58 102 L 42 102 Z'],
  quads: ['M 30 117 L 47 117 L 46 157 L 32 157 Z', mirror('M 30 117 L 47 117 L 46 157 L 32 157 Z')],
};

const BACK_SHAPES: Partial<Record<MuscleRegion, string[]>> = {
  traps: ['M 44 28 L 56 28 L 68 40 L 60 50 L 40 50 L 32 40 Z'],
  shouldersBack: [
    'M 24 39 C 18 40 14 44 13 50 L 22 52 C 23 46 26 42 30 40 Z',
    mirror('M 24 39 C 18 40 14 44 13 50 L 22 52 C 23 46 26 42 30 40 Z'),
  ],
  upperBack: ['M 38 51 L 62 51 L 61 68 L 39 68 Z'],
  lats: [
    'M 27 50 L 38 52 L 39 70 L 40 88 L 31 94 L 25 70 Z',
    mirror('M 27 50 L 38 52 L 39 70 L 40 88 L 31 94 L 25 70 Z'),
  ],
  lowerBack: ['M 41 70 L 59 70 L 58 104 L 42 104 Z'],
  triceps: ['M 13 51 L 22 53 L 20 73 L 10 72 Z', mirror('M 13 51 L 22 53 L 20 73 L 10 72 Z')],
  forearmsBack: ['M 9 76 L 18 77 L 17 101 L 7 100 Z', mirror('M 9 76 L 18 77 L 17 101 L 7 100 Z')],
  glutes: [
    'M 28 106 L 49 106 L 49 130 C 42 134 32 132 29 126 Z',
    mirror('M 28 106 L 49 106 L 49 130 C 42 134 32 132 29 126 Z'),
  ],
  hamstrings: ['M 30 132 L 47 132 L 46 158 L 32 158 Z', mirror('M 30 132 L 47 132 L 46 158 L 32 158 Z')],
  calves: [
    'M 32 163 L 45 163 L 44 188 C 42 192 35 192 33 188 Z',
    mirror('M 32 163 L 45 163 L 44 188 C 42 192 35 192 33 188 Z'),
  ],
};

export function shapesForSide(side: BodySide): Partial<Record<MuscleRegion, string[]>> {
  return side === 'front' ? FRONT_SHAPES : BACK_SHAPES;
}
