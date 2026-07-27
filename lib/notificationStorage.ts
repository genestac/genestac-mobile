import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreferences {
  waterRemindersEnabled: boolean;
  waterIntervalHours: number; // e.g. 2 hours
  
  stepRemindersEnabled: boolean;
  stepStartHour: number; // e.g. 9 (9 AM)
  stepEndHour: number; // e.g. 18 (6 PM)
  
  caffeineCutoffEnabled: boolean;
  caffeineCutoffHour: number; // e.g. 16 (4 PM)
  caffeineCutoffMinute: number; // e.g. 0

  sleepReminderEnabled: boolean;
  sleepReminderHour: number; // e.g. 22 (10 PM)
  sleepReminderMinute: number; // e.g. 30 (10:30 PM)
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  waterRemindersEnabled: true,
  waterIntervalHours: 1,
  
  stepRemindersEnabled: true,
  stepStartHour: 9,
  stepEndHour: 18,
  
  caffeineCutoffEnabled: true,
  caffeineCutoffHour: 16, // 4 PM
  caffeineCutoffMinute: 0,

  sleepReminderEnabled: true,
  sleepReminderHour: 22, // 10 PM
  sleepReminderMinute: 30, // 10:30 PM
};

const STORAGE_KEY = '@genestac_notification_prefs';

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
  } catch (error) {
    console.error('Error reading notification preferences:', error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving notification preferences:', error);
  }
}
