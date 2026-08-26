import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

export default function RootLayout() {
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
