import { Platform } from 'react-native';
import {
  NotificationPreferences,
  getStoredSupplementSchedules,
} from './notificationStorage';

const CRM_API_URL = process.env.EXPO_PUBLIC_CRM_API_URL ?? '';

/**
 * Fire-and-forget: tell the CRM that the user opened a push notification.
 * Called from _layout.tsx whenever a notification tap is detected.
 */
export async function trackNotificationOpen(params: {
  notification_id: string;
  user_id?: string | null;
  screen?: string | null;
}): Promise<void> {
  if (!CRM_API_URL || !params.notification_id) return;
  try {
    await fetch(`${CRM_API_URL}/api/admin/push-notifications/track-open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notification_id: params.notification_id,
        user_id: params.user_id ?? null,
        screen: params.screen ?? null,
      }),
    });
  } catch (err) {
    // Non-critical — swallow silently to avoid disrupting the app
    console.warn('[Notifications] track-open failed:', err);
  }
}

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
            handleNotification: async (notification: any) => {
              const data = notification?.request?.content?.data ?? {};
              const imageUrl: string | undefined = data?.image_url;

              // If there's an image, use Notifee to display a BigPicture notification
              // and suppress the original imageless push banner.
              if (imageUrl) {
                try {
                  const { displayForegroundRichNotification } = require('@/lib/backgroundNotifications');
                  const handled = await displayForegroundRichNotification(notification);
                  if (handled) {
                    return {
                      shouldPlaySound: false,
                      shouldSetBadge: false,
                      shouldShowList: false,
                      shouldShowBanner: false,
                    };
                  }
                } catch {
                  // Fall through to standard display
                }
              }

              return {
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowList: true,
                shouldShowBanner: true,
              };
            },
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
      // ── Channel for CRM push notifications (heads-up alerts) ─────────────
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Genestac Notifications',
        importance: Notifications.AndroidImportance.MAX,   // MAX = heads-up pop-up
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // ── Channel for local lifestyle/habit reminders ───────────────────────
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

let activeSyncPromise: Promise<void> | null = null;

/**
 * Synchronize local notification schedules with user preferences
 */
export async function syncAllNotifications(
  prefs: NotificationPreferences
): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return;
  }

  // Prevent concurrent execution: wait if a sync operation is already running
  while (activeSyncPromise) {
    try {
      await activeSyncPromise;
    } catch {
      // Ignore error from previous run
    }
  }

  activeSyncPromise = (async () => {
    try {
      // 1. Clear existing scheduled notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();
      // Brief pause to allow OS background scheduler to finish purge
      await new Promise((res) => setTimeout(res, 100));

      // Check permissions
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        return;
      }

      await setupNotificationChannels();

      // 2. Schedule Water Intake Reminders (7:15 AM to 10:15 PM)
      // Minute offset: :15 past the hour (avoids top-of-hour :00 and step :50 collisions)
      if (prefs.waterRemindersEnabled && prefs.waterIntervalHours > 0) {
        const start = prefs.waterStartHour ?? 7;
        const end = prefs.waterEndHour ?? 22;
        const step = prefs.waterIntervalHours;

        for (let hour = start; hour <= end; hour += step) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '💧 Hydration Time!',
              body: 'Time to drink a glass of water to maintain focus and vitality.',
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute: 15,
              channelId: 'lifestyle-reminders',
            },
          });
        }
      }

      // 3. Schedule Hourly Step & Movement Reminders (9:50 AM to 5:50 PM)
      // Minute offset: :50 past the hour
      if (prefs.stepRemindersEnabled) {
        const startHour = prefs.stepStartHour ?? 9; // 9 AM
        const endHour = prefs.stepEndHour ?? 18;   // 6 PM
        for (let hour = startHour; hour < endHour; hour++) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🚶 Movement Break',
              body: 'Aim for 250 steps this hour! A quick walk boosts metabolism and focus.',
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute: 50,
              channelId: 'lifestyle-reminders',
            },
          });
        }
      }

      // 4. Schedule Daily 4:00 PM Caffeine Cutoff Reminder
      // Minute offset: :00 at 4:00 PM
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

      // 6. Schedule Intermittent Fasting Reminders
      if (prefs.fastingRemindersEnabled) {
        const startHour = prefs.fastingStartHour ?? 12; // Eating window start
        const endHour = prefs.fastingEndHour ?? 20;     // Eating window end

        // Build list of eating window hours
        const eatingHoursList: number[] = [];
        if (startHour <= endHour) {
          for (let h = startHour; h <= endHour; h++) {
            eatingHoursList.push(h);
          }
        } else {
          // Crosses midnight (e.g. 20 to 4)
          for (let h = startHour; h < 24; h++) eatingHoursList.push(h);
          for (let h = 0; h <= endHour; h++) eatingHoursList.push(h);
        }

        // 1. Reminders every 1 hour during Eating Window
        for (let i = 0; i < eatingHoursList.length; i++) {
          const hour = eatingHoursList[i];
          let title = '🍽️ Eating Window Reminder';
          let body = 'Time to nourish your body with wholesome nutrition, lean proteins & healthy fats.';
          let minute = 25; // 25 min offset

          if (hour === startHour) {
            title = `🟢 Eating Window Open (${formatTime(startHour, 0)})`;
            body = 'Your eating window is now open! Break your fast with a nutritious, balanced meal.';
            minute = 0;
          } else if (hour === endHour) {
            title = `🔴 Fasting Window Starting (${formatTime(endHour, 0)})`;
            body = `Last call for food! Your fasting window starts now at ${formatTime(endHour, 0)}. Autophagy countdown begins!`;
            minute = 0;
          } else {
            title = `🍽️ Eating Window Active (${formatTime(hour, 0)})`;
            body = `Hour ${i} of your eating window. Stay hydrated and prioritize wholesome nutrition.`;
          }

          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute,
              channelId: 'lifestyle-reminders',
            },
          });
        }

        // 2. Reminders every 2 hours during Fasting Window
        // Fasting starts at endHour and runs until startHour
        const fastingDurationHours = ((startHour - endHour + 24) % 24) || 16;
        for (let elapsed = 2; elapsed < fastingDurationHours; elapsed += 2) {
          const fastHour = (endHour + elapsed) % 24;

          let title = `⚡ Fasting: ${elapsed}h Check-in`;
          let body = 'Fasting in progress. Drink plenty of water or black coffee to stay sharp.';

          if (elapsed === 2) {
            title = '⚡ Fasting (2h): Digestion Resting';
            body = 'Blood sugar and insulin levels are beginning to drop. Hydrate with pure water.';
          } else if (elapsed === 4) {
            title = '⚡ Fasting (4h): Glycogen Utilization';
            body = 'Your digestive system is resting. Cells are shifting to energy conservation mode.';
          } else if (elapsed === 6) {
            title = '🔥 Fasting (6h): Fat Burn Initiating';
            body = 'Liver glycogen reserves are dropping. Your body begins mobilizing stored fats.';
          } else if (elapsed === 8) {
            title = '🔥 Fasting (8h): Metabolic Shift';
            body = 'Insulin is at baseline. Lipolysis and fatty acid breakdown are actively burning fat.';
          } else if (elapsed === 10) {
            title = '⚡ Fasting (10h): Ketone Rise';
            body = 'Ketone body production is ramping up. Mental clarity and vitality are boosting!';
          } else if (elapsed === 12) {
            title = '🧬 Fasting (12h): Ketosis Induction';
            body = 'Fat oxidation accelerating. Growth hormone levels are climbing steadily.';
          } else if (elapsed === 14) {
            title = '🧬 Fasting (14h): Cellular Cleanup';
            body = 'Autophagy pathways are activating. Cells begin recycling damaged mitochondria.';
          } else if (elapsed === 16) {
            title = '✨ Fasting (16h): Peak Autophagy!';
            body = 'Cellular senescence clearance is peaking! Lysosomes are recycling worn-out proteins.';
          } else if (elapsed === 18) {
            title = '✨ Fasting (18h): Deep Autophagy';
            body = 'Deep cellular rejuvenation and mitochondrial reset in full gear.';
          } else if (elapsed >= 20) {
            title = `🏆 Fasting (${elapsed}h): Cellular Regeneration`;
            body = `Stem cell renewal and deep metabolic reset active. You're almost at your eating window!`;
          }

          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: fastHour,
              minute: 0,
              channelId: 'lifestyle-reminders',
            },
          });
        }
      }

      // 7. Schedule Daily Longevity Supplement Reminders
      if (prefs.supplementRemindersEnabled !== false) {
        const storedSupplements = await getStoredSupplementSchedules();
        for (const item of storedSupplements) {
          if (item.enabled) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `💊 Time for ${item.name}`,
                body: `Dose: ${item.dose}${item.role ? ` • ${item.role}` : ''}. Maintain your healthy longevity stack!`,
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: item.hour,
                minute: item.minute,
                channelId: 'lifestyle-reminders',
              },
            });
          }
        }
      }
    } catch {
      // Sync notifications error handled silently
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
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
