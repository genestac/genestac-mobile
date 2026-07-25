import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useURL } from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

/**
 * OAuth deep-link callback screen.
 *
 * Supabase redirects to  genestac://auth/callback#access_token=...
 * after the user completes Google sign-in.
 *
 * expo-linking's `useURL()` returns the URL whether the app was:
 *  - cold-started from the deep link, OR
 *  - already open and the link arrives while foregrounded.
 */
export default function AuthCallback() {
  const router = useRouter();
  const url = useURL();           // live, reactive — covers both cold + warm starts
  const handled = useRef(false);

  useEffect(() => {
    if (!url || handled.current) return;
    handled.current = true;

    const handleCallback = async () => {
      try {
        // Tokens may arrive in the hash fragment OR as query params
        const parsed = new URL(url);
        const fragment = parsed.hash ? parsed.hash.substring(1) : '';
        const query   = parsed.search ? parsed.search.substring(1) : '';
        const params  = new URLSearchParams(fragment || query);

        const accessToken  = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data.session?.user) {
            const u = data.session.user;
            // Upsert user row — safe for both sign-in and account-linking
            await supabase.from('users').upsert(
              {
                id:     u.id,
                name:   u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? '',
                email:  u.email ?? '',
                phone:  u.phone ?? '',
                status: 'NEW',
                source: 'google_oauth_mobile',
              },
              { onConflict: 'id', ignoreDuplicates: true }
            );
            router.replace('/(app)');
            return;
          }
        }

        // Could not extract tokens — return to login
        router.replace('/(auth)/login');
      } catch (err) {
        console.error('[AuthCallback] error:', err);
        router.replace('/(auth)/login');
      }
    };

    handleCallback();
  }, [url]);

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
