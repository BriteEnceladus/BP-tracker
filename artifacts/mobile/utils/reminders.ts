import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'bp_reminder_settings_v2';

export interface ReminderSettings {
  measurementEnabled: boolean;
  measurementHour: number;
  medicationEnabled: boolean;
  medicationHours: number[];
  glucoseEnabled: boolean;
  glucoseHour: number;
}

const DEFAULTS: ReminderSettings = {
  measurementEnabled: false,
  measurementHour: 8,
  medicationEnabled: false,
  medicationHours: [8, 20],
  glucoseEnabled: false,
  glucoseHour: 8,
};

export async function getReminderSettings(): Promise<ReminderSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    const legacy = await AsyncStorage.getItem('bp_daily_reminder_enabled');
    if (legacy === '1') return { ...DEFAULTS, measurementEnabled: true };
    return { ...DEFAULTS };
  }
  return { ...DEFAULTS, ...JSON.parse(raw) };
}

export async function isDailyReminderEnabled(): Promise<boolean> {
  const settings = await getReminderSettings();
  return settings.measurementEnabled;
}

export async function setDailyReminderEnabled(enabled: boolean): Promise<void> {
  const current = await getReminderSettings();
  await saveReminderSettings({ ...current, measurementEnabled: enabled });
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  await AsyncStorage.setItem('bp_daily_reminder_enabled', settings.measurementEnabled ? '1' : '0');
  await applyScheduledNotifications(settings);
}

async function applyScheduledNotifications(settings: ReminderSettings): Promise<void> {
  if (Platform.OS === 'web') return;

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

  if (settings.measurementEnabled || settings.medicationEnabled || settings.glucoseEnabled) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Notification permission was not granted');
    }
  }

  if (settings.measurementEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to log your BP',
        body: 'Record your blood pressure and heart rate for today.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.measurementHour,
        minute: 0,
      },
    });
  }

  if (settings.glucoseEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to log glucose',
        body: 'Record a glucose reading if your clinician asked you to check. Not medical advice.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.glucoseHour,
        minute: 0,
      },
    });
  }

  if (settings.medicationEnabled) {
    for (const hour of settings.medicationHours) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Medication reminder',
          body: 'If your clinician prescribed medication, take it as directed and mark it in the app.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
        },
      });
    }
  }
}
