import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { trackNotificationOpen } from '@/lib/notifications';

export default function RootLayout() {
  const userIdRef = useRef<string | null>(null);

  // Keep a ref to the current user ID so listeners can access it
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      userIdRef.current = data?.session?.user?.id ?? null;
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id ?? null;
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initNotifications() {
      try {
        const { registerBackgroundNotificationTask } = await import('@/lib/backgroundNotifications');
        if (isMounted) {
          registerBackgroundNotificationTask().catch(() => {});
        }
      } catch {
        // Background notification module unavailable — app continues normally
      }

      // ── Expo push notification tap listener ──────────────────────────────
      // Fires when the user taps an Expo-managed notification (foreground or
      // killed-state). The `notification_id` was embedded in the data payload
      // by the CRM backend when the notification was sent.
      try {
        const Notifications = await import('expo-notifications');
        const subscription = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data = response?.notification?.request?.content?.data ?? {};
            const notifId = (data as any)?.notification_id as string | undefined;
            if (notifId) {
              trackNotificationOpen({
                notification_id: notifId,
                user_id: userIdRef.current,
                screen: (data as any)?.screen ?? null,
              });
            }
          }
        );
        // Return cleanup for this inner subscription
        if (!isMounted) subscription.remove();
      } catch {
        // expo-notifications unavailable in this build
      }

      // ── Notifee tap listener (for BigPicture rich notifications) ─────────
      // Fires when the user taps a notification rendered by Notifee (the
      // BigPicture image variant). Notifee passes the same `data` object that
      // was set on the notification when it was displayed.
      try {
        const notifee = (await import('@notifee/react-native')).default;
        const { EventType } = await import('@notifee/react-native');
        notifee.onForegroundEvent(({ type, detail }) => {
          if (type === EventType.PRESS) {
            const data = detail?.notification?.data ?? {};
            const notifId = (data as any)?.notification_id as string | undefined;
            if (notifId) {
              trackNotificationOpen({
                notification_id: notifId,
                user_id: userIdRef.current,
                screen: (data as any)?.screen ?? null,
              });
            }
          }
        });
      } catch {
        // @notifee/react-native unavailable
      }
    }

    initNotifications();
    return () => { isMounted = false; };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="games" />
          <Stack.Screen name="(onboarding)" />
          {/* OAuth deep-link callback - genestac://auth/callback */}
          <Stack.Screen name="auth/callback" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
