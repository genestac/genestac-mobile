import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { SafeLinearGradient as LinearGradient } from '@/components/ui/SafeLinearGradient';
import { SafeMaskedView as MaskedView } from '@/components/ui/SafeMaskedView';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const LOGO_ICON = require('@/assets/images/brand/logo.webp');

const MIN_W = 30;
const MAX_W = 120;
const TRACK_HEIGHT = 220;
const THUMB_SIZE = 26;
const HEIGHT_CM = 175;

const getBodyImages = (gender: string | string[] | undefined) => {
  if (gender === 'female') {
    return {
      thin: require('@/assets/images/onboarding/body/woman_thin.webp'),
      fit:  require('@/assets/images/onboarding/body/woman_fit.webp'),
      fat:  require('@/assets/images/onboarding/body/woman_fat.webp'),
    };
  }
  return {
    thin: require('@/assets/images/onboarding/body/man_thin.webp'),
    fit:  require('@/assets/images/onboarding/body/man_fit.webp'),
    fat:  require('@/assets/images/onboarding/body/man_fat.webp'),
  };
};

function getBmiCategory(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (bmi < 18.5) return { key: 'thin', bmi };
  if (bmi < 25)   return { key: 'fit',  bmi };
  return               { key: 'fat',  bmi };
}

