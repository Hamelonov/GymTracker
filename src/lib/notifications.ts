import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'rest-timer';
/** Один постоянный идентификатор: новое уведомление заменяет старое, а не копится рядом. */
const REST_DONE_NOTIFICATION_ID = 'rest-timer-done';
let isConfigured = false;
let permissionGranted: boolean | null = null;

export async function configureNotifications(): Promise<void> {
  if (isConfigured) return;
  isConfigured = true;
  Notifications.setNotificationHandler({
    // Обработчик вызывается, только когда приложение открыто. Тогда об окончании отдыха
    // сообщают звук и вибрация в самом приложении, а уведомление не нужно.
    handleNotification: async (notification) => {
      const isRestDone = notification.request.identifier === REST_DONE_NOTIFICATION_ID;
      return {
        shouldShowBanner: !isRestDone,
        shouldShowList: !isRestDone,
        shouldPlaySound: !isRestDone,
        shouldSetBadge: false,
      };
    },
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rest timer',
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300],
      lightColor: '#FFD400',
    });
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionGranted != null) return permissionGranted;
  await configureNotifications();
  const existingPermission = await Notifications.getPermissionsAsync();
  if (existingPermission.granted) {
    permissionGranted = true;
    return true;
  }
  const requestedPermission = await Notifications.requestPermissionsAsync();
  permissionGranted = requestedPermission.granted;
  return requestedPermission.granted;
}

export async function scheduleRestDoneNotification(
  seconds: number,
  title: string,
  body: string,
): Promise<void> {
  try {
    const hasPermission = await ensureNotificationPermission();
    if (!hasPermission || seconds < 1) return;
    await Notifications.scheduleNotificationAsync({
      identifier: REST_DONE_NOTIFICATION_ID,
      content: { title, body, vibrate: [0, 300, 150, 300] },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    // Без уведомления таймер всё равно работает: сигнал подаст само приложение.
  }
}

export async function cancelRestDoneNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_DONE_NOTIFICATION_ID);
  } catch {
    // Уведомление могло уже сработать или быть удалено; делать нечего.
  }
}

/** Убирает из шторки все уведомления приложения: других, кроме таймера отдыха, у него нет. */
export async function dismissAllPresentedNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // Скрытие делается по возможности; сбой не должен ломать приложение.
  }
}
