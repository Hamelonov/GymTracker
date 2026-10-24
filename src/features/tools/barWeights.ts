import type { WeightUnit } from '@/domain/types';

/** Common barbell weights offered as quick picks, in the user's weight unit. */
export const BAR_WEIGHT_OPTIONS: Record<WeightUnit, number[]> = {
  kg: [20, 15, 10, 7.5],
  lb: [45, 35, 25, 15],
};
