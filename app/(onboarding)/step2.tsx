import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated as RNAnimated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';

const LOGO_ICON = require('@/assets/images/brand/logo.webp');

const MIN_H = 100;
const MAX_H = 210;
const TRACK_HEIGHT = 220;
const THUMB_SIZE = 26;
const MAX_RULER = 220; // ruler goes 0 → 220
const SCENE_H = 260;   // fixed image container height

// Ruler tick marks for the left side (0 to 220 every 20 cm)
const LEFT_RULER_MARKS = Array.from({ length: 12 }, (_, i) => i * 20); // 0,20...220

// Tick marks for the right slider (100 to 210 every 10 cm)
const RIGHT_SLIDER_MARKS = Array.from({ length: 12 }, (_, i) => MIN_H + i * 10); // 100,110...210

export default function CurrentHeightScreen() {
  const { gender } = useLocalSearchParams<{ gender: string }>();
  const isFemale = gender === 'female';
  
  const personImgSource = isFemale
    ? require('@/assets/images/onboarding/woman_height.webp')
    : require('@/assets/images/onboarding/man_height.webp');

  const [height, setHeight] = useState(175);
  const heightRef = useRef(175);

  const INITIAL_POS = TRACK_HEIGHT * (1 - (175 - MIN_H) / (MAX_H - MIN_H));
  const thumbPos = useSharedValue(INITIAL_POS);

  // UI thread -> JS thread, bypasses React 18 batching
  function updateHeight(h: number) {
    'worklet';
    heightRef.current = h;
    runOnJS(setHeight)(h);
  }

  useAnimatedReaction(
    () => thumbPos.value,
    (pos) => {
      'worklet';
      const frac = 1 - Math.max(0, Math.min(1, pos / TRACK_HEIGHT));
      const h = Math.round(MIN_H + frac * (MAX_H - MIN_H));
      updateHeight(h);
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

  const adjustHeight = (delta: number) => {
    const newH = Math.max(MIN_H, Math.min(MAX_H, heightRef.current + delta));
    thumbPos.value = TRACK_HEIGHT * (1 - (newH - MIN_H) / (MAX_H - MIN_H));
  };

  const thumbStyle = useAnimatedStyle(() => ({
    top: thumbPos.value - THUMB_SIZE / 2,
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    top: thumbPos.value - 4,
  }));

  // Person image height scales from 63% to 138% of container height
  const personStyle = useAnimatedStyle(() => {
    'worklet';
    const frac = 1 - Math.max(0, Math.min(1, thumbPos.value / TRACK_HEIGHT));
    const imgH = SCENE_H * (0.63 + frac * 0.75); // 63% → 138% of scene
    return { height: imgH };
  });

  // Ruler indicator position based on 0–220 scale
  const heightFraction = height / MAX_RULER;

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
        <MaskedView maskElement={<Text style={styles.title}>Current Height</Text>}>
          <LinearGradient colors={['#12879a', '#5cbf5a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={[styles.title, { opacity: 0 }]}>Current Height</Text>
          </LinearGradient>
        </MaskedView>
        <View style={styles.titleUnderline} />
        <Text style={styles.question}>How tall are you?</Text>
        <Text style={styles.subQuestion}>Drag the slider to select your height</Text>
      </View>

      {/* MAIN BODY */}
      <View style={styles.body}>

        {/* LEFT: ruler + person */}
        <View style={styles.leftCol}>
          <View style={styles.sceneRow}>

            {/* Ruler */}
            <View style={styles.rulerContainer}>
              {/* Filled gradient up to current height */}
              <LinearGradient
                colors={['#5cbf5a', '#12879a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.rulerFill,
                  { height: `${heightFraction * 100}%` },
                ]}
              />
              {/* Tick marks & labels */}
              {LEFT_RULER_MARKS.slice().reverse().map((cm, i) => {
                const pct = (cm / MAX_RULER) * 100; // Left side uses 0-220 scale
                return (
                  <View
                    key={cm}
                    style={[styles.rulerTickRow, { bottom: `${pct}%` }]}
                  >
                    <Text style={styles.rulerLabel}>{cm}</Text>
                    <View style={styles.rulerTick} />
                  </View>
                );
              })}
              {/* Current height indicator line */}
              <View
                style={[
                  styles.rulerIndicator,
                  { bottom: `${heightFraction * 100}%` },
                ]}
              />
            </View>

            {/* Person — slides up/down with slider */}
            <View style={styles.imageWrapper}>
              <LinearGradient
                colors={['rgba(92, 191, 90, 0.15)', 'rgba(18, 135, 154, 0.0)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.bgCircle}
              />
              <Animated.Image
                source={personImgSource}
                style={[styles.personImage, personStyle]}
                resizeMode="contain"
              />
            </View>

          </View>

          {/* Current height card under the person */}
          <View style={styles.heightCard}>
            <View style={styles.heightCardIcon}>
              <FontAwesome5 name="ruler-vertical" size={16} color="#12879a" />
            </View>
            <View>
              <Text style={styles.heightCardLabel}>Your Current Height</Text>
              <Text style={styles.heightCardValue}>{height} <Text style={styles.heightCardUnit}>cm</Text></Text>
            </View>
          </View>
        </View>

        {/* RIGHT: slider card */}
        <View style={styles.rightCol}>
          <View style={styles.card}>

            {/* Live height display */}
            <View style={styles.heightDisplay}>
              <Text style={styles.heightValue}>{height}</Text>
              <Text style={styles.heightUnit}>cm</Text>
            </View>
            <View style={styles.cardUnderline} />

            {/* + button */}
            <TouchableOpacity style={styles.adjBtn} onPress={() => adjustHeight(1)} activeOpacity={0.75}>
              <Text style={styles.adjBtnTxt}>+</Text>
            </TouchableOpacity>

            {/* Slider */}
            <View style={styles.trackWrap}>
              <LinearGradient
                colors={['#5cbf5a', '#12879a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.track}
              />
              {/* Tick marks with labels every 10cm */}
              {RIGHT_SLIDER_MARKS.slice().reverse().map((cm, i) => (
                <View key={cm} style={[styles.tick, { top: (TRACK_HEIGHT / 11) * i }]}>
                  <Text style={styles.tickLabel}>{cm}</Text>
                </View>
              ))}

              {/* Thumb — Reanimated, UI thread */}
              <Animated.View
                {...panResponder.panHandlers}
                style={[styles.thumb, thumbStyle]}
              >
                <View style={styles.thumbInner} />
              </Animated.View>

              {/* Bubble */}
              <Animated.View style={[styles.bubble, bubbleStyle]}>
                <Text style={styles.bubbleValue}>{height}</Text>
                <Text style={styles.bubbleUnit}>cm</Text>
              </Animated.View>
            </View>

            {/* - button */}
            <TouchableOpacity style={styles.adjBtn} onPress={() => adjustHeight(-1)} activeOpacity={0.75}>
              <Text style={styles.adjBtnTxt}>−</Text>
            </TouchableOpacity>

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
        onPress={() => router.push({ pathname: '/(onboarding)/step3', params: { gender, height } })}
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

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoIcon: { width: 34, height: 34 },
  logoText: { fontSize: 20, fontWeight: '800', color: '#12879a' },

  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepText: { fontSize: 12, fontWeight: '700', color: '#12879a' },
  progressTrack: { width: 80, height: 5, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeIconWrap: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#eaf6f2', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9, color: '#374151', lineHeight: 13 },

  titleSection: { paddingHorizontal: 16, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  titleUnderline: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#5cbf5a', marginTop: 4, marginBottom: 8 },
  question: { fontSize: 13, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
  subQuestion: { fontSize: 11, color: '#6b7280', lineHeight: 16 },

  body: { flex: 1, flexDirection: 'row', paddingHorizontal: 12, gap: 10 },

  // LEFT column
  leftCol: { flex: 1.5, justifyContent: 'flex-end' },
  sceneRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', minHeight: 180 },

  // Ruler
  rulerContainer: {
    width: 42,
    height: '100%',
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  rulerFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 4,
    opacity: 0.5,
  },
  rulerTickRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 2,
  },
  rulerLabel: { fontSize: 7, color: '#374151', fontWeight: '600', width: 22, textAlign: 'right', marginRight: 1 },
  rulerTick: { flex: 1, height: 1, backgroundColor: '#9ca3af' },
  rulerIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#12879a',
  },

  // Person image — bottom-anchored, height driven by Reanimated
  imageWrapper: {
    flex: 1,
    height: SCENE_H,
    alignItems: 'center',
    justifyContent: 'flex-end',  // feet pinned to bottom, head grows up
    position: 'relative',
    overflow: 'visible',
  },
  bgCircle: {
    position: 'absolute',
    top: '5%',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  personImage: { width: '100%', height: '100%' },

  // Height card
  heightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginTop: 6,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  heightCardIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#eaf6f2', alignItems: 'center', justifyContent: 'center',
  },
  heightCardLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  heightCardValue: { fontSize: 20, fontWeight: '900', color: '#12879a', lineHeight: 24 },
  heightCardUnit: { fontSize: 13, fontWeight: '600', color: '#6b7280' },

  // RIGHT column — no card background
  rightCol: { flex: 1, justifyContent: 'center' },
  card: { padding: 4, alignItems: 'center' },

  heightDisplay: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  heightValue: { fontSize: 36, fontWeight: '900', color: '#12879a', lineHeight: 40 },
  heightUnit: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 4 },
  cardUnderline: { width: 30, height: 3, borderRadius: 2, backgroundColor: '#5cbf5a', marginTop: 4, marginBottom: 8 },

  // +/- buttons
  adjBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#eaf6f2',
    borderWidth: 1.5, borderColor: '#12879a',
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 4,
  },
  adjBtnTxt: { fontSize: 20, fontWeight: '700', color: '#12879a', lineHeight: 24 },

  // Slider track
  trackWrap: {
    width: 36,
    height: TRACK_HEIGHT,
    alignItems: 'center',
    position: 'relative',
    marginVertical: 6,
  },
  track: { width: 8, height: '100%', borderRadius: 4, alignSelf: 'center' },
  tick: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickLabel: {
    position: 'absolute',
    right: 12,
    fontSize: 8,
    color: '#9ca3af',
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },

  thumb: {
    position: 'absolute',
    left: '50%',
    marginLeft: -THUMB_SIZE / 2,
    width: THUMB_SIZE, height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 3, borderColor: '#12879a',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  thumbInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#12879a' },

  bubble: {
    position: 'absolute',
    left: THUMB_SIZE + 2,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bubbleValue: { fontSize: 14, fontWeight: '800', color: '#12879a' },
  bubbleUnit: { fontSize: 9, color: '#6b7280', marginBottom: 1 },

  // Secure row
  secureRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f2f6f7', borderRadius: 10,
    padding: 8, width: '100%', gap: 6, marginTop: 6,
  },
  secureText: { fontSize: 10, color: '#374151', flex: 1, lineHeight: 14 },
  secureGreen: { color: '#5cbf5a', fontWeight: '700' },

  continueWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  continueBtn: { borderRadius: 30, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  continueTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingBottom: 16, paddingHorizontal: 16,
  },
  footerItem: { flex: 1, alignItems: 'center', gap: 4 },
  footerDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },
  footerTxt: { fontSize: 10, color: '#374151', textAlign: 'center', lineHeight: 14, marginTop: 2 },
});
