import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import notifee, { AndroidStyle, EventType } from '@notifee/react-native';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

export async function displayForegroundRichNotification(notification: any): Promise<boolean> {
  const data = notification?.request?.content?.data ?? {};
  const imageUrl = data?.image_url;
  const title = notification?.request?.content?.title;
  const body = notification?.request?.content?.body;

  if (!imageUrl) return false;

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
      pressAction: {
        id: 'default',
      },
      style: {
        type: AndroidStyle.BIGPICTURE,
        picture: imageUrl,
      },
    },
  });
  return true;
}

export async function registerBackgroundNotificationTask() {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('[BackgroundNotifications] Error:', error);
      return;
    }
    
    // Check if data is from expo-notifications background event
    const notificationData = (data as any)?.notification;
    if (!notificationData) return;
    
    const customData = notificationData?.request?.content?.data ?? {};
    const imageUrl = customData?.image_url;
    const title = notificationData?.request?.content?.title;
    const body = notificationData?.request?.content?.body;

    if (imageUrl) {
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
          pressAction: {
            id: 'default',
          },
          style: {
            type: AndroidStyle.BIGPICTURE,
            picture: imageUrl,
          },
        },
      });
    }
  });

  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
}
