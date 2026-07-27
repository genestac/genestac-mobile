import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeLinearGradient as LinearGradient } from '@/components/ui/SafeLinearGradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const LOGO_ICON = require('@/assets/images/brand/logo.webp');

const GENDER_OPTIONS = [
  {
    key: 'male',
    label: 'Male',
    icon: <Ionicons name="male" size={20} color="#12879a" />,
    color: '#12879a',
  },
  {
    key: 'female',
    label: 'Female',
    icon: <Ionicons name="female" size={20} color="#5cbf5a" />,
    color: '#5cbf5a',
  },
  {
    key: 'na',
    label: 'Prefer not to say',
    icon: <MaterialCommunityIcons name="gender-male-female" size={20} color="#2f8fd6" />,
    color: '#2f8fd6',
  },
];

export default function GenderScreen() {
  const [selected, setSelected] = useState('male');
  const [displayGender, setDisplayGender] = useState('male');
  const imageOpacity = useSharedValue(1);

  const getImageForGender = (gender: string) => {
    switch (gender) {
      case 'male':
        return require('@/assets/images/onboarding/man.webp');
      case 'female':
        return require('@/assets/images/onboarding/woman.webp');
      default:
        return require('@/assets/images/onboarding/man_woman.webp');
    }
  };

  const handleGenderSelect = (gender: string) => {
    if (gender === selected) return;
    setSelected(gender);
    imageOpacity.value = withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease) }, (finished) => {
      if (finished) {
        runOnJS(setDisplayGender)(gender);
        imageOpacity.value = withTiming(1, { duration: 250, easing: Easing.inOut(Easing.ease) });
      }
    });
  };

  const animatedImageStyle = useAnimatedStyle(() => ({ opacity: imageOpacity.value }));

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


      {/* TITLE SECTION (Full Width) */}
      <View style={styles.titleSection}>
        <MaskedView maskElement={<Text style={styles.title}>Gender</Text>}>
          <LinearGradient colors={['#12879a', '#5cbf5a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={[styles.title, { opacity: 0 }]}>Gender</Text>
          </LinearGradient>
        </MaskedView>
        <View style={styles.titleUnderline} />

        <Text style={styles.question}>What is your gender?</Text>
        <Text style={styles.subQuestion}>Please select the option that best describes you</Text>
      </View>

      {/* MAIN BODY */}
      <View style={styles.body}>

        {/* LEFT COLUMN */}
        <View style={styles.leftCol}>
          <View style={styles.imageWrapper}>
            {/* Gradient Background Circle */}
            <LinearGradient
              colors={['rgba(92, 191, 90, 0.15)', 'rgba(18, 135, 154, 0.0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.bgCircle}
            />

            
            <Animated.Image
              source={getImageForGender(displayGender)}
              style={[styles.personImage, animatedImageStyle]}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* RIGHT COLUMN */}
        <View style={styles.rightCol}>
          <View style={styles.card}>

            <Text style={styles.cardTitle}>Select your gender</Text>
            <View style={styles.cardUnderline} />

            {GENDER_OPTIONS.map((opt) => {
              const isSelected = selected === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  activeOpacity={0.8}
                  onPress={() => handleGenderSelect(opt.key)}
                  style={[styles.option, isSelected && { borderColor: opt.color, borderWidth: 2 }]}
                >
                  <View style={styles.optionIconWrap}>{opt.icon}</View>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  {isSelected && (
                    <View style={[styles.check, { backgroundColor: opt.color }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <View style={styles.secureRow}>
              <FontAwesome5 name="shield-alt" size={12} color="#5cbf5a" />
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
        onPress={() => router.push({ pathname: '/(onboarding)/step2', params: { gender: selected } })}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f7fafb',
  },
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
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#12879a',
  },
  progressTrack: {
    width: 80,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#eaf6f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 13,
  },
  titleSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 10,
  },
  leftCol: {
    flex: 1.5,
    paddingTop: 4,
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
    marginBottom: 12,
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    minHeight: 180,
  },
  bgCircle: {
    position: 'absolute',
    top: '10%',
    width: 200,
    height: 200,
    borderRadius: 100,
  },

  personImage: {
    width: '100%',
    height: '100%',
  },
  rightCol: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  cardUnderline: {
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#5cbf5a',
    marginTop: 4,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    position: 'relative',
  },
  optionIconWrap: {
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f6f7',
    borderRadius: 10,
    padding: 8,
    width: '100%',
    gap: 6,
    marginTop: 4,
  },
  secureText: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
    lineHeight: 14,
  },
  secureGreen: {
    color: '#5cbf5a',
    fontWeight: '700',
  },
  continueWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
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
