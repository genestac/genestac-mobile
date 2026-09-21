import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/colors';
import { FastingProgramState, BloodTestRequest } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { fetchTestRequests, createBloodTestRequest } from '@/lib/api';
import { BloodTestWidget } from '@/components/dashboard/BloodTestWidget';
import {
  getFastingProgramState,
  advanceFastingPhase,
  resetFastingProgramState,
  saveFastingProgramState,
} from '@/lib/fastingStorage';
import { getNotificationPreferences, saveNotificationPreferences } from '@/lib/notificationStorage';
import { syncAllNotifications } from '@/lib/notifications';

export default function FastingScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [programState, setProgramState] = useState<FastingProgramState | null>(null);
  const [nowDate, setNowDate] = useState(new Date());
  const [waterMl, setWaterMl] = useState(500);
  const [fastingNotifsEnabled, setFastingNotifsEnabled] = useState(true);

  // Blood test request state
  const [bloodTestRequests, setBloodTestRequests] = useState<BloodTestRequest[]>([]);
  const [bloodTestLoading, setBloodTestLoading] = useState(false);

  useEffect(() => {
    loadState();
    const interval = setInterval(() => {
      setNowDate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentSecs = nowDate.getHours() * 3600 + nowDate.getMinutes() * 60 + nowDate.getSeconds();
  const EATING_START = 11 * 3600; // 11:00 AM (39600s)
  const EATING_END = 19 * 3600;   // 7:00 PM (68400s)
  const DAY_SECS = 24 * 3600;     // 86400s

  const isEatingActive = currentSecs >= EATING_START && currentSecs < EATING_END;
  const isFastingActiveNow = !isEatingActive;

  // Eating timer remaining (11 AM to 7 PM)
  let eatingSecsRemaining = 0;
  if (isEatingActive) {
    eatingSecsRemaining = EATING_END - currentSecs;
  } else if (currentSecs < EATING_START) {
    eatingSecsRemaining = EATING_START - currentSecs;
  } else {
    eatingSecsRemaining = (DAY_SECS - currentSecs) + EATING_START;
  }

  // Fasting timer remaining (7 PM to 11 AM)
  let fastingSecsRemaining = 0;
  if (currentSecs >= EATING_END) {
    fastingSecsRemaining = (DAY_SECS - currentSecs) + EATING_START;
  } else if (currentSecs < EATING_START) {
    fastingSecsRemaining = EATING_START - currentSecs;
  } else {
    fastingSecsRemaining = EATING_END - currentSecs;
  }

  const loadState = async () => {
    setLoading(true);
    const state = await getFastingProgramState();
    setProgramState(state);
    if (state.waterIntakeMl) {
      setWaterMl(state.waterIntakeMl);
    }
    try {
      const prefs = await getNotificationPreferences();
      setFastingNotifsEnabled(prefs.fastingRemindersEnabled);
    } catch (e) {
      console.error('Error loading notification prefs:', e);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const reqs = await fetchTestRequests(session.user.id);
        setBloodTestRequests(reqs);
      }
    } catch (e) {
      console.error('Error loading blood test requests:', e);
    }
    setLoading(false);
  };

  const handleCreateBloodTestRequest = async (conditionText: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setBloodTestLoading(true);
    try {
      const newReq = await createBloodTestRequest(session.user.id, conditionText);
      if (newReq) {
        setBloodTestRequests((prev) => [newReq, ...prev]);
        Alert.alert(
          "Request Submitted",
          "Your blood test request has been sent to our medical team. A doctor will review your request and get back to you shortly."
        );
      }
    } catch (err) {
      console.error("Error creating blood test request:", err);
    } finally {
      setBloodTestLoading(false);
    }
  };


  const handleToggleNotifs = async (val: boolean) => {
    setFastingNotifsEnabled(val);
    try {
      const prefs = await getNotificationPreferences();
      prefs.fastingRemindersEnabled = val;
      await saveNotificationPreferences(prefs);
      await syncAllNotifications(prefs);
    } catch (e) {
      console.error('Error saving notification prefs:', e);
    }
  };

  const handleAdvance = async () => {
    if (!programState) return;
    setLoading(true);
    const updated = await advanceFastingPhase(programState.phase);
    setProgramState(updated);
    setLoading(false);
  };

  const handleStartProgram = () => {
    Alert.alert(
      'Intermittent Fasting Schedule',
      'Your Daily 16:8 Fasting Timings:\n\n• Eating Window: 11:00 AM – 7:00 PM\n  (Hourly reminders for eating & nourishment)\n\n• Fasting Window: 7:00 PM – 11:00 AM\n  (Avoid having meals. Plain water, tea/coffee permitted)\n\nHourly notifications are active on your device!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Start',
          onPress: async () => {
            await handleAdvance();
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Fasting Timer',
      'Are you sure you want to stop active fasting and return to standard mode?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const fresh = await resetFastingProgramState();
            setProgramState(fresh);
            setLoading(false);
          },
        },
      ]
    );
  };

  const addWater = async (amount: number) => {
    const newTotal = waterMl + amount;
    setWaterMl(newTotal);
    if (programState) {
      const updated = { ...programState, waterIntakeMl: newTotal };
      setProgramState(updated);
      await saveFastingProgramState(updated);
    }
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !programState) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Fasting Protocol...</Text>
      </SafeAreaView>
    );
  }

  const isFastingActive = programState.phase === 'FASTING_ACTIVE';
  const currentHour = new Date().getHours();
  const isEatingWindowNow = currentHour >= 11 && currentHour < 19;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Intermittent Fasting</Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {isFastingActive ? (
          /* FASTING ACTIVE VIEW */
          <View>
            

            {/* Current Real-Time Window Banner */}
            <View style={[
              styles.currentWindowBanner,
              isEatingWindowNow ? { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' } : { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }
            ]}>
              <Ionicons
                name={isEatingWindowNow ? "restaurant" : "moon"}
                size={22}
                color={isEatingWindowNow ? "#15803D" : "#BE123C"}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.currentWindowTitle, { color: isEatingWindowNow ? "#15803D" : "#BE123C" }]}>
                  {isEatingWindowNow ? "🟢 Eating Window Active (11 AM – 7 PM)" : "🔒 Fasting Window Active (7 PM – 11 AM)"}
                </Text>
                <Text style={styles.currentWindowDesc}>
                  {isEatingWindowNow
                    ? "Your eating window is currently open! Enjoy balanced, nutrient-dense meals. Hourly reminders are active."
                    : "Fasting period in progress. Avoid having meals. Drink plain water, herbal tea, or black coffee."}
                </Text>
              </View>
            </View>

            {/* Single Dynamic Circular Clock Timer */}
            <Text style={styles.sectionTitle}>
              {isEatingActive ? "Eating Window Timer" : "Fasting Window Timer"}
            </Text>

            <View style={styles.timerCard}>
              <View style={styles.timerCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons
                    name={isEatingActive ? "restaurant" : "moon"}
                    size={20}
                    color={isEatingActive ? "#15803D" : "#BE123C"}
                  />
                  <Text style={styles.timerCardHeaderTitle}>
                    {isEatingActive
                      ? "Eating Window Timer (11:00 AM – 7:00 PM)"
                      : "Fasting Window Timer (7:00 PM – 11:00 AM)"}
                  </Text>
                </View>
              </View>

              <View style={[
                styles.timerCircle,
                { borderColor: isEatingActive ? '#10B981' : '#E11D48' }
              ]}>
                <Text style={[styles.timerDisplay, { color: isEatingActive ? '#15803D' : '#BE123C' }]}>
                  {formatTimer(isEatingActive ? eatingSecsRemaining : fastingSecsRemaining)}
                </Text>
                <Text style={styles.timerSub}>
                  {isEatingActive ? "Eating Time Remaining" : "Fasting Time Remaining"}
                </Text>
              </View>

              <View style={styles.stageIndicator}>
                <View style={[
                  styles.stageChipActive,
                  !isEatingActive && { backgroundColor: '#BE123C' }
                ]}>
                  <Ionicons
                    name={isEatingActive ? "restaurant" : "flame"}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.stageChipText}>
                    {isEatingActive ? "Eating Window Active" : "Ketosis & Autophagy Active"}
                  </Text>
                </View>
                <Text style={styles.stageDesc}>
                  {isEatingActive
                    ? "Enjoy wholesome meals & stay nourished during your 8-hour eating window."
                    : "Your body is mobilizing stored fat reserves and optimizing blood sugar control!"}
                </Text>
              </View>
            </View>

            {/* Doctor Blood Test Request Widget */}
            <BloodTestWidget
              requests={bloodTestRequests}
              onRequestSubmitted={handleCreateBloodTestRequest}
              loading={bloodTestLoading}
            />

            {/* Hydration Tracker */}
            <View style={styles.waterCard}>
              <View style={styles.waterHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="water" size={22} color="#0284C7" />
                  <Text style={styles.waterTitle}>Fasting Hydration</Text>
                </View>
                <Text style={styles.waterAmount}>{waterMl} ml</Text>
              </View>
              <Text style={styles.waterSub}>Drink plenty of water during your fast</Text>
              <View style={styles.waterBtnRow}>
                <TouchableOpacity style={styles.waterAddBtn} onPress={() => addWater(250)}>
                  <Text style={styles.waterAddText}>+ 250 ml Water</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.waterAddBtn} onPress={() => addWater(500)}>
                  <Text style={styles.waterAddText}>+ 500 ml Water</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 16:8 Fasting Schedule & Reminders Card */}
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={styles.scheduleIconBg}>
                    <Ionicons name="time-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleTitle}>Fasting Schedule & Reminders</Text>
                    <Text style={styles.scheduleSubtitle}>Eating: 11 AM – 7 PM | Fasting: 7 PM – 11 AM</Text>
                  </View>
                </View>
                <Switch
                  value={fastingNotifsEnabled}
                  onValueChange={handleToggleNotifs}
                  trackColor={{ false: '#CBD5E1', true: Colors.primaryLight }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Hourly Notification Schedule List */}
              <View style={styles.notifListContainer}>
                <Text style={styles.notifListTitle}>Hourly Reminder Notification Schedule</Text>
                <View style={styles.notifRow}>
                  <Ionicons name="notifications" size={16} color={Colors.primary} style={{ marginTop: 2 }} />
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTimeText}>11:00 AM</Text>
                    <Text style={styles.notifDescText}> Eating window opens (Break fast with nutritious food)</Text>
                  </View>
                </View>
                <View style={styles.notifRow}>
                  <Ionicons name="notifications-outline" size={16} color="#16A34A" style={{ marginTop: 2 }} />
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTimeText}>12:00 PM – 6:00 PM</Text>
                    <Text style={styles.notifDescText}> Hourly reminders to eat meals & stay hydrated</Text>
                  </View>
                </View>
                <View style={styles.notifRow}>
                  <Ionicons name="notifications" size={16} color="#DC2626" style={{ marginTop: 2 }} />
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTimeText}>7:00 PM</Text>
                    <Text style={styles.notifDescText}> Eating window closes & 16-hour fast starts</Text>
                  </View>
                </View>
                <View style={styles.notifRow}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#475569" style={{ marginTop: 2 }} />
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTimeText}>7:00 PM – 11:00 AM</Text>
                    <Text style={styles.notifDescText}> Fasting period (avoid having meals)</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* End Fasting Button */}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#EF4444' }]} onPress={handleReset} activeOpacity={0.85}>
              <Ionicons name="stop-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Stop / End Fasting</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* NOT STARTED VIEW */
          <View>
            {/* Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroBadge}>
                <Ionicons name="flame" size={16} color={Colors.primaryLight} />
                <Text style={styles.heroBadgeText}>16:8 Protocol</Text>
              </View>
              <Text style={styles.heroTitle}>16:8 Intermittent Fasting</Text>
              <Text style={styles.heroDescription}>
                Accelerate weight loss, improve insulin sensitivity, and trigger autophagy with guided 16:8 intermittent fasting.
              </Text>
            </View>

            {/* 16:8 Fasting Schedule & Hourly Reminders Card */}
            <Text style={styles.sectionTitle}>Fasting Schedule & Hourly Reminders</Text>
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={styles.scheduleIconBg}>
                    <Ionicons name="time-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleTitle}>Daily Fasting Timings</Text>
                    <Text style={styles.scheduleSubtitle}>Eating: 11:00 AM – 7:00 PM</Text>
                    <Text style={styles.scheduleSubtitle}>Fasting: 7:00 PM – 11:00 AM</Text>
                  </View>
                </View>
                <Switch
                  value={fastingNotifsEnabled}
                  onValueChange={handleToggleNotifs}
                  trackColor={{ false: '#CBD5E1', true: Colors.primaryLight }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.scheduleBoxGrid}>
                {/* Eating Window Box */}
                <View style={[styles.windowBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="restaurant" size={16} color="#15803D" />
                    <Text style={[styles.windowBoxTitle, { color: '#15803D' }]}>EATING WINDOW</Text>
                  </View>
                  <Text style={styles.windowTimeText}>11:00 AM – 7:00 PM</Text>
                  <Text style={styles.windowDescText}>
                    Hourly reminders active between 11 AM and 7 PM for eating & nourishment.
                  </Text>
                </View>

                {/* Fasting Window Box */}
                <View style={[styles.windowBox, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="moon" size={16} color="#BE123C" />
                    <Text style={[styles.windowBoxTitle, { color: '#BE123C' }]}>FASTING WINDOW</Text>
                  </View>
                  <Text style={styles.windowTimeText}>7:00 PM – 11:00 AM</Text>
                  <Text style={styles.windowDescText}>
                    16-hour clean fast. Avoid having meals. Water, herbal tea & black coffee allowed.
                  </Text>
                </View>
              </View>

              {/* Hourly Notification Schedule List */}
              <View style={styles.notifListContainer}>
                <Text style={styles.notifListTitle}>Hourly Reminder Notification Schedule</Text>
                <View style={styles.notifRow}>
                  <Ionicons name="notifications" size={16} color={Colors.primary} style={{ marginTop: 2 }} />
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTimeText}>11:00 AM</Text>
                    <Text style={styles.notifDescText}> Eating window opens (Break fast with nutritious food)</Text>
                  </View>
                </View>
                <View style={styles.notifRow}>
                  <Ionicons name="notifications-outline" size={16} color="#16A34A" style={{ marginTop: 2 }} />
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTimeText}>12:00 PM – 6:00 PM</Text>
                    <Text style={styles.notifDescText}> Hourly reminders to eat meals & stay hydrated</Text>
                  </View>
                </View>
                <View style={styles.notifRow}>
                  <Ionicons name="notifications" size={16} color="#DC2626" style={{ marginTop: 2 }} />
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTimeText}>7:00 PM</Text>
                    <Text style={styles.notifDescText}> Eating window closes & 16-hour fast starts</Text>
                  </View>
                </View>
                <View style={styles.notifRow}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#475569" style={{ marginTop: 2 }} />
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTimeText}>7:00 PM – 11:00 AM</Text>
                    <Text style={styles.notifDescText}> Fasting period (avoid having meals)</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* How It Works Breakdown */}
            <Text style={styles.sectionTitle}>How 16:8 Fasting Works</Text>

            <View style={styles.timelineCard}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineIconBg, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="restaurant" size={24} color="#16A34A" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDay}>8-Hour Eating Window (11 AM – 7 PM)</Text>
                  <Text style={styles.timelineText}>
                    Consume your daily meals, proteins, and healthy fats. Hourly notifications keep you nourished on time.
                  </Text>
                </View>
              </View>

              <View style={styles.timelineDivider} />

              <View style={styles.timelineItem}>
                <View style={[styles.timelineIconBg, { backgroundColor: '#FFF1F2' }]}>
                  <Ionicons name="moon" size={24} color="#E11D48" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDay}>16-Hour Fasting Window (7 PM – 11 AM)</Text>
                  <Text style={styles.timelineText}>
                    Avoid meals & calories. Your body burns stored lipids, lowers blood sugar, and clears cellular stress.
                  </Text>
                </View>
              </View>
            </View>

            {/* Action CTA */}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStartProgram} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Start Fasting Program</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  resetButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.xl,
    padding: 24,
    marginBottom: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(14, 143, 110, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginBottom: 14,
  },
  heroBadgeText: {
    color: Colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 10,
    lineHeight: 28,
  },
  heroDescription: {
    fontSize: 14,
    color: '#B8CEC9',
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 10,
  },
  timelineCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDay: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  timelineDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusHeaderBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: 16,
  },
  statusHeaderBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  currentWindowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  currentWindowTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  currentWindowDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  timerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  timerCardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  timerCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 6,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timerDisplay: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  timerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  stageIndicator: {
    alignItems: 'center',
  },
  stageChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 6,
  },
  stageChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  stageDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  waterCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  waterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  waterAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0284C7',
  },
  waterSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  waterBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  waterAddBtn: {
    flex: 1,
    backgroundColor: '#E0F2FE',
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  waterAddText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 13,
  },
  scheduleCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  scheduleIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scheduleSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  scheduleBoxGrid: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },
  windowBox: {
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  windowBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  windowTimeText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  windowDescText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  notifListContainer: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: 12,
  },
  notifListTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 6,
  },
  notifContent: {
    flex: 1,
  },
  notifTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  notifDescText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  dualTimersRow: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  timerBoxCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  activeEatingCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  activeFastingCard: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  inactiveTimerCard: {
    backgroundColor: Colors.white,
    borderColor: Colors.borderLight,
  },
  timerBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timerStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  badgeGreenBg: {
    backgroundColor: '#DCFCE7',
  },
  badgeRoseBg: {
    backgroundColor: '#FFE4E6',
  },
  badgeGrayBg: {
    backgroundColor: '#F1F5F9',
  },
  timerStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textGreen: {
    color: '#15803D',
  },
  textRose: {
    color: '#BE123C',
  },
  textGray: {
    color: '#64748B',
  },
  timerBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timerBoxWindow: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    fontWeight: '500',
  },
  timerBoxDisplay: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  timerBoxSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
