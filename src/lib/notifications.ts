import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'rest-timer';
let configured = false;
let permissionGranted: boolean | null = null;

export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
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
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    permissionGranted = true;
    return true;
  }
  const req = await Notifications.requestPermissionsAsync();
  permissionGranted = req.granted;
  return req.granted;
}

export async function scheduleRestDone(seconds: number, title: string, body: string): Promise<string | null> {
  try {
    const ok = await ensureNotificationPermission();
    if (!ok || seconds < 1) return null;
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

export async function cancelScheduled(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}

export async function dismissAllPresented(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // ignore
  }
}
