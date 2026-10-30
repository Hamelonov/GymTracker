import { requireOptionalNativeModule } from 'expo';
import { Vibration } from 'react-native';

interface RestAlertNativeModule {
  vibrate(timings: number[], amplitudes: number[]): void;
  playSound(): void;
  schedule(delayMs: number, timings: number[], amplitudes: number[], playSoundInForeground: boolean): void;
  cancel(): void;
}

// Модуля нет в Expo Go и в сборках до 0.1.2: тогда работает обычная вибрация без звука.
const nativeModule = requireOptionalNativeModule<RestAlertNativeModule>('RestAlert');

/** Вибрация: паузы и импульсы по очереди, начиная с паузы; амплитуда 1–255 на каждый шаг. */
export interface VibrationPattern {
  timings: number[];
  amplitudes: number[];
}

export function vibrateWithPattern(pattern: VibrationPattern): void {
  if (pattern.timings.length === 0) return;
  if (nativeModule) nativeModule.vibrate(pattern.timings, pattern.amplitudes);
  else Vibration.vibrate(pattern.timings);
}

export function playAlertSound(): void {
  nativeModule?.playSound();
}

/** Возвращает false, если нативного модуля нет и сигнал придётся подать из JS. */
export function scheduleRestAlert(
  delayMs: number,
  pattern: VibrationPattern,
  playSoundInForeground: boolean,
): boolean {
  if (!nativeModule) return false;
  nativeModule.schedule(Math.max(0, delayMs), pattern.timings, pattern.amplitudes, playSoundInForeground);
  return true;
}

export function cancelRestAlert(): void {
  nativeModule?.cancel();
}

export type RestVibrationStrength = 'off' | 'light' | 'medium' | 'strong';

export const REST_VIBRATION_STRENGTHS: RestVibrationStrength[] = ['off', 'light', 'medium', 'strong'];

// Сила задаётся и амплитудой, и длиной импульсов: на телефонах без управления амплитудой
// разница остаётся заметной за счёт длины.
const REST_VIBRATION_PATTERNS: Record<RestVibrationStrength, VibrationPattern> = {
  off: { timings: [], amplitudes: [] },
  light: { timings: [0, 150, 150, 150], amplitudes: [0, 80, 0, 80] },
  medium: { timings: [0, 300, 150, 300], amplitudes: [0, 170, 0, 170] },
  strong: { timings: [0, 500, 150, 500, 150, 500], amplitudes: [0, 255, 0, 255, 0, 255] },
};

export function restVibrationPattern(strength: RestVibrationStrength): VibrationPattern {
  return REST_VIBRATION_PATTERNS[strength];
}
