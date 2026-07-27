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
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { SafeLinearGradient as LinearGradient } from '@/components/ui/SafeLinearGradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { supabase } from '@/lib/supabase';
import { safeWebBrowser, makeRedirectUri } from '@/lib/webBrowser';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Fonts, Spacing, Radius } from '@/constants/colors';
import { linkReferralOnSignup, validateReferralCode } from '@/lib/api';

// Required for OAuth redirects on Android
safeWebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { gender, height, currentWeight, age, targetWeight } = useLocalSearchParams<any>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});


  // OTP Modal state
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpUserId, setOtpUserId] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpPassword, setOtpPassword] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Warm up the browser for a faster OAuth experience
  useEffect(() => {
    safeWebBrowser.warmUpAsync();
    return () => {
      safeWebBrowser.coolDownAsync();
    };
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Full name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!phone.trim()) errs.phone = 'Phone number is required';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!acceptedTerms) errs.terms = 'You must accept the terms';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const getWeightLossJourneyPayload = () => {
    return {
      targetGoal: targetWeight ? Number(targetWeight) : null,
      gender: gender || null,
      height: height ? Number(height) : null,
      age: age ? Number(age) : null,
      history: [
        {
          date: new Date().toISOString(),
          weight: currentWeight ? Number(currentWeight) : null
        }
      ],
    };
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      // 1. Create auth user
      const { error, data } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { 
            full_name: name.trim(), 
            role: 'customer',
            gender, height, currentWeight, age, targetWeight
          },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists')
        ) {
          Alert.alert('Account Exists', 'This email is already registered. Please login instead.');
        } else {
          Alert.alert('Registration Failed', error.message);
        }
        setLoading(false);
        return;
      }

      const authUserId = data.user?.id;
      if (!authUserId) {
        Alert.alert('Error', 'Could not create account. Please try again.');
        setLoading(false);
        return;
      }

      const weightLossJourney = getWeightLossJourneyPayload();

      // 2. Insert into users table
      const { error: profileError } = await supabase.from('users').insert({
        id: authUserId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        status: 'NEW',
        weight_loss_journey: weightLossJourney,
      });

      if (profileError) {
        setLoading(false);
        Alert.alert('Error', profileError.message);
        return;
      }

      // 3. Link referral code if provided
      if (referralCode.trim()) {
        await linkReferralOnSignup(authUserId, referralCode.trim());
      }

      setLoading(false);

      // 4. Show OTP modal
      setOtpUserId(authUserId);
      setOtpEmail(email.trim().toLowerCase());
      setOtpPassword(password);
      setShowOtp(true);
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.message || 'Something went wrong.');
    }
  };


  const handleGoogleSignup = async () => {
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
            
            const weightLossJourney = getWeightLossJourneyPayload();

            // Update user metadata in Auth
            await supabase.auth.updateUser({
              data: { gender, height, currentWeight, age, targetWeight }
            });

            // Upsert into users table
            await supabase.from('users').upsert(
              {
                id: user.id,
                name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '',
                email: user.email ?? '',
                phone: user.phone ?? '',
                status: 'NEW',
                source: 'google_oauth_mobile',
                weight_loss_journey: weightLossJourney,
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


  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the OTP sent to your email.');
      return;
    }
    setVerifyingOtp(true);
    const { error } = await supabase.auth.verifyOtp({
      email: otpEmail,
      token: otp,
      type: 'signup',
    });
    if (error) {
      setVerifyingOtp(false);
      Alert.alert('Verification Failed', error.message);
      return;
    }
    // Sign in after verification
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: otpEmail,
      password: otpPassword,
    });
    setVerifyingOtp(false);
    setShowOtp(false);
    if (!signInError) {
      router.replace('/(app)');
    } else {
      Alert.alert('Signed up!', 'Account verified. Please log in.');
      router.replace('/(auth)/login');
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar style="dark" />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header — matches onboarding theme */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color="#1f2937" />
            </TouchableOpacity>
            <View style={styles.logoRow}>
              <Image source={require('@/assets/images/brand/logo.webp')} style={styles.logoIcon} resizeMode="contain" />
              <Text style={styles.logoText}>genestac</Text>
            </View>
            <View style={styles.backBtn} />
          </View>

          {/* Title Section — matches onboarding style */}
          <View style={styles.titleSection}>
            <MaskedView maskElement={<Text style={styles.title}>Create Account</Text>}>
              <LinearGradient colors={['#12879a', '#5cbf5a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={[styles.title, { opacity: 0 }]}>Create Account</Text>
              </LinearGradient>
            </MaskedView>
            <View style={styles.titleUnderline} />
            <Text style={styles.question}>Join Genestac and start your transformation</Text>
            <Text style={styles.subQuestion}>Fill in your details below to get started</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.form}>
              <Input
                label="Full Name"
                value={name}
                onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }}
                placeholder="Rahul Sharma"
                leftIcon="person-outline"
                error={errors.name}
              />

              <Input
                label="Email Address"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })); }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
                error={errors.email}
              />

              <Input
                label="Phone Number"
                value={phone}
                onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: '' })); }}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                leftIcon="call-outline"
                error={errors.phone}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
                placeholder="Min. 8 characters"
                isPassword
                leftIcon="lock-closed-outline"
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: '' })); }}
                placeholder="••••••••"
                isPassword
                leftIcon="shield-checkmark-outline"
                error={errors.confirmPassword}
              />

              {/* Referral Code — hidden by default */}
              <TouchableOpacity
                style={styles.referralToggle}
                onPress={() => setShowReferral(!showReferral)}
                activeOpacity={0.7}
              >
                <Ionicons name="gift-outline" size={15} color="#12879a" />
                <Text style={styles.referralToggleText}>
                  {showReferral ? 'Hide referral code' : 'Have a referral code?'}
                </Text>
                <Ionicons
                  name={showReferral ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color="#12879a"
                />
              </TouchableOpacity>

              {showReferral && (
                <Input
                  label="Referral Code"
                  value={referralCode}
                  onChangeText={(t) => setReferralCode(t.toUpperCase())}
                  placeholder="e.g. GEN7K9"
                  autoCapitalize="characters"
                  leftIcon="gift-outline"
                />
              )}

              {/* Terms checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => { setAcceptedTerms(!acceptedTerms); setErrors((e) => ({ ...e, terms: '' })); }}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                  {acceptedTerms && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={[styles.termsText, errors.terms ? { color: '#ef4444' } : null]}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms & Conditions</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {errors.terms && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.terms}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Gradient CTA Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleRegister}
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
                <Text style={styles.continueTxt}>Create Account   →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleBtn, googleLoading && styles.googleBtnDisabled]}
            onPress={handleGoogleSignup}
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

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Verification Modal */}
      <Modal visible={showOtp} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="mail-open-outline" size={32} color={Colors.primaryLight} />
            </View>
            <Text style={styles.modalTitle}>Verify your email</Text>
            <Text style={styles.modalSubtitle}>
              We sent a verification code to{'\n'}
              <Text style={{ color: Colors.primaryLight, fontWeight: '700' }}>{otpEmail}</Text>
            </Text>

            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP code"
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor={Colors.textLight}
            />

            <Button
              title="Verify & Continue"
              onPress={handleVerifyOtp}
              loading={verifyingOtp}
              style={{ marginTop: Spacing.md }}
            />

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowOtp(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f7fafb' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // ── Header (matches onboarding) ───────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 4,
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
    marginTop: 4,
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
    marginBottom: 2,
  },
  subQuestion: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
    marginBottom: 8,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#12879a',
    borderColor: '#12879a',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },
  termsLink: {
    color: '#12879a',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  submitBtn: { marginTop: 4 },

  // ── Gradient button (matches onboarding) ──────────────────────────────────
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

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#9ca3af', fontWeight: '500' },

  // ── Google Button (matches login) ─────────────────────────────────────────
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
    marginBottom: 4,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: '#1f2937' },

  // ── Login Row ─────────────────────────────────────────────────────────────
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  loginText: { fontSize: 14, color: '#6b7280' },
  loginLink: { fontSize: 14, fontWeight: '700', color: '#12879a' },

  // ── Referral Toggle ─────────────────────────────────────────────────────
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0faf8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cce9e4',
    alignSelf: 'flex-start',
  },
  referralToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#12879a',
  },

  // ── OTP Modal ─────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e1f5f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0A1F17',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8FA8A0',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  otpInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#12879a',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 8,
    color: '#0A1F17',
    backgroundColor: '#F0F7F4',
  },
  modalCancel: {
    marginTop: 16,
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 15,
    color: '#8FA8A0',
    fontWeight: '600',
  },
});
