import { AppState } from 'react-native';
import { create } from 'zustand';
import {
  cancelRestDoneNotification,
  dismissAllPresentedNotifications,
  scheduleRestDoneNotification,
} from '@/lib/notifications';
import {
  cancelRestAlert,
  restVibrationPattern,
  scheduleRestAlert,
  vibrateWithPattern,
} from '@/lib/restAlert';
import i18n from '@/i18n';
import { useSettings } from './settings';

/** Если отдых кончился раньше этого, сигнал уже прозвучал, пока приложение было свёрнуто. */
const LATE_FINISH_MS = 2000;

interface RestTimerState {
  /** Абсолютное время окончания (мс) или null, когда таймер не идёт. */
  endsAt: number | null;
  totalSec: number;
  start: (seconds: number) => void;
  adjust: (deltaSec: number) => void;
  skip: () => void;
  /** Вызывается тиком интерфейса и при возврате в приложение, когда время вышло. */
  finish: () => void;
}

/** Нативный сигнал запланирован: тогда JS сам не вибрирует, чтобы не было двойного сигнала. */
let isNativeAlertScheduled = false;

/** Планирует сигнал внутри приложения и уведомление на случай, если приложение свёрнуто. */
function scheduleRestSignals(endsAt: number) {
  const settings = useSettings.getState();
  const delayMs = endsAt - Date.now();
  isNativeAlertScheduled = scheduleRestAlert(delayMs, restVibrationPattern(settings.restVibration), true);
  if (settings.restNotifications) {
    void scheduleRestDoneNotification(
      delayMs / 1000,
      i18n.t('workout.restDone'),
      i18n.t('workout.restDoneBody'),
    );
  }
}

function cancelRestSignals() {
  cancelRestAlert();
  isNativeAlertScheduled = false;
  void cancelRestDoneNotification();
}

export const useRestTimer = create<RestTimerState>((set, get) => ({
  endsAt: null,
  totalSec: 0,
  start: (seconds) => {
    cancelRestSignals();
    void dismissAllPresentedNotifications();
    const endsAt = Date.now() + seconds * 1000;
    set({ endsAt, totalSec: seconds });
    scheduleRestSignals(endsAt);
  },
  adjust: (deltaSec) => {
    const { endsAt, totalSec } = get();
    if (endsAt == null) return;
    const remainingSeconds = Math.max(0, (endsAt - Date.now()) / 1000) + deltaSec;
    if (remainingSeconds <= 0) {
      get().skip();
      return;
    }
    // Перезапускаем с новым остатком времени, чтобы сигнал и уведомление сдвинулись.
    cancelRestSignals();
    const newEndsAt = Date.now() + remainingSeconds * 1000;
    set({ endsAt: newEndsAt, totalSec: Math.max(1, totalSec + deltaSec) });
    scheduleRestSignals(newEndsAt);
  },
  skip: () => {
    cancelRestSignals();
    set({ endsAt: null, totalSec: 0 });
  },
  finish: () => {
    const { endsAt } = get();
    if (endsAt == null) return;
    set({ endsAt: null, totalSec: 0 });
    // Свёрнутому приложению уведомление ещё нужно: убираем его только на открытом экране.
    if (AppState.currentState !== 'active') return;
    void cancelRestDoneNotification();
    void dismissAllPresentedNotifications();
    const hasFinishedWhileAway = Date.now() - endsAt > LATE_FINISH_MS;
    // Сборки без нативного модуля сигналят из JS, но только если таймер кончился у нас на глазах.
    if (!isNativeAlertScheduled && !hasFinishedWhileAway) {
      vibrateWithPattern(restVibrationPattern(useSettings.getState().restVibration));
    }
    isNativeAlertScheduled = false;
  },
}));

/** При возврате в приложение убирает уведомление и закрывает таймер, если время уже вышло. */
export function syncRestTimerOnAppActive() {
  void dismissAllPresentedNotifications();
  const { endsAt, finish } = useRestTimer.getState();
  if (endsAt != null && Date.now() >= endsAt) finish();
}
