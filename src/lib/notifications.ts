import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'rest-timer';
let isConfigured = false;
let permissionGranted: boolean | null = null;

export async function configureNotifications(): Promise<void> {
  if (isConfigured) return;
  isConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
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

export async function scheduleRestDone(seconds: number, title: string, body: string): Promise<string | null> {
  try {
    const hasPermission = await ensureNotificationPermission();
    if (!hasPermission || seconds < 1) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, vibrate: [0, 300, 150, 300] },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelScheduledNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Уведомление могло уже сработать или быть удалено; делать нечего.
  }
}

export async function dismissAllPresentedNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // Скрытие делается по возможности; сбой не должен ломать приложение.
  }
}
