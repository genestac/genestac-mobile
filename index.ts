import { registerRootComponent } from 'expo';
import App from './App';

// ── Notifee background event handler ────────────────────────────────────────
// Must be registered at the module root (not inside a component) so that
// Notifee can fire it when the app is killed and the user taps a notification.
try {
  const notifeeModule = require('@notifee/react-native');
  const notifee = notifeeModule.default ?? notifeeModule;
  const { EventType } = notifeeModule;

  notifee.onBackgroundEvent(async ({ type, detail }: { type: number; detail: any }) => {
    if (type === EventType.PRESS) {
      const data = detail?.notification?.data ?? {};
      const notifId: string | undefined = data?.notification_id;
      if (notifId) {
        const apiUrl = process.env.EXPO_PUBLIC_CRM_API_URL ?? '';
        if (apiUrl) {
          try {
            await fetch(`${apiUrl}/api/admin/push-notifications/track-open`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notification_id: notifId }),
            });
          } catch {
            // Non-critical
          }
        }
      }
    }
  });
} catch {
  // @notifee/react-native not available in this environment
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);

