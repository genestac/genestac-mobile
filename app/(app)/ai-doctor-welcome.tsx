import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Audio, Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

const { width } = Dimensions.get('window');

export default function AIDoctorWelcomeScreen() {
  const [sound, setSound] = useState<Audio.Sound>();
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<Video>(null);

  // All animated values — exclusively useNativeDriver: false to avoid
  // the mixed-driver crash caused by Animated.multiply on shared nodes.
  const headerAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const videoAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;
  const ctaGlow = useRef(new Animated.Value(0)).current;

  async function playSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/images/ai_doctor/welcome_doctor_audio.m4a'),
        { shouldPlay: true, isLooping: false }
      );
      setSound(sound);
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  }

  // ── Re-play video + sound every time this tab comes into focus ──────────────
  useFocusEffect(
    useCallback(() => {
      // Reset state
      setVideoEnded(false);
      ctaScale.setValue(1);
      ctaPulse.setValue(1);
      ctaGlow.setValue(0);

      // Reset entrance animations so they replay
      headerAnim.setValue(0);
      textAnim.setValue(0);
      videoAnim.setValue(0);
      sheetAnim.setValue(0);

      // Replay the video from the beginning
      videoRef.current?.replayAsync().catch(() => {
        // If replayAsync fails (first load), the shouldPlay prop handles it
        videoRef.current?.playAsync().catch(() => {});
      });

      // Stagger entrance animations
      Animated.stagger(120, [
        Animated.timing(headerAnim, {
          toValue: 1, duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(textAnim, {
          toValue: 1, duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(videoAnim, {
          toValue: 1, duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(sheetAnim, {
          toValue: 1, duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();

      // Play welcome audio
      playSound();

      // Cleanup when screen loses focus
      return () => {
        sound?.stopAsync().catch(() => {});
        sound?.unloadAsync().catch(() => {});
        setSound(undefined);
        videoRef.current?.pauseAsync().catch(() => {});
      };
    }, [])
  );


  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish && !videoEnded) {
      setVideoEnded(true);

      // Pop the CTA button to draw attention
      Animated.sequence([
        Animated.timing(ctaScale, { toValue: 1.06, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.spring(ctaScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: false }),
      ]).start();

      // Soft breathing pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(ctaPulse, { toValue: 1.03, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(ctaPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      ).start();

      // Glow shadow
      Animated.loop(
        Animated.sequence([
          Animated.timing(ctaGlow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(ctaGlow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      ).start();
    }
  };

  const headerStyle = { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] };
  const textStyle = { opacity: textAnim, transform: [{ translateY: textAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] };
  const videoStyle = { opacity: videoAnim, transform: [{ scale: videoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] };
  const sheetStyle = { opacity: sheetAnim, transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }] };
  const glowOpacity = ctaGlow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.4] });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E6F5F6" />

      {/* Top background section */}
      <View style={styles.topSection}>
        {/* Header */}
        <Animated.View style={[styles.header, headerStyle]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Feather name="arrow-left" size={22} color="#095D6A" />
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <Feather name="plus-square" size={22} color="#095D6A" />
            <View style={styles.logoTextContainer}>
              <Text style={styles.logoTitle}>Genestac</Text>
              <Text style={styles.logoSubtitle}>AI Health coach</Text>
            </View>
          </View>
        </Animated.View>

        {/* Welcome Text */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.greetingTitle}>Hi, I'm your{'\n'}AI Health coach</Text>
          <Text style={styles.greetingSubtitle}>
            Here to understand your health{'\n'}and help you live better.
          </Text>
        </Animated.View>

        {/* Doctor video — fills remaining space */}
        <Animated.View style={[styles.videoWrapper, videoStyle]}>
          <Video
            source={require('../../assets/images/ai_doctor/welcome_doctor.mp4')}
            style={styles.doctorVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isMuted
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
        </Animated.View>
      </View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, sheetStyle]}>
        {/* Trust Badges */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#095D6A" />
            <Text style={styles.featureText}>100% Private</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#095D6A" />
            <Text style={styles.featureText}>Secure</Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="shield-cross-outline" size={20} color="#095D6A" />
            <Text style={styles.featureText}>HIPAA Compliant</Text>
          </View>
        </View>

        {/* CTA Button */}
        <Animated.View
          style={{
            transform: [{ scale: Animated.multiply(ctaScale, ctaPulse) }],
            shadowColor: '#107C84',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: glowOpacity as unknown as number,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/(app)/ai-doctor-chat')}
          >
            <Text style={styles.primaryButtonText}>Start Health Assessment</Text>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Hyperlink */}
        <TouchableOpacity
          style={styles.hyperlinkButton}
          activeOpacity={0.6}
          onPress={() => router.push('/(app)/ai-doctor-chat')}
        >
          <Text style={styles.hyperlinkText}>Continue Previous Assessment</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F5F6' },
  topSection: { flex: 1, paddingHorizontal: 24, paddingTop: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { padding: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoTextContainer: { marginLeft: 6 },
  logoTitle: { fontSize: 16, fontWeight: '800', color: '#095D6A', lineHeight: 18 },
  logoSubtitle: { fontSize: 11, fontWeight: '600', color: '#095D6A', lineHeight: 13 },
  textContainer: { marginBottom: 12 },
  greetingTitle: { fontSize: 30, fontWeight: '800', color: '#14293D', marginBottom: 8, lineHeight: 36 },
  greetingSubtitle: { fontSize: 14, color: '#4A5E6D', lineHeight: 21, fontWeight: '500' },
  videoWrapper: {
    flex: 1,
    width: width * 0.82,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: -20,
  },
  doctorVideo: { flex: 1 },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 14,
  },
  featuresContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 4 },
  featureItem: { alignItems: 'center', flex: 1 },
  featureDivider: { width: 1, height: 24, backgroundColor: '#E5E7EB' },
  featureText: { marginTop: 5, fontSize: 10, fontWeight: '500', color: '#4A5E6D', textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#107C84',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  hyperlinkButton: { alignItems: 'center', paddingVertical: 4 },
  hyperlinkText: { color: '#095D6A', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
});