import { Easing } from 'react-native-reanimated';

// Отдельно от tokens.ts: токены импортируют чистые модули и тесты, им Reanimated не нужен.
export const motionDuration = {
  press: 70,
  fast: 120,
  base: 160,
  sheetIn: 180,
  sheetOut: 140,
  slow: 200,
} as const;

// Сильный ease-out: движение начинается сразу, а не разгоняется.
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
export const easeInOut = Easing.bezier(0.77, 0, 0.175, 1);
