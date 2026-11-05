import type { BodyPart, Slug } from 'react-native-body-highlighter';
// Внутренний путь пакета: версия в package.json закреплена точно, чтобы он не уехал при обновлении.
import { bodyBack } from 'react-native-body-highlighter/dist/assets/bodyBack';
import { bodyFront } from 'react-native-body-highlighter/dist/assets/bodyFront';
import type { MuscleGroup } from '@/domain/types';
import { slugsForMuscle } from './bodyHighlighterSlugs';

type Side = 'front' | 'back';

const partsBySide: Record<Side, readonly BodyPart[]> = { front: bodyFront, back: bodyBack };

// Спереди рисунок лежит в левой половине общего холста, сзади в правой.
const VIEW_BOX_BY_SIDE: Record<Side, string> = {
  front: '0 0 724 1448',
  back: '724 0 724 1448',
};

export function viewBoxForSide(side: Side): string {
  return VIEW_BOX_BY_SIDE[side];
}

/** Все контуры одной части тела одной строкой. */
function joinPartPaths(part: BodyPart): string[] {
  const path = part.path;
  if (!path) return [];
  return [...(path.common ?? []), ...(path.left ?? []), ...(path.right ?? [])];
}

function joinPaths(parts: readonly BodyPart[]): string {
  return parts.flatMap(joinPartPaths).join(' ');
}

const basePathCache = new Map<Side, string>();

/** Силуэт целиком: тело из трёх `Path` вместо семидесяти. */
export function basePathForSide(side: Side): string {
  const cached = basePathCache.get(side);
  if (cached !== undefined) return cached;
  const basePath = joinPaths(partsBySide[side]);
  basePathCache.set(side, basePath);
  return basePath;
}

const musclePathCache = new Map<string, string>();

/** Контуры выбранных мышц одной строкой, с кэшем: список упражнений просит одно и то же много раз. */
export function pathForMuscles(side: Side, muscles: readonly MuscleGroup[]): string {
  const cacheKey = `${side}:${muscles.join(',')}`;
  const cached = musclePathCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const slugs = new Set<Slug>(muscles.flatMap((muscle) => slugsForMuscle(muscle)));
  const matchingParts = partsBySide[side].filter((part) => part.slug != null && slugs.has(part.slug));
  const musclePath = joinPaths(matchingParts);
  musclePathCache.set(cacheKey, musclePath);
  return musclePath;
}
