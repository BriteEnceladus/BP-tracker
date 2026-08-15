import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_KEY = 'bp_daily_reminder_enabled';

export async function isDailyReminderEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(REMINDER_KEY);
  return raw === '1';
}

export async function setDailyReminderEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(REMINDER_KEY, enabled ? '1' : '0');

  if (Platform.OS === 'web') {
    return;
  }

  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!enabled) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    await AsyncStorage.setItem(REMINDER_KEY, '0');
    throw new Error('Notification permission was not granted');
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to log your BP',
      body: 'Record your blood pressure and heart rate for today.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
}
