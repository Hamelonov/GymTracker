import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import { create } from 'zustand';
import { cancelScheduledNotification, scheduleRestDone } from '@/lib/notifications';
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

export const useRestTimer = create<RestTimerState>((set, get) => {
  /** Schedule the "rest is over" notification for the timer that ends at `endsAt`. */
  const scheduleNotification = (seconds: number, endsAt: number) => {
    if (!useSettings.getState().restNotifications) return;
    void scheduleRestDone(seconds, i18n.t('workout.restDone'), i18n.t('workout.restDoneBody')).then(
      (notificationId) => {
        // Only keep it if the timer wasn't replaced meanwhile.
        if (get().endsAt === endsAt) set({ notificationId });
        else void cancelScheduledNotification(notificationId);
      },
    );
  };

  return {
    endsAt: null,
    totalSec: 0,
    notificationId: null,
    start: (seconds) => {
      void cancelScheduledNotification(get().notificationId);
      const endsAt = Date.now() + seconds * 1000;
      set({ endsAt, totalSec: seconds, notificationId: null });
      scheduleNotification(seconds, endsAt);
    },
    adjust: (deltaSec) => {
      const { endsAt, totalSec } = get();
      if (endsAt == null) return;
      const remainingSeconds = Math.max(0, (endsAt - Date.now()) / 1000) + deltaSec;
      if (remainingSeconds <= 0) {
        get().skip();
        return;
      }
      const newTotalSec = Math.max(1, totalSec + deltaSec);
      // Restart with the new remaining time so the notification is rescheduled.
      void cancelScheduledNotification(get().notificationId);
      const newEndsAt = Date.now() + remainingSeconds * 1000;
      set({ endsAt: newEndsAt, totalSec: newTotalSec, notificationId: null });
      scheduleNotification(remainingSeconds, newEndsAt);
    },
    skip: () => {
      void cancelScheduledNotification(get().notificationId);
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
  };
});