export default function CurrentWeightScreen() {
  const { gender, height } = useLocalSearchParams();
  const BODY_IMAGES = useMemo(() => getBodyImages(gender), [gender]);

  const [weight, setWeight] = useState(72.5);
  const weightRef = useRef(72.5);  // always current, avoids stale closures

  const { key: bodyKey } = useMemo(() => getBmiCategory(weight, HEIGHT_CM), [weight]);

  const opacities = useRef({
    thin: new RNAnimated.Value(bodyKey === 'thin' ? 1 : 0),
    fit:  new RNAnimated.Value(bodyKey === 'fit'  ? 1 : 0),
    fat:  new RNAnimated.Value(bodyKey === 'fat'  ? 1 : 0),
  }).current;

  useEffect(() => {
    (['thin', 'fit', 'fat'] as const).forEach((key) => {
      RNAnimated.timing(opacities[key], {
        toValue: key === bodyKey ? 1 : 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    });
  }, [bodyKey]);

  // Reanimated SharedValue for thumb position
  // 0 = top (MAX_W), TRACK_HEIGHT = bottom (MIN_W)
  const INITIAL_POS = TRACK_HEIGHT * (1 - (72.5 - MIN_W) / (MAX_W - MIN_W));
  const thumbPos = useSharedValue(INITIAL_POS);

  // Bridge from UI thread -> JS thread, bypasses React 18 batching
  function updateWeight(w: number) {
    'worklet';
    weightRef.current = w;
    runOnJS(setWeight)(w);
  }

  useAnimatedReaction(
    () => thumbPos.value,
    (pos) => {
      'worklet';
      const frac = 1 - Math.max(0, Math.min(1, pos / TRACK_HEIGHT));
      const w = Math.round((MIN_W + frac * (MAX_W - MIN_W)) * 10) / 10;
      updateWeight(w);
    }
  );

  const startThumbRef = useRef(INITIAL_POS);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startThumbRef.current = thumbPos.value;
      },
      onPanResponderMove: (_evt, gesture) => {
        thumbPos.value = Math.max(0, Math.min(TRACK_HEIGHT,
          startThumbRef.current + gesture.dy
        ));
      },
    })
  ).current;

  // +/- precision buttons
  const adjustWeight = (delta: number) => {
    const newW = Math.round(Math.max(MIN_W, Math.min(MAX_W, weightRef.current + delta)) * 10) / 10;
    thumbPos.value = TRACK_HEIGHT * (1 - (newW - MIN_W) / (MAX_W - MIN_W));
  };

  // Animated styles driven from UI thread — no JS renders needed for thumb position
  const thumbStyle = useAnimatedStyle(() => ({
    top: thumbPos.value - THUMB_SIZE / 2,
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    top: thumbPos.value - 4,
  }));

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.logoRow}>
          <Image source={LOGO_ICON} style={styles.logoIcon} resizeMode="contain" />
          <Text style={styles.logoText}>genestac</Text>
        </View>
        <View style={styles.backBtn} />
      </View>


      {/* TITLE SECTION */}
      <View style={styles.titleSection}>
        <MaskedView maskElement={<Text style={styles.title}>Current Weight</Text>}>
          <LinearGradient colors={['#12879a', '#5cbf5a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={[styles.title, { opacity: 0 }]}>Current Weight</Text>
          </LinearGradient>
        </MaskedView>
        <View style={styles.titleUnderline} />
        <Text style={styles.question}>How much do you currently weigh?</Text>
        <Text style={styles.subQuestion}>Drag the slider to select your weight</Text>
      </View>

      {/* MAIN BODY */}
      <View style={styles.body}>

        {/* LEFT: body silhouette */}
        <View style={styles.leftCol}>
          <View style={styles.imageWrapper}>
            {/* Gradient halo behind the figure */}
            <LinearGradient
              colors={['rgba(92, 191, 90, 0.15)', 'rgba(18, 135, 154, 0.0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.bgCircle}
            />
            {(['thin', 'fit', 'fat'] as const).map((key) => (
              <RNAnimated.Image
                key={key}
                source={BODY_IMAGES[key]}
                style={[styles.personImage, { opacity: opacities[key] }]}
                resizeMode="contain"
              />
            ))}
          </View>

          {/* Scale graphic sits below the person's feet */}
          <View style={styles.scaleWrap}>
            <View style={styles.scaleTop}>
              <Text style={styles.scaleReading}>{weight.toFixed(1)}</Text>
            </View>
            <View style={styles.scaleFront} />
          </View>
        </View>

        {/* RIGHT: weight card + slider */}
        <View style={styles.rightCol}>
          <View style={styles.card}>
            {/* Live weight display */}
            <View style={styles.weightDisplay}>
              <Text style={styles.weightValue}>{weight.toFixed(1)}</Text>
              <Text style={styles.weightUnit}>kg</Text>
            </View>
            <View style={styles.cardUnderline} />

            {/* Vertical slider + +/- buttons */}
            <View style={styles.sliderRow}>

              {/* + button at top */}
              <TouchableOpacity
                style={styles.adjBtn}
                onPress={() => adjustWeight(0.5)}
                activeOpacity={0.75}
              >
                <Text style={styles.adjBtnTxt}>+</Text>
              </TouchableOpacity>

              <View style={styles.trackWrap}>
                {/* Gradient track */}
                <LinearGradient
                  colors={['#5cbf5a', '#12879a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.track}
                />

                {/* Tick marks */}
                {Array.from({ length: 9 }).map((_, i) => (
                  <View key={i} style={[styles.tick, { top: (TRACK_HEIGHT / 8) * i }]} />
                ))}

                {/* Smooth animated thumb — runs on UI thread */}
                <Animated.View
                  {...panResponder.panHandlers}
                  style={[styles.thumb, thumbStyle]}
                >
                  <View style={styles.thumbInner} />
                </Animated.View>

                {/* Floating weight bubble — runs on UI thread */}
                <Animated.View style={[styles.bubble, bubbleStyle]}>
                  <Text style={styles.bubbleValue}>{weight.toFixed(1)}</Text>
                  <Text style={styles.bubbleUnit}>kg</Text>
                </Animated.View>
              </View>

              {/* - button at bottom */}
              <TouchableOpacity
                style={styles.adjBtn}
                onPress={() => adjustWeight(-0.5)}
                activeOpacity={0.75}
              >
                <Text style={styles.adjBtnTxt}>−</Text>
              </TouchableOpacity>

            </View>


            {/* Secure row */}
            <View style={styles.secureRow}>
              <FontAwesome5 name="shield-alt" size={11} color="#5cbf5a" />
              <Text style={styles.secureText}>
                Your info is <Text style={styles.secureGreen}>100%</Text> secure & private
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* CONTINUE BUTTON */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/(onboarding)/step4', params: { gender, height, weight } })}
        style={styles.continueWrap}
      >
        <LinearGradient
          colors={['#12879a', '#5cbf5a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueBtn}
        >
          <Text style={styles.continueTxt}>Continue   →</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* FOOTER */}
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7fafb' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoIcon: { width: 34, height: 34 },
  logoText: { fontSize: 20, fontWeight: '800', color: '#12879a' },

  // ── Sub-header ──
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepText: { fontSize: 12, fontWeight: '700', color: '#12879a' },
  progressTrack: {
    width: 80, height: 5, borderRadius: 3,
    backgroundColor: '#e5e7eb', overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeIconWrap: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#eaf6f2', alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 9, color: '#374151', lineHeight: 13 },

  // ── Title ──
  titleSection: { paddingHorizontal: 16, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  titleUnderline: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#5cbf5a', marginTop: 4, marginBottom: 8,
  },
  question: { fontSize: 13, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
  subQuestion: { fontSize: 11, color: '#6b7280', lineHeight: 16 },

  // ── Body ──
  body: { flex: 1, flexDirection: 'row', paddingHorizontal: 12, gap: 10 },

  leftCol: { flex: 1.5, paddingTop: 4, justifyContent: 'flex-end' },
  imageWrapper: {
    flex: 1, width: '100%',
    alignItems: 'center', justifyContent: 'flex-end',
    position: 'relative', minHeight: 180,
  },
  bgCircle: {
    position: 'absolute', top: '10%',
    width: 200, height: 200, borderRadius: 100,
  },
  personImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%', height: '100%',
  },

  rightCol: { flex: 1, justifyContent: 'center' },

  // ── Card (no background — transparent) ──
  card: {
    padding: 4,
    alignItems: 'center',
  },

  // Live weight display
  weightDisplay: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  weightValue: { fontSize: 36, fontWeight: '900', color: '#12879a', lineHeight: 40 },
  weightUnit: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 4 },
  cardUnderline: {
    width: 30, height: 3, borderRadius: 2,
    backgroundColor: '#5cbf5a', marginTop: 4, marginBottom: 10,
  },

  // Vertical slider
  sliderRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  adjBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eaf6f2',
    borderWidth: 1.5,
    borderColor: '#12879a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnTxt: {
    fontSize: 20,
    fontWeight: '700',
    color: '#12879a',
    lineHeight: 24,
  },
  trackWrap: {
    width: 36,
    height: TRACK_HEIGHT,
    alignItems: 'center',
    position: 'relative',
  },
  track: {
    width: 8, height: '100%',
    borderRadius: 4, alignSelf: 'center',
  },
  tick: {
    position: 'absolute',
    right: 2,
    width: 7,
    height: 1.5,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 1,
  },
  thumb: {
    position: 'absolute',
    left: '50%',
    marginLeft: -THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#12879a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  thumbInner: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#12879a',
  },
  bubble: {
    position: 'absolute',
    left: THUMB_SIZE + 2,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bubbleValue: { fontSize: 14, fontWeight: '800', color: '#12879a' },
  bubbleUnit: { fontSize: 9, color: '#6b7280', marginBottom: 1 },

  // Pseudo-3D scale graphic — now lives below the person
  scaleWrap: {
    width: '80%',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: -8,
    marginBottom: 4,
  },
  scaleTop: {
    width: '100%', height: 34,
    backgroundColor: '#111827',
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    transform: [{ perspective: 300 }, { rotateX: '28deg' }],
  },
  scaleReading: {
    color: '#5cbf5a', fontSize: 13, fontWeight: '700', letterSpacing: 1,
  },
  scaleFront: {
    width: '88%', height: 7,
    backgroundColor: '#0b0f14',
    borderBottomLeftRadius: 5, borderBottomRightRadius: 5,
    marginTop: -3,
  },

  // Secure row
  secureRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f2f6f7', borderRadius: 10,
    padding: 8, width: '100%', gap: 6,
  },
  secureText: { fontSize: 10, color: '#374151', flex: 1, lineHeight: 14 },
  secureGreen: { color: '#5cbf5a', fontWeight: '700' },

  // ── Continue ──
  continueWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  continueBtn: {
    borderRadius: 30, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  continueTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // ── Footer ──
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingBottom: 16, paddingHorizontal: 16,
  },
  footerItem: { flex: 1, alignItems: 'center', gap: 4 },
  footerDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },
  footerTxt: { fontSize: 10, color: '#374151', textAlign: 'center', lineHeight: 14, marginTop: 2 },
});
