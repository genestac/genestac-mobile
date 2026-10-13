import { NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

export const AndroidStyle = {
  BIGPICTURE: 1 as const,
};

// Lazily wrap notifee so callers get null if the native module is unavailable
function getNotifee() {
  if (!NativeModules.NotifeeApiModule) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const notifeeModule = require('@notifee/react-native');
    return notifeeModule.default || notifeeModule;
  } catch {
    return null;
  }
}

function getTaskManager() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-task-manager');
  } catch {
    return null;
  }
}

export async function displayForegroundRichNotification(notification: any): Promise<boolean> {
  const notifee = getNotifee();
  if (!notifee) return false;

  const data = notification?.request?.content?.data ?? {};
  const imageUrl = data?.image_url;
  const title = notification?.request?.content?.title;
  const body = notification?.request?.content?.body;

  if (!imageUrl) return false;

  try {
    await notifee.requestPermission();

    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
    });

    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId,
        pressAction: { id: 'default' },
        style: {
          type: AndroidStyle.BIGPICTURE,
          picture: imageUrl,
        },
      },
    });
    return true;
  } catch (e) {
    console.warn('[BackgroundNotifications] displayForegroundRichNotification error:', e);
    return false;
  }
}

export async function registerBackgroundNotificationTask() {
  const TaskManager = getTaskManager();
  const notifee = getNotifee();

  if (!TaskManager) {
    console.warn('[BackgroundNotifications] expo-task-manager not available (Expo Go?)');
    return;
  }

  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }: any) => {
    if (error) {
      console.error('[BackgroundNotifications] Error:', error);
      return;
    }

    const notificationData = (data as any)?.notification;
    if (!notificationData || !notifee) return;

    const customData = notificationData?.request?.content?.data ?? {};
    const imageUrl = customData?.image_url;
    const title = notificationData?.request?.content?.title;
    const body = notificationData?.request?.content?.body;

    if (imageUrl) {
      try {
        const channelId = await notifee.createChannel({
          id: 'default',
          name: 'Default Channel',
        });

        await notifee.displayNotification({
          title,
          body,
          data: customData,
          android: {
            channelId,
            pressAction: { id: 'default' },
            style: {
              type: AndroidStyle.BIGPICTURE,
              picture: imageUrl,
            },
          },
        });
      } catch (e) {
        console.warn('[BackgroundNotifications] Background task display error:', e);
      }
    }
  });

  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  } catch (e) {
    console.warn('[BackgroundNotifications] registerTaskAsync failed:', e);
  }
}
