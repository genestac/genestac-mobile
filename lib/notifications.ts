import { Platform } from 'react-native';
import { NotificationPreferences } from './notificationStorage';

// Lazy reference to expo-notifications module
let NotificationsModule: typeof import('expo-notifications') | null = null;
let isHandlerSet = false;

function getNotificationsModule() {
  if (Platform.OS === 'web') return null;

  if (!NotificationsModule) {
    try {
      const mod = require('expo-notifications');
      if (mod) {
        NotificationsModule = mod;
        if (!isHandlerSet) {
          mod.setNotificationHandler({
            handleNotification: async () => ({
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowList: true,
              shouldShowBanner: true,
            }),
          });
          isHandlerSet = true;
        }
      }
    } catch (error) {
      console.warn(
        '[Notifications] expo-notifications is not available in current build environment.',
        error
      );
      return null;
    }
  }
  return NotificationsModule;
}

/**
 * Check if local notifications are supported in current environment
 */
export function isNotificationsSupported(): boolean {
  return getNotificationsModule() !== null;
}

/**
 * Request user permission for notifications
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Create Android Notification Channels
 */
export async function setupNotificationChannels(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('lifestyle-reminders', {
        name: 'Lifestyle & Habit Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
        sound: 'default',
      });
    } catch (error) {
      console.error('Error setting up notification channel:', error);
    }
  }
}

/**
 * Synchronize local notification schedules with user preferences
 */
export async function syncAllNotifications(
  prefs: NotificationPreferences
): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    console.log('[Notifications] Native notification module is not active in current build.');
    return;
  }

  try {
    // 1. Clear existing schedules first
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Check permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Notification permission not granted.');
      return;
    }

    await setupNotificationChannels();

    // 2. Schedule Water Intake Reminders (Every N hours)
    if (prefs.waterRemindersEnabled && prefs.waterIntervalHours > 0) {
      const seconds = prefs.waterIntervalHours * 3600;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Hydration Time!',
          body: 'Time to drink a glass of water to maintain focus and vitality.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: true,
          channelId: 'lifestyle-reminders',
        },
      });
    }

    // 3. Schedule Hourly Step & Movement Reminders
    if (prefs.stepRemindersEnabled) {
      for (let hour = prefs.stepStartHour; hour <= prefs.stepEndHour; hour++) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚶 Movement Break',
            body: 'Aim for 250 steps this hour! A quick walk boosts metabolism and focus.',
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute: 50, // Remind at :50 of each hour
            channelId: 'lifestyle-reminders',
          },
        });
      }
    }

    // 4. Schedule Daily 4:00 PM Caffeine Cutoff Reminder
    if (prefs.caffeineCutoffEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '☕ Caffeine Cutoff Time',
          body: `It's ${formatTime(
            prefs.caffeineCutoffHour,
            prefs.caffeineCutoffMinute
          )}! Time to stop caffeine intake to protect nighttime sleep & deep recovery.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: prefs.caffeineCutoffHour,
          minute: prefs.caffeineCutoffMinute,
          channelId: 'lifestyle-reminders',
        },
      });
    }

    // 5. Schedule Daily 10:30 PM Bedtime & Wind-Down Reminder
    if (prefs.sleepReminderEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Bedtime & Sleep Wind-Down',
          body: `It's ${formatTime(
            prefs.sleepReminderHour,
            prefs.sleepReminderMinute
          )}! Time to disconnect screens, relax, and get ready for deep restorative sleep.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: prefs.sleepReminderHour,
          minute: prefs.sleepReminderMinute,
          channelId: 'lifestyle-reminders',
        },
      });
    }

    console.log('[Notifications] All lifestyle reminders synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing notifications:', error);
  }
}

/**
 * Format hour & minute into readable string (e.g. 16:00 -> 4:00 PM)
 */
function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute < 10 ? `0${minute}` : minute;
  return `${displayHour}:${displayMinute} ${ampm}`;
}
