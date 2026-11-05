import type { ExtraField } from '@/domain/types';
import { layout, spacing } from '@/ui/tokens';

// Общие для строки подхода и подписей колонок: разойдись они, столбцы перестанут совпадать.
export const SET_COLUMN_WIDTHS = {
  setNumber: 32,
  checkButton: layout.checkButtonWidth,
};

/** Доля колонки «прошлый» относительно основных полей. */
export const PREVIOUS_COLUMN_FLEX = 1.15;

/** Доля ширины узких колонок RIR и RPE относительно основных. */
export const NARROW_COLUMN_FLEX = 0.75;

const SET_COLUMN_GAP = spacing.sm;
const DENSE_SET_COLUMN_GAP = 6;

export function getSetColumnGap(isDense: boolean | undefined): number {
  return isDense ? DENSE_SET_COLUMN_GAP : SET_COLUMN_GAP;
}

/** Стабильная пустая ссылка для карточек без дополнительных колонок (редактор программ). */
export const NO_EXTRA_FIELDS: ExtraField[] = [];
