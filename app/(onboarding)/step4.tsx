import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { Image } from 'react-native';

const LOGO_ICON = require('@/assets/images/brand/logo.png');

const MIN_A = 18;
const MAX_A = 90;
const TRACK_HEIGHT = 280;
const THUMB_SIZE = 26;

const SLIDER_MARKS = Array.from({ length: 8 }, (_, i) => 20 + i * 10); // 20,30...90

const getAgeImage = (gender: string, age: number) => {
  const isFemale = gender === 'female';
  if (age <= 30) {
    return isFemale
      ? require('@/assets/images/onboarding/age/woman_20_age.webp')
      : require('@/assets/images/onboarding/age/man_20_age.webp');
  } else if (age <= 50) {
    return isFemale
      ? require('@/assets/images/onboarding/age/woman_30_age.webp')
      : require('@/assets/images/onboarding/age/man_30_age.webp');
  } else if (age <= 70) {
    return isFemale
      ? require('@/assets/images/onboarding/age/woman_50_age.webp')
      : require('@/assets/images/onboarding/age/man_50_age.webp');
  } else {
    return isFemale
      ? require('@/assets/images/onboarding/age/woman_70_age.webp')
      : require('@/assets/images/onboarding/age/man_70_age.webp');
  }
};

export default function CurrentAgeScreen() {
  const { gender, height, weight } = useLocalSearchParams<{ gender: string; height: string; weight: string }>();

  const [age, setAge] = useState(28);
  const ageRef = useRef(28);

  const INITIAL_POS = TRACK_HEIGHT * (1 - (28 - MIN_A) / (MAX_A - MIN_A));
  const thumbPos = useSharedValue(INITIAL_POS);

  function updateAge(a: number) {
    'worklet';
    ageRef.current = a;
    runOnJS(setAge)(a);
  }

  useAnimatedReaction(
    () => thumbPos.value,
    (pos) => {
      'worklet';
      const frac = 1 - Math.max(0, Math.min(1, pos / TRACK_HEIGHT));
      const a = Math.round(MIN_A + frac * (MAX_A - MIN_A));
      updateAge(a);
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
        <MaskedView maskElement={<Text style={styles.title}>Current Age</Text>}>
          <LinearGradient colors={['#12879a', '#5cbf5a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={[styles.title, { opacity: 0 }]}>Current Age</Text>
          </LinearGradient>
        </MaskedView>
        <View style={styles.titleUnderline} />
        <Text style={styles.question}>What is your current age?</Text>
        <Text style={styles.subQuestion}>Move the slider to select your age</Text>
      </View>

      {/* MAIN BODY */}
      <View style={styles.body}>

        {/* LEFT: person + card */}
        <View style={styles.leftCol}>
          <View style={styles.imageWrapper}>
            <LinearGradient
              colors={['rgba(92, 191, 90, 0.15)', 'rgba(18, 135, 154, 0.0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.bgCircle}
            />
            <Image
              source={getAgeImage(gender || 'male', age)}
              style={styles.personImage}
              resizeMode="contain"
            />
          </View>
            
          {/* Current age card below person */}
          <View style={styles.ageCard}>
            <View style={styles.ageCardIcon}>
              <FontAwesome5 name="birthday-cake" size={16} color="#12879a" />
            </View>
            <View>
              <Text style={styles.ageCardLabel}>Your Current Age</Text>
              <Text style={styles.ageCardValue}>{age} <Text style={styles.ageCardUnit}>Years</Text></Text>
            </View>
          </View>
        </View>

        {/* RIGHT: slider card */}
        <View style={styles.rightCol}>
          <View style={styles.card}>
            
            <Text style={styles.limitLabelTop}>Max{'\n'}90 Years</Text>

            {/* Slider */}
            <View style={styles.trackWrap}>
              <LinearGradient
                colors={['#5cbf5a', '#12879a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.track}
              />
              {/* Tick marks */}
              {SLIDER_MARKS.map((yr) => (
                <View key={yr} style={[styles.tick, { top: TRACK_HEIGHT * (1 - (yr - MIN_A) / (MAX_A - MIN_A)) }]}>
                  <Text style={styles.tickLabel}>{yr}</Text>
                </View>
              ))}

              {/* Thumb */}
              <Animated.View
                {...panResponder.panHandlers}
                style={[styles.thumb, thumbStyle]}
              >
                <View style={styles.thumbInner} />
              </Animated.View>

              {/* Bubble */}
              <Animated.View style={[styles.bubble, bubbleStyle]}>
                <Text style={styles.bubbleValue}>{age}</Text>
                <Text style={styles.bubbleUnit}>Years</Text>
              </Animated.View>
            </View>

            <Text style={styles.limitLabelBottom}>Min{'\n'}18 Years</Text>

          </View>
        </View>

      </View>

      {/* CONTINUE BUTTON */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/(onboarding)/step5' as any, params: { gender, height, weight, age } })}
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
      
      <View style={{height: 20}} />

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

  titleSection: { paddingHorizontal: 16, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  titleUnderline: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#5cbf5a', marginTop: 4, marginBottom: 8 },
  question: { fontSize: 13, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
  subQuestion: { fontSize: 11, color: '#6b7280', lineHeight: 16 },

  body: { flex: 1, flexDirection: 'row', paddingHorizontal: 12, gap: 10 },

  // LEFT column
  leftCol: { flex: 1.5, justifyContent: 'flex-end', paddingBottom: 20 },

  imageWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  bgCircle: {
    position: 'absolute',
    top: '15%',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  personImage: { width: '80%', height: '80%' },

  // Age card
  ageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginTop: -16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  ageCardIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#eaf6f2', alignItems: 'center', justifyContent: 'center',
  },
  ageCardLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  ageCardValue: { fontSize: 20, fontWeight: '900', color: '#12879a', lineHeight: 24 },
  ageCardUnit: { fontSize: 13, fontWeight: '600', color: '#6b7280' },

  // RIGHT column
  rightCol: { flex: 1, justifyContent: 'center' },
  card: { 
    padding: 16, 
    paddingVertical: 24,
    alignItems: 'center',
  },

  limitLabelTop: { fontSize: 10, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginBottom: 12 },
  limitLabelBottom: { fontSize: 10, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginTop: 12 },

  // Slider track
  trackWrap: {
    width: 36,
    height: TRACK_HEIGHT,
    alignItems: 'center',
    position: 'relative',
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
    fontSize: 10,
    color: '#4b5563',
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
    left: THUMB_SIZE + 6,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
    alignItems: 'center',
    minWidth: 46
  },
  bubbleValue: { fontSize: 15, fontWeight: '800', color: '#5cbf5a', lineHeight: 18 },
  bubbleUnit: { fontSize: 10, color: '#1f2937', fontWeight: '600' },

  continueWrap: { paddingHorizontal: 16, paddingTop: 10 },
  continueBtn: { borderRadius: 30, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  continueTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
