import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import { create } from 'zustand';
import { cancelScheduled, scheduleRestDone } from '@/lib/notifications';
import i18n from '@/i18n';
import { useSettings } from './settings';

interface RestTimerState {
  /** Absolute end timestamp (ms) or null when idle. */
  endsAt: number | null;
  totalSec: number;
  notificationId: string | null;
  start: (seconds: number) => void;
  adjust: (deltaSec: number) => void;
  skip: () => void;
  /** Called by the UI tick when the timer reaches zero. */
  finish: () => void;
}

export const useRestTimer = create<RestTimerState>((set, get) => ({
  endsAt: null,
  totalSec: 0,
  notificationId: null,
  start: (seconds) => {
    const prev = get().notificationId;
    void cancelScheduled(prev);
    const endsAt = Date.now() + seconds * 1000;
    set({ endsAt, totalSec: seconds, notificationId: null });
    if (useSettings.getState().restNotifications) {
      void scheduleRestDone(seconds, i18n.t('workout.restDone'), i18n.t('workout.restDoneBody')).then((id) => {
        // Only keep if the timer wasn't replaced meanwhile.
        if (get().endsAt === endsAt) set({ notificationId: id });
        else void cancelScheduled(id);
      });
    }
  },
  adjust: (deltaSec) => {
    const { endsAt, totalSec } = get();
    if (endsAt == null) return;
    const remaining = Math.max(0, (endsAt - Date.now()) / 1000) + deltaSec;
    if (remaining <= 0) {
      get().skip();
      return;
    }
    const newTotal = Math.max(1, totalSec + deltaSec);
    // Restart with the new remaining time so the notification is rescheduled.
    const prev = get().notificationId;
    void cancelScheduled(prev);
    const newEnds = Date.now() + remaining * 1000;
    set({ endsAt: newEnds, totalSec: newTotal, notificationId: null });
    if (useSettings.getState().restNotifications) {
      void scheduleRestDone(remaining, i18n.t('workout.restDone'), i18n.t('workout.restDoneBody')).then((id) => {
        if (get().endsAt === newEnds) set({ notificationId: id });
        else void cancelScheduled(id);
      });
    }
  },
  skip: () => {
    void cancelScheduled(get().notificationId);
    set({ endsAt: null, totalSec: 0, notificationId: null });
  },
  finish: () => {
    if (get().endsAt == null) return;
    set({ endsAt: null, totalSec: 0, notificationId: null });
    if (useSettings.getState().haptics) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate([0, 250, 120, 250]);
    }
  },
}));
