import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pedometer } from 'expo-sensors';
import { supabase } from '@/lib/supabase';
import { fetchUserJourney, fetchUserPlans, saveUserStepLog } from '@/lib/api';
import { StepLog, WeightJourney } from '@/lib/types';
import { Colors, Fonts, Spacing, Radius } from '@/constants/colors';

const DEFAULT_GOAL = 10000;
// How often we push live step updates to Supabase while the screen is open
const SYNC_INTERVAL_MS = 30000;

export default function StepsScreen() {
  const [loading, setLoading] = useState(true);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean | null>(null);
  const [currentSteps, setCurrentSteps] = useState(0);
  const [stepGoal, setStepGoal] = useState(DEFAULT_GOAL);
  const [history, setHistory] = useState<StepLog[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Modal states
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState('10000');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStepsInput, setManualStepsInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Refs to avoid stale closures inside the pedometer subscription / interval
  const baseStepsRef = useRef(0); // steps already logged today (from getStepCountAsync), before live watch started
  const liveDeltaRef = useRef(0); // steps counted by watchStepCount since subscribing
  const stepGoalRef = useRef(stepGoal);
  const userIdRef = useRef<string | null>(null);
  const lastSyncedStepsRef = useRef(0);

  useEffect(() => {
    stepGoalRef.current = stepGoal;
  }, [stepGoal]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Calculated Metrics
  const distanceKm = Number((currentSteps * 0.000762).toFixed(2));
  const caloriesBurned = Math.round(currentSteps * 0.04);
  const activeMinutes = Math.round(currentSteps / 100);
  const progressPercent = Math.min(Math.round((currentSteps / stepGoal) * 100), 100);

  // Load User Data & Step History from Supabase
  const loadUserData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/(auth)/login');
        return;
      }
      setUserId(session.user.id);

      const [journey, userPlan] = await Promise.all([
        fetchUserJourney(session.user.id),
        fetchUserPlans(session.user.id),
      ]);

      if (journey?.stepGoal) setStepGoal(journey.stepGoal);

      const stepLogs = userPlan?.steps_history || journey?.stepLogs || [];
      if (stepLogs.length > 0) {
        setHistory(stepLogs);
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLog = stepLogs.find(s => s.date.split('T')[0] === todayStr);
        if (todayLog) {
          setCurrentSteps(todayLog.steps);
          baseStepsRef.current = todayLog.steps;
          lastSyncedStepsRef.current = todayLog.steps;
        }
      }
    } catch (err) {
      console.error('Error loading step history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load User Data & Step History
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Sync today's steps to Supabase
  const syncStepsToSupabase = useCallback(async (stepsCount: number, goalVal: number) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const dist = Number((stepsCount * 0.000762).toFixed(2));
    const cals = Math.round(stepsCount * 0.04);

    const todayLog: StepLog = {
      date: todayStr,
      steps: stepsCount,
      goal: goalVal,
      distanceKm: dist,
      caloriesBurned: cals,
    };

    try {
      await saveUserStepLog(uid, todayLog, goalVal);
      lastSyncedStepsRef.current = stepsCount;
    } catch (err) {
      console.error('Error syncing steps to Supabase:', err);
    }
  }, []);

  // ---- Pedometer subscription ----
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let isMounted = true;

    const subscribeToPedometer = async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        console.log('Pedometer available:', isAvailable); // TEMP: remove after testing
        if (!isMounted) return;
        setIsPedometerAvailable(isAvailable);

        if (!isAvailable) {
          console.warn(
            'Pedometer not available on this device. ' +
            'Note: simulators/emulators never report real steps — test on a physical device.'
          );
          return;
        }

        // isAvailableAsync only confirms the sensor hardware exists — it does NOT
        // confirm runtime permission (ACTIVITY_RECOGNITION on Android) has been
        // granted. Without this explicit request, watchStepCount can silently
        // receive zero events on Android even though everything "looks" available.
        try {
          const { status } = await Pedometer.requestPermissionsAsync();
          console.log('Pedometer permission status:', status); // TEMP: remove after testing
          if (status !== 'granted') {
            console.warn('Pedometer permission not granted:', status);
            if (isMounted) setIsPedometerAvailable(false);
            return;
          }
        } catch (permErr) {
          console.warn('Pedometer.requestPermissionsAsync failed:', permErr);
        }

        // 1. Get steps already taken today (before this screen/subscription started)
        // NOTE: getStepCountAsync(start, end) — querying a historical date range —
        // is only supported on iOS. Android's step counter sensor (TYPE_STEP_COUNTER)
        // has no API for date-range queries, so calling this on Android always
        // rejects with "Getting step count for date range is not supported on
        // Android yet". On Android we just keep whatever baseline was already
        // loaded from Supabase in loadUserData() (today's saved log) and let
        // watchStepCount add live steps on top of that.
        if (Platform.OS === 'ios') {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();

          try {
            const pastStepsResult = await Pedometer.getStepCountAsync(start, end);
            if (isMounted) {
              baseStepsRef.current = pastStepsResult.steps;
              liveDeltaRef.current = 0;
              setCurrentSteps(pastStepsResult.steps);
            }
          } catch (e) {
            console.warn('Could not fetch past step count (getStepCountAsync):', e);
          }
        }

        // 2. Subscribe to live step updates.
        // result.steps from watchStepCount is a running delta counted
        // SINCE the subscription started, not since midnight — so we add
        // it on top of the baseline we already fetched above.
        subscription = Pedometer.watchStepCount(result => {
          // console.log('watchStepCount fired:', result.steps);
          liveDeltaRef.current = result.steps;
          const total = baseStepsRef.current + liveDeltaRef.current;
          if (isMounted) setCurrentSteps(total);
        });
      } catch (err) {
        console.error('Error setting up pedometer:', err);
      }
    };

    subscribeToPedometer();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  // ---- Periodic + lifecycle sync of live steps to Supabase ----
  useEffect(() => {
    const interval = setInterval(() => {
      const total = baseStepsRef.current + liveDeltaRef.current;
      // Only push if it actually changed since the last sync (avoid spamming writes)
      if (total !== lastSyncedStepsRef.current && userIdRef.current) {
        syncStepsToSupabase(total, stepGoalRef.current);
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [syncStepsToSupabase]);

  // Also sync when the app goes to background, so steps aren't lost if the user closes the app
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        const total = baseStepsRef.current + liveDeltaRef.current;
        if (total !== lastSyncedStepsRef.current && userIdRef.current) {
          syncStepsToSupabase(total, stepGoalRef.current);
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [syncStepsToSupabase]);

  // Save Goal Handler
  const handleSaveGoal = async () => {
    const parsed = parseInt(customGoalInput.trim(), 10);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid step target (e.g. 10000).');
      return;
    }

    setSaving(true);
    setStepGoal(parsed);
    if (userId) {
      await syncStepsToSupabase(currentSteps, parsed);
    }
    setSaving(false);
    setShowGoalModal(false);
    Alert.alert('Goal Updated', `Your daily step target is now ${parsed.toLocaleString()} steps!`);
  };

  // Save Manual Steps Handler
  const handleSaveManualSteps = async () => {
    const parsed = parseInt(manualStepsInput.trim(), 10);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('Invalid Steps', 'Please enter a valid step count.');
      return;
    }

    setSaving(true);
    // Manual override: treat this as the new baseline so the live watcher
    // keeps adding on top of it correctly instead of overwriting it later.
    baseStepsRef.current = parsed;
    liveDeltaRef.current = 0;
    setCurrentSteps(parsed);
    if (userId) {
      await syncStepsToSupabase(parsed, stepGoal);
      await loadUserData();
    }
    setSaving(false);
    setShowManualModal(false);
    setManualStepsInput('');
    Alert.alert('Steps Saved', `Today's step count set to ${parsed.toLocaleString()} steps!`);
  };

  const formatDateLabel = (dateStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr.split('T')[0] === todayStr) return 'Today';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Step Counter & Calculator</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowGoalModal(true)}>
          <Ionicons name="options-outline" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryLight} />
          <Text style={styles.loadingText}>Initializing Pedometer & Sensor...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Pedometer unavailable warning (e.g. simulator, unsupported device) */}
          {isPedometerAvailable === false && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={16} color="#92400E" />
              <Text style={styles.warningText}>
                Live step tracking isn't available on this device (common on simulators/emulators).
                You can still log steps manually using "Edit Steps" below.
              </Text>
            </View>
          )}

          {/* Hero Gauge Card */}
          <View style={styles.heroCard}>

            <View style={styles.heroHeader}>
              <View style={styles.heroBadge}>
                <Ionicons name="walk" size={16} color={Colors.white} />
                <Text style={styles.heroBadgeText}>
                  {isPedometerAvailable ? 'LIVE PEDOMETER' : 'MANUAL MODE'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.manualBtn}
                onPress={() => {
                  setManualStepsInput(currentSteps.toString());
                  setShowManualModal(true);
                }}
              >
                <Ionicons name="create-outline" size={16} color={Colors.white} />
                <Text style={styles.manualBtnText}>Edit Steps</Text>
              </TouchableOpacity>
            </View>

            {/* Step Circle Counter */}
            <View style={styles.gaugeContainer}>
              <Text style={styles.stepsCountText}>{currentSteps.toLocaleString()}</Text>
              <Text style={styles.stepsLabelText}>STEPS TAKEN TODAY</Text>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>

              <View style={styles.progressLabelRow}>
                <Text style={styles.progressPercentText}>{progressPercent}% of Goal</Text>
                <Text style={styles.progressGoalText}>Target: {stepGoal.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Calculated Health Metrics Grid */}
          <Text style={styles.sectionTitle}>Calculated Health Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="navigate-outline" size={22} color="#4F46E5" />
              </View>
              <Text style={styles.metricVal}>{distanceKm} km</Text>
              <Text style={styles.metricLbl}>Distance Walked</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="flame-outline" size={22} color="#EF4444" />
              </View>
              <Text style={styles.metricVal}>{caloriesBurned} kcal</Text>
              <Text style={styles.metricLbl}>Calories Burned</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="time-outline" size={22} color="#10B981" />
              </View>
              <Text style={styles.metricVal}>{activeMinutes} mins</Text>
              <Text style={styles.metricLbl}>Active Duration</Text>
            </View>
          </View>

          {/* Step Calculator Info Box */}
          <View style={styles.calcInfoCard}>
            <Ionicons name="calculator-outline" size={22} color={Colors.primaryLight} />
            <View style={styles.calcInfoBody}>
              <Text style={styles.calcInfoTitle}>How Steps Are Calculated</Text>
              <Text style={styles.calcInfoDesc}>
                Distance is computed using standard stride dynamics (~0.76m per step). Energy expenditure is calculated based on active step intensity (~0.04 kcal/step).
              </Text>
            </View>
          </View>

          {/* Step History Section */}
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Recent Step History</Text>
            <TouchableOpacity onPress={() => setShowGoalModal(true)}>
              <Text style={styles.editGoalLink}>Edit Target</Text>
            </TouchableOpacity>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <Ionicons name="footsteps-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Previous Logs</Text>
              <Text style={styles.emptySubtitle}>Your daily step history will accumulate here as you walk!</Text>
            </View>
          ) : (
            history.map((log: StepLog, idx: number) => {
              const logPercent = Math.min(Math.round((log.steps / (log.goal || stepGoal)) * 100), 100);
              return (
                <View key={idx} style={styles.historyCard}>
                  <View style={styles.historyIconWrap}>
                    <Ionicons name="footsteps" size={20} color={Colors.primaryLight} />
                  </View>

                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>{formatDateLabel(log.date)}</Text>
                    <Text style={styles.historySub}>
                      {log.distanceKm || (log.steps * 0.000762).toFixed(2)} km · {log.caloriesBurned || Math.round(log.steps * 0.04)} kcal
                    </Text>
                  </View>

                  <View style={styles.historyStats}>
                    <Text style={styles.historySteps}>{log.steps.toLocaleString()}</Text>
                    <Text style={styles.historyGoalPercent}>{logPercent}% Goal</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Goal Adjustment Modal */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="trophy-outline" size={28} color={Colors.primaryLight} />
            </View>
            <Text style={styles.modalTitle}>Set Daily Step Target</Text>
            <Text style={styles.modalSub}>Select or enter your target daily steps:</Text>

            <View style={styles.presetRow}>
              {[5000, 8000, 10000, 12000, 15000].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.presetChip,
                    customGoalInput === val.toString() && styles.presetChipActive,
                  ]}
                  onPress={() => setCustomGoalInput(val.toString())}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      customGoalInput === val.toString() && styles.presetChipTextActive,
                    ]}
                  >
                    {val / 1000}k
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              value={customGoalInput}
              onChangeText={setCustomGoalInput}
              keyboardType="number-pad"
              placeholder="e.g. 10000"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowGoalModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveGoal} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Target</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Step Log Modal */}
      <Modal visible={showManualModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="create-outline" size={28} color={Colors.primaryLight} />
            </View>
            <Text style={styles.modalTitle}>Log / Edit Steps</Text>
            <Text style={styles.modalSub}>Enter total steps taken today:</Text>

            <TextInput
              style={styles.modalInput}
              value={manualStepsInput}
              onChangeText={setManualStepsInput}
              keyboardType="number-pad"
              placeholder="e.g. 7500"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowManualModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveManualSteps} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Update Steps</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#FEF3C7',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    elevation: 4,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  manualBtnText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  gaugeContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: 4,
  },
  stepsCountText: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
  },
  stepsLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: Radius.full,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: Radius.full,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  progressGoalText: {
    fontSize: 12,
    color: '#94A3B8',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  metricIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricLbl: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  calcInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#EEF2FF',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  calcInfoBody: {
    flex: 1,
    gap: 2,
  },
  calcInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  calcInfoDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editGoalLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  emptyHistoryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
    gap: 2,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  historySub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  historyStats: {
    alignItems: 'flex-end',
  },
  historySteps: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  historyGoalPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: Spacing.xs,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
  },
  presetChipActive: {
    backgroundColor: Colors.primaryLight,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  presetChipTextActive: {
    color: Colors.white,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginVertical: Spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
});