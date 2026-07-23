import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Fonts, Spacing, Radius } from '@/constants/colors';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // OTP Modal state
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpUserId, setOtpUserId] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpPassword, setOtpPassword] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

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

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      // 1. Create auth user
      const { error, data } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim(), role: 'customer' },
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

      // 2. Insert into users table
      const { error: profileError } = await supabase.from('users').insert({
        id: authUserId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        status: 'NEW',
      });

      setLoading(false);

      if (profileError) {
        Alert.alert('Error', profileError.message);
        return;
      }

      // 3. Show OTP modal
      setOtpUserId(authUserId);
      setOtpEmail(email.trim().toLowerCase());
      setOtpPassword(password);
      setShowOtp(true);
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.message || 'Something went wrong.');
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={24} color={Colors.white} />
            </View>
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Genestac and start your transformation</Text>

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

              {/* Terms checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => { setAcceptedTerms(!acceptedTerms); setErrors((e) => ({ ...e, terms: '' })); }}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                  {acceptedTerms && (
                    <Ionicons name="checkmark" size={14} color={Colors.white} />
                  )}
                </View>
                <Text style={[styles.termsText, errors.terms ? { color: Colors.danger } : null]}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms & Conditions</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {errors.terms && (
                <Text style={styles.errorText}>{errors.terms}</Text>
              )}

              <Button
                title="Create Account"
                onPress={handleRegister}
                loading={loading}
                style={styles.submitBtn}
              />
            </View>
          </View>

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
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: Fonts.sizes.md,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  form: { gap: Spacing.md },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  termsText: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  errorText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.danger,
  },
  submitBtn: { marginTop: Spacing.xs },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  loginText: { fontSize: Fonts.sizes.md, color: Colors.textSecondary },
  loginLink: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.primaryLight },
  // OTP Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  otpInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    fontSize: Fonts.sizes.xl,
    textAlign: 'center',
    letterSpacing: 8,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  modalCancel: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modalCancelText: {
    fontSize: Fonts.sizes.md,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
