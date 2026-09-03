import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeLinearGradient as LinearGradient } from '@/components/ui/SafeLinearGradient';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';

const { width, height } = Dimensions.get('window');

// ─── Replace with your real doctor photos ─────────────────────────────────────
const DOCTOR_IMAGE = require('@/assets/images/onboarding/doctor.webp');
// ─────────────────────────────────────────────────────────────────────────────

// Title dimensions for the SVG gradient text
const TITLE = 'Genestac';
const TITLE_FONT_SIZE = width * 0.16;
const SVG_WIDTH = width - 48;
const SVG_HEIGHT = TITLE_FONT_SIZE * 1.3;

export default function WelcomeScreen() {
  const isAnimating = useRef(false);

  // ── Shared animation values ──────────────────────────────────────────────
  const circleScale1 = useSharedValue(1);
  const circleScale2 = useSharedValue(1);
  const circleScale3 = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  const circle1Style = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale1.value }],
  }));
  const circle2Style = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale2.value }],
  }));
  const circle3Style = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale3.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  useFocusEffect(
    useCallback(() => {
      // Reset animation state when returning to this screen
      isAnimating.current = false;
      circleScale1.value = 1;
      circleScale2.value = 1;
      circleScale3.value = 1;
      contentTranslateY.value = 0;
      overlayOpacity.value = 0;
    }, [])
  );

  const startSlideAndNavigate = useCallback(() => {
    // Use an ease-out effect so it starts fast and slows down at the end
    const slideEasing = Easing.out(Easing.exp);
    // Slide the whole content up off the screen
    contentTranslateY.value = withTiming(-height, { duration: 600, easing: slideEasing });
    // Navigate immediately so the new screen slides up from the bottom concurrently
    router.push('/(onboarding)/gender');
  }, []);

  const handleGetStarted = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const easing = Easing.bezier(0.25, 0.1, 0.25, 1);
    const duration = 500;
    const maxScale = 8;

    // Staggered circle expansion to make it look dynamic
    circleScale3.value = withDelay(0,   withTiming(maxScale, { duration, easing }));
    circleScale2.value = withDelay(80,  withTiming(maxScale, { duration, easing }));
    circleScale1.value = withDelay(160, withTiming(maxScale, { duration, easing }));

    // Start the screen slide early (before circles finish) to make it fluid
    setTimeout(() => {
      startSlideAndNavigate();
    }, 300);
  }, [startSlideAndNavigate]);

  const handleLogin = useCallback(() => {
    router.push('/(auth)/login');
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f6f7" />

      {/* ── Decorative expanding circles ── */}
      <View style={styles.circlesAnchor} pointerEvents="none">
        <Animated.View style={[styles.circle, styles.circleLeft, circle3Style]} />
        <Animated.View style={[styles.circle, styles.circleRight, circle2Style]} />
        <Animated.View style={[styles.circle, styles.circleBottom, circle1Style]} />
      </View>

      {/* ── Main scrollable content ── */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View style={[styles.content, contentStyle]}>

          {/* Logo */}
          <View style={styles.logoRow}>
            <Image source={require('@/assets/images/brand/logo.png')} style={styles.logoIcon} />
          </View>

          {/* "Welcome to" with dividers */}
          <View style={styles.welcomeRow}>
            <View style={styles.divider} />
            <Text style={styles.welcomeText}>Welcome to</Text>
            <View style={styles.divider} />
          </View>

          {/* ── SVG gradient title — no native MaskedView needed ── */}
          <Svg width={SVG_WIDTH} height={SVG_HEIGHT} style={styles.svgTitle}>
            <Defs>
              <SvgGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#0f8b9e" />
                <Stop offset="100%" stopColor="#5cbf5a" />
              </SvgGradient>
            </Defs>
            <SvgText
              fill="url(#titleGrad)"
              fontSize={TITLE_FONT_SIZE}
              fontWeight="800"
              x={SVG_WIDTH / 2}
              y={SVG_HEIGHT * 0.85}
              textAnchor="middle"
            >
              {TITLE}
            </SvgText>
          </Svg>

          <Text style={styles.subtitle}>Doctor Guided Weight Loss Program</Text>

          {/* Doctor images */}
          <View style={styles.doctorsRow}>
            <Image source={DOCTOR_IMAGE} style={styles.singleDoctorImage} />
          </View>

          {/* GET STARTED gradient button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGetStarted}
            style={styles.gradientBtnWrapper}
          >
            <LinearGradient
              colors={['#0f8b9e', '#5cbf5a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.getStartedButton}
            >
              <Text style={styles.getStartedText}>GET STARTED   →</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Outline login button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.outlineButton}
            onPress={handleLogin}
          >
            <Text style={styles.outlineButtonText}>I ALREADY HAVE AN ACCOUNT</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      {/* ── White/bg overlay that fades in to mask the transition ── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f2f6f7',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  // ── Background expanding circles ──────────────────────────────────────────
  circlesAnchor: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circleLeft: {
    width: 600,
    height: 600,
    left: -250,
    top: -100,
    backgroundColor: 'rgba(92, 191, 90, 0.13)',
  },
  circleRight: {
    width: 600,
    height: 600,
    right: -250,
    top: 50,
    backgroundColor: 'rgba(15, 139, 158, 0.16)',
  },
  circleBottom: {
    width: 400,
    height: 400,
    bottom: -150,
    left: (width - 400) / 2,
    backgroundColor: 'rgba(15, 139, 158, 0.24)',
  },

  // ── Logo ─────────────────────────────────────────────────────────────────
  logoRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },

  // ── "Welcome to" ─────────────────────────────────────────────────────────
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: '#9ec9a3',
    marginHorizontal: 10,
  },
  welcomeText: {
    fontSize: 20,
    color: '#1f2937',
    fontWeight: '500',
  },

  // ── SVG gradient title ───────────────────────────────────────────────────
  svgTitle: {
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 15,
    color: '#374151',
    marginTop: 2,
    marginBottom: 20,
    textAlign: 'center',
  },

  // ── Doctor images ────────────────────────────────────────────────────────
  doctorsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: -15, // Negative margin to overlap the transparent padding of the PNG
    width: '100%',
  },
  singleDoctorImage: {
    width: width * 0.8,
    height: height * 0.35,
    resizeMode: 'contain',
  },

  // ── Buttons ──────────────────────────────────────────────────────────────
  gradientBtnWrapper: {
    width: width - 48,
    marginBottom: 14,
    shadowColor: '#0f8b9e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  getStartedButton: {
    width: '100%',
    paddingVertical: 17,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  outlineButton: {
    width: width - 48,
    paddingVertical: 15,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#12879a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  outlineButtonText: {
    color: '#12879a',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Transition overlay ───────────────────────────────────────────────────
  overlay: {
    backgroundColor: '#f2f6f7',
    zIndex: 100,
  },
});
