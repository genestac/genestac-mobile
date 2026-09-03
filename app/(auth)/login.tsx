import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { SafeLinearGradient as LinearGradient } from '@/components/ui/SafeLinearGradient';
import { SafeMaskedView as MaskedView } from '@/components/ui/SafeMaskedView';
import { supabase } from '@/lib/supabase';
import { safeWebBrowser, makeRedirectUri } from '@/lib/webBrowser';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Required for OAuth redirects on Android
safeWebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Warm up the browser for a faster OAuth experience
  useEffect(() => {
    safeWebBrowser.warmUpAsync();
    return () => {
      safeWebBrowser.coolDownAsync();
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      const redirectUrl = makeRedirectUri({
        scheme: 'genestac',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        Alert.alert('Google Sign-In Failed', error?.message ?? 'Could not start Google sign-in.');
        return;
      }

      const result = await safeWebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        const rawUrl = result.url;
        let queryOrHash = '';
        if (rawUrl.includes('#')) {
          queryOrHash = rawUrl.substring(rawUrl.indexOf('#') + 1);
        } else if (rawUrl.includes('?')) {
          queryOrHash = rawUrl.substring(rawUrl.indexOf('?') + 1);
        }
        const params = new URLSearchParams(queryOrHash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!sessionError && sessionData.session?.user) {
            const user = sessionData.session.user;
            await supabase.from('users').upsert(
              {
                id: user.id,
                name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '',
                email: user.email ?? '',
                phone: user.phone ?? '',
                status: 'NEW',
                source: 'google_oauth_mobile',
              },
              { onConflict: 'id', ignoreDuplicates: true }
            );
            router.replace('/(app)');
            return;
          }
        }
        Alert.alert('Sign-In Failed', 'Could not establish session. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      router.replace('/(app)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header matching onboarding theme */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(onboarding)/welcome')} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.logoRow}>
          <Image source={require('@/assets/images/brand/logo.png')} style={styles.logoIcon} resizeMode="contain" />
          <Text style={styles.logoText}>genestac</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Title Section — matches onboarding style */}
          <View style={styles.titleSection}>
            <MaskedView maskElement={<Text style={styles.title}>Welcome Back</Text>}>
              <LinearGradient colors={['#12879a', '#5cbf5a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={[styles.title, { opacity: 0 }]}>Welcome Back</Text>
              </LinearGradient>
            </MaskedView>
            <View style={styles.titleUnderline} />
            <Text style={styles.question}>Sign in to your account</Text>
            <Text style={styles.subQuestion}>Your personalized weight loss journey awaits</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.form}>
              <Input
                label="Email Address"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrors((e) => ({ ...e, email: '' }));
                }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon="mail-outline"
                error={errors.email}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrors((e) => ({ ...e, password: '' }));
                }}
                placeholder="••••••••"
                isPassword
                leftIcon="lock-closed-outline"
                error={errors.password}
              />

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button — matches onboarding gradient button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={loading}
            style={styles.continueWrap}
          >
            <LinearGradient
              colors={['#12879a', '#5cbf5a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.continueTxt}>Sign In   →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <View style={styles.googleWrap}>
            <TouchableOpacity
              style={[styles.googleBtn, googleLoading && styles.googleBtnDisabled]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.82}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#374151" />
              ) : (
                <>
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </Svg>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Create Account → Welcome Screen */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.replace('/(onboarding)/welcome')}>
              <Text style={styles.registerLink}> Get Started</Text>
            </TouchableOpacity>
          </View>

          {/* Footer trust bar — matches onboarding footer */}
          <View style={styles.footer}>
            <View style={styles.footerItem}>
              <FontAwesome5 name="user-md" size={14} color="#12879a" />
              <Text style={styles.footerTxt}>{'Doctor Guided\nProgram'}</Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <FontAwesome5 name="shield-alt" size={14} color="#12879a" />
              <Text style={styles.footerTxt}>{'Safe &\nEffective'}</Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <Ionicons name="person" size={14} color="#12879a" />
              <Text style={styles.footerTxt}>{'Personalized\nfor You'}</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7fafb',
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // ── Header (matches onboarding) ───────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoIcon: {
    width: 34,
    height: 34,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#12879a',
  },

  // ── Title Section (matches onboarding) ────────────────────────────────────
  titleSection: {
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5cbf5a',
    marginTop: 4,
    marginBottom: 10,
  },
  question: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 4,
  },
  subQuestion: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
  },

  // ── Form Card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 16,
  },
  form: { gap: 14 },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#12879a',
  },

  // ── Gradient Continue Button (matches onboarding) ─────────────────────────
  continueWrap: {
    marginBottom: 16,
  },
  continueBtn: {
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Divider ──────────────────────────────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },

  // ── Google Button ─────────────────────────────────────────────────────────
  googleWrap: {
    marginBottom: 20,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },

  // ── Register Row ──────────────────────────────────────────────────────────
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, fontWeight: '700', color: '#12879a' },

  // ── Footer (matches onboarding) ───────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  footerDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e5e7eb',
  },
  footerTxt: {
    fontSize: 10,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 2,
  },
});
