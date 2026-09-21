// lib/pushToken.ts
// Registers the device's Expo push token with the Genestac CRM backend.
// This enables the AI Health Coach scheduler to send push notifications.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

const CRM_URL = process.env.EXPO_PUBLIC_CRM_API_URL ?? 'https://api.genestac.com';

/**
 * Gets the Expo push token and registers it with the backend.
 * Fetches a fresh Supabase session internally — no need to pass a token.
 * Silently no-ops on web or if permissions are not granted.
 */
export async function registerExpoPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const Notifications = require('expo-notifications');

    // Request permission first
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[PushToken] Permission not granted — skipping registration');
      return;
    }

    // Get a fresh session — refreshes the token if expired
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      console.warn('[PushToken] No valid session — skipping registration', sessionError?.message);
      return;
    }

    // Get the Expo push token (requires EAS project ID in app.json)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token: string = tokenData.data;

    if (!token || !token.startsWith('Exponent')) {
      console.warn('[PushToken] Unexpected token format:', token);
      return;
    }

    // 👇 Copy this token from Metro logs to test at expo.dev/notifications
    console.log('[PushToken] Your Expo push token:', token);

    const res = await fetch(`${CRM_URL}/api/mobile/register-push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ expo_push_token: token }),
    });

    if (res.ok) {
      console.log('[PushToken] ✅ Registered Expo push token with backend');
    } else {
      const body = await res.text().catch(() => '');
      console.warn(`[PushToken] Backend registration failed: ${res.status}`, body);
    }
  } catch (err) {
    // Never throw — this is a background operation
    console.warn('[PushToken] Error during token registration:', err);
  }
}
