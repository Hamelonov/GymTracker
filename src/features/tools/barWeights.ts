import type { WeightUnit } from '@/domain/types';

/** Распространённые веса грифа для быстрого выбора, в единицах веса пользователя. */
export const BAR_WEIGHT_OPTIONS: Record<WeightUnit, number[]> = {
  kg: [20, 15, 10, 7.5],
  lb: [45, 35, 25, 15],
};
