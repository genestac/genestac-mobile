import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

/**
 * OAuth deep-link callback screen.
 *
 * After Google (or any provider) redirects to  genestac://auth/callback?...
 * expo-router renders this file. We grab the full URL, extract the
 * access_token / refresh_token from the hash or query string, call
 * setSession, then push the user into the authenticated area.
 */
export default function AuthCallback() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    // Guard against double-execution in StrictMode / fast-refresh
    if (handled.current) return;
    handled.current = true;

    const handleCallback = async () => {
      try {
        // Grab the URL that opened this screen
        const url = await Linking.getInitialURL();
        if (!url) {
          router.replace('/(auth)/login');
          return;
        }

        // Tokens may arrive as a hash fragment or query string
        const parsed = new URL(url);
        const fragment = parsed.hash ? parsed.hash.substring(1) : '';
        const query = parsed.search ? parsed.search.substring(1) : '';
        const params = new URLSearchParams(fragment || query);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data.session?.user) {
            // Upsert user record (covers first-time Google sign-in)
            const u = data.session.user;
            await supabase.from('users').upsert(
              {
                id: u.id,
                name: u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? '',
                email: u.email ?? '',
                phone: u.phone ?? '',
                status: 'NEW',
                source: 'google_oauth_mobile',
              },
              { onConflict: 'id', ignoreDuplicates: true }
            );
            router.replace('/(app)');
            return;
          }
        }

        // No tokens — fall back to login
        router.replace('/(auth)/login');
      } catch (err) {
        console.error('[AuthCallback] error:', err);
        router.replace('/(auth)/login');
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primaryLight} />
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
