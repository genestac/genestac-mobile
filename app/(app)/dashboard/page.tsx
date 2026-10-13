import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  Platform,
  Animated,
  Easing,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pedometer } from "expo-sensors";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { supabase } from "@/lib/supabase";
import { fetchUserPlans, saveUserStepLog } from "@/lib/api";
import { UserPlan, WeightJourney, StepLog } from "@/lib/types";
import { initStepTracker } from "@/lib/stepTracker";
import DocumentWalletModal from "@/components/DocumentWalletModal";
import ReportAnalyzerModal from "@/components/ReportAnalyzerModal";

const screenWidth = Dimensions.get("window").width;

function AgenticAIButton({ onPress }: { onPress: () => void }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Expanding radar wave pulse
    const pulseLoop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );

    // 2. Smooth continuous orbital rotation
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 3. Gentle breathing pulse
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.07,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    rotateLoop.start();
    breatheLoop.start();

    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
      breatheLoop.stop();
    };
  }, [pulseAnim, rotateAnim, breatheAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.55],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.65, 0.35, 0],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.aiButtonOuter}>
      {/* ── 1. Expanding Radar Wave Ring ── */}
      <Animated.View
        style={[
          styles.aiPulseRing,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />

      {/* ── 2. Rotating Orbital Energy Halo ── */}
      <Animated.View
        style={[
          styles.aiOrbitRing,
          {
            transform: [{ rotate: spin }],
          },
        ]}
      />

      {/* ── 3. Interactive Breathing AI Core Orb ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.aiTouchTarget}
        accessibilityRole="button"
        accessibilityLabel="Chat with Genestac AI Doctor"
      >
        <Animated.View
          style={[
            styles.aiCoreOrb,
            {
              transform: [
                { scale: Animated.multiply(breatheAnim, pressAnim) },
              ],
            },
          ]}
        >
          <Svg width={38} height={38} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgGradient id="aiOrbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#0f8b9e" />
                <Stop offset="50%" stopColor="#12879a" />
                <Stop offset="100%" stopColor="#5cbf5a" />
              </SvgGradient>
            </Defs>
            <Circle cx={19} cy={19} r={19} fill="url(#aiOrbGrad)" />
          </Svg>

          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

export default function DashboardHomeScreen() {
  const [userName, setUserName] = useState("");
  const [stepsCount, setStepsCount] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(10000);
  const [waterLiters, setWaterLiters] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2.5);
  const [sleepHours, setSleepHours] = useState("0h");
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [caloriesGoal, setCaloriesGoal] = useState(2000);
  const [currentWeight, setCurrentWeight] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDocumentWalletModal, setShowDocumentWalletModal] = useState(false);
  const [showReportAnalyzerModal, setShowReportAnalyzerModal] = useState(false);

  // Live Pedometer & Hardware Tracking Refs
  const baseStepsRef = useRef(0);
  const liveDeltaRef = useRef(0);
  const stepGoalRef = useRef(stepsGoal);
  const userIdRef = useRef<string | null>(null);
  const lastSyncedStepsRef = useRef(0);

  const syncStepsToSupabase = useCallback(
    async (count: number, goalVal: number) => {
      const uid = userIdRef.current;
      if (!uid || count <= 0) return;

      const now = new Date();
      const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const cals = Math.round(count * 0.045);
      const todayLog: StepLog = {
        date: localTodayStr,
        steps: count,
        goal: goalVal,
        caloriesBurned: cals,
      };

      try {
        await saveUserStepLog(uid, todayLog, goalVal);
        lastSyncedStepsRef.current = count;
      } catch (err) {
        console.warn("[Dashboard] Error syncing steps to Supabase:", err);
      }
    },
    []
  );

  // 1. Live hardware step tracking subscription
  useEffect(() => {
    let isMounted = true;
    let subscription: { remove: () => void } | null = null;

    const setupPedometer = async () => {
      try {
        await initStepTracker();
        const isAvailable = await Pedometer.isAvailableAsync();
        if (!isMounted || !isAvailable) return;

        // Live foreground step counter — result.steps is delta since subscription start.
        // We add it on top of baseStepsRef (set from DB in loadData) so we never
        // show the raw hardware cumulative total as today's count.
        subscription = Pedometer.watchStepCount((result) => {
          if (!isMounted) return;
          liveDeltaRef.current = result.steps;
          const total = baseStepsRef.current + liveDeltaRef.current;
          setStepsCount(total);
          setCaloriesBurned(Math.round(total * 0.045));
        });
      } catch (err) {
        console.warn("[Dashboard] Pedometer setup error:", err);
      }
    };

    setupPedometer();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  // 2. Periodic sync of new steps to Supabase
  useEffect(() => {
    const interval = setInterval(() => {
      const total = baseStepsRef.current + liveDeltaRef.current;
      if (
        total > 0 &&
        total !== lastSyncedStepsRef.current &&
        userIdRef.current
      ) {
        syncStepsToSupabase(total, stepGoalRef.current);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [syncStepsToSupabase]);

  // 3. When returning from background, Pedometer.watchStepCount automatically
  // resumes and result.steps continues accumulating — no manual catch-up needed.
  // We only sync the current total to Supabase when the app becomes active.
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active" && userIdRef.current) {
          const total = baseStepsRef.current + liveDeltaRef.current;
          if (total > 0 && total !== lastSyncedStepsRef.current) {
            syncStepsToSupabase(total, stepGoalRef.current);
          }
        }
      }
    );

    return () => sub.remove();
  }, [syncStepsToSupabase]);

  const loadData = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      userIdRef.current = uid;

      const { data: userData } = await supabase
        .from("users")
        .select("name, weight_loss_journey, user_metadata")
        .eq("id", uid)
        .maybeSingle();

      const name =
        userData?.name?.trim() ||
        session.user.user_metadata?.full_name?.trim() ||
        session.user.user_metadata?.name?.trim() ||
        (session.user.email ? session.user.email.split("@")[0] : "");
      setUserName(name);

      const journey = (userData?.weight_loss_journey as WeightJourney) || {};
      const plan: UserPlan | null = await fetchUserPlans(uid);

      const now = new Date();
      const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const isoTodayStr = now.toISOString().split("T")[0];

      // Water
      const waterHistory = plan?.water_history || journey?.waterLogs || [];
      const todayWater = waterHistory.find(
        (w) =>
          w.date?.startsWith(localTodayStr) || w.date?.startsWith(isoTodayStr)
      );
      setWaterLiters(todayWater?.amount ?? 0);
      if (journey?.waterGoal) setWaterGoal(journey.waterGoal);

      // Sleep
      const sleepHistory = plan?.sleep_history || journey?.sleepLogs || [];
      const todaySleep = sleepHistory.find(
        (s) =>
          s.date?.startsWith(localTodayStr) || s.date?.startsWith(isoTodayStr)
      );
      setSleepHours(todaySleep?.hours ? `${todaySleep.hours}h` : "0h");

      // Steps
      const stepHistory = plan?.steps_history || journey?.stepLogs || [];
      const todayStep = stepHistory.find(
        (s) =>
          s.date?.startsWith(localTodayStr) || s.date?.startsWith(isoTodayStr)
      );
      const dbSteps = todayStep?.steps ?? 0;
      const sGoal = todayStep?.goal || journey?.stepGoal || 10000;
      setStepsGoal(sGoal);
      stepGoalRef.current = sGoal;

      // Use DB value as the authoritative baseline. The live pedometer watcher
      // (watchStepCount) will add a clean delta on top once it fires.
      // We deliberately avoid getTodayStepsCount() here because on Android it
      // can return the raw cumulative hardware sensor total (e.g. 52,895)
      // instead of today's actual steps.
      if (dbSteps > baseStepsRef.current) {
        baseStepsRef.current = dbSteps;
        liveDeltaRef.current = 0;
      }
      const effectiveSteps = baseStepsRef.current + liveDeltaRef.current;
      setStepsCount(effectiveSteps);

      // Calories
      const cals =
        todayStep?.caloriesBurned || Math.round(effectiveSteps * 0.045);
      const meals = (journey?.meals || []).filter(
        (m) =>
          m.date?.startsWith(localTodayStr) || m.date?.startsWith(isoTodayStr)
      );
      const mealCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      setCaloriesBurned(cals > 0 ? cals : mealCals);

      // Weight
      const weightHistory = (journey?.history || []).filter(
        (e) => typeof e?.weight === "number" && e.weight > 0
      );
      if (weightHistory.length > 0) {
        const latest = weightHistory[weightHistory.length - 1].weight;
        setCurrentWeight(`${latest} kg`);
      } else {
        setCurrentWeight(null);
      }
    } catch {
      // Keep defaults
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Time-of-day greeting and dynamic artwork
  const getTimePeriod = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "morning";
    if (hr < 17) return "afternoon";
    return "evening";
  };

  const getGreeting = () => {
    const period = getTimePeriod();
    if (period === "morning") return "Good Morning";
    if (period === "afternoon") return "Good Afternoon";
    return "Good Evening";
  };

  const getGreetingSubtitle = () => {
    const period = getTimePeriod();
    if (period === "morning")
      return "Small steps every day lead to big changes.";
    if (period === "afternoon")
      return "Keep the momentum going, you are doing great.";
    return "Unwind and celebrate today's healthy choices.";
  };

  const getGreetingImage = () => {
    const period = getTimePeriod();
    if (period === "morning")
      return require("@/assets/images/greetings/morning.jpg");
    if (period === "afternoon")
      return require("@/assets/images/greetings/afternoon.jpg");
    return require("@/assets/images/greetings/evening.jpg");
  };

  // Circular Step Progress calculations
  const ringSize = 144;
  const ringStroke = 7;
  const ringCenter = ringSize / 2;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const stepProgress = Math.min(1, Math.max(0, stepsCount / (stepsGoal || 10000)));
  const stepDashoffset = ringCircumference - (ringCircumference * stepProgress);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* ── TOP HEADER (Brand + Notification Bell) ── */}
      <View style={styles.topHeader}>
        <View style={styles.brandContainer}>
          <View>
            <Image
              source={require("@/assets/images/brand/logo.png")}
              style={styles.brandLogoImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Svg height={22} width={96} viewBox="0 0 96 22">
              <Defs>
                <SvgGradient id="genestacBrandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#12879a" />
                  <Stop offset="100%" stopColor="#5cbf5a" />
                </SvgGradient>
              </Defs>
              <SvgText
                fill="url(#genestacBrandGrad)"
                fontSize="18"
                fontWeight="800"
                letterSpacing="-0.3"
                x="0"
                y="20"
              >
                Genestac
              </SvgText>
            </Svg>
            <Text style={styles.brandTagline}>
              Better Health · Brighter You
            </Text>
          </View>
        </View>

        <AgenticAIButton
          onPress={() => router.push("/(app)/ai-doctor-chat" as any)}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0A8554"
          />
        }
      >
        {/* ── GREETING HERO SECTION ── */}
        <View style={styles.greetingHeroCard}>
          {/* Atmospheric Artwork with Soft Blurring Boundaries */}
          <Image
            source={getGreetingImage()}
            style={styles.greetingHeroBgImage}
            resizeMode="cover"
          />

          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingTimeText}>{getGreeting()},</Text>
            <Text style={styles.greetingNameText}>
              {userName.split(" ")[0]} 👋
            </Text>
            <Text style={styles.greetingSubtitle}>{getGreetingSubtitle()}</Text>
          </View>
        </View>

        {/* ── HERO CIRCULAR STEPS GAUGE CARD ── */}
        <TouchableOpacity
          style={styles.stepsGaugeCard}
          activeOpacity={0.9}
          onPress={() => router.push("/(app)/dashboard/track?tab=steps" as any)}
        >
          <View style={styles.circularArcContainer}>
            <Svg width={ringSize} height={ringSize}>
              {/* Background Track Circle (visible when steps = 0) */}
              <Circle
                cx={ringCenter}
                cy={ringCenter}
                r={ringRadius}
                stroke="#E2E8F0"
                strokeWidth={ringStroke}
                fill="transparent"
              />
              {/* Active Green Progress Arc (grows proportionally with steps) */}
              {stepProgress > 0 && (
                <Circle
                  cx={ringCenter}
                  cy={ringCenter}
                  r={ringRadius}
                  stroke="#0A8554"
                  strokeWidth={ringStroke}
                  strokeDasharray={`${ringCircumference}`}
                  strokeDashoffset={stepDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  origin={`${ringCenter}, ${ringCenter}`}
                  rotation="-90"
                />
              )}
            </Svg>

            <View style={styles.circleInnerContent}>
              <View style={styles.walkerIconBadge}>
                <Ionicons name="walk" size={20} color="#0A8554" />
              </View>
              <Text style={styles.stepsCardLabel}>Steps</Text>
              <Text style={styles.stepsCardBigNum}>
                {stepsCount.toLocaleString()}
              </Text>
              <Text style={styles.stepsCardGoalText}>
                / {stepsGoal.toLocaleString()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── 3 QUICK VITALS ROW (Water, Sleep, Calories) ── */}
        <View style={styles.vitalsRow}>
          {/* 1. Water */}
          <TouchableOpacity
            style={[
              styles.vitalCard,
              { backgroundColor: "#F0F9FF", borderColor: "#E0F2FE" },
            ]}
            activeOpacity={0.8}
            onPress={() =>
              router.push("/(app)/dashboard/track?tab=weight" as any)
            }
          >
            <View
              style={[
                styles.vitalIconBg,
                {
                  backgroundColor: "#F0F9FF",
                  borderWidth: 1.5,
                  borderColor: "#38BDF8",
                },
              ]}
            >
              <Ionicons name="water" size={18} color="#0284C7" />
            </View>
            <Text style={styles.vitalLabel}>Water</Text>
            <Text style={styles.vitalValue}>{waterLiters} L</Text>
            <Text style={styles.vitalTarget}>/ {waterGoal} L</Text>
          </TouchableOpacity>

          {/* 2. Sleep */}
          <TouchableOpacity
            style={[
              styles.vitalCard,
              { backgroundColor: "#FAF5FF", borderColor: "#F3E8FF" },
            ]}
            activeOpacity={0.8}
            onPress={() =>
              router.push("/(app)/dashboard/track?tab=sleep" as any)
            }
          >
            <View
              style={[
                styles.vitalIconBg,
                {
                  backgroundColor: "#FAF5FF",
                  borderWidth: 1.5,
                  borderColor: "#A78BFA",
                },
              ]}
            >
              <Ionicons name="moon" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.vitalLabel}>Sleep</Text>
            <Text style={styles.vitalValue}>{sleepHours}</Text>
            <Text style={styles.vitalTarget}>/ 8h</Text>
          </TouchableOpacity>

          {/* 3. Calories */}
          <TouchableOpacity
            style={[
              styles.vitalCard,
              { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" },
            ]}
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/dashboard/plan" as any)}
          >
            <View
              style={[
                styles.vitalIconBg,
                {
                  backgroundColor: "#FFF7ED",
                  borderWidth: 1.5,
                  borderColor: "#FB923C",
                },
              ]}
            >
              <Ionicons name="flame" size={18} color="#EA580C" />
            </View>
            <Text style={styles.vitalLabel}>Calories</Text>
            <Text style={styles.vitalValue}>
              {caloriesBurned.toLocaleString()}
            </Text>
            <Text style={styles.vitalTarget}>
              / {caloriesGoal.toLocaleString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── WEIGHT MANAGEMENT PROMO CARD ── */}
        <TouchableOpacity
          style={styles.weightActionCard}
          activeOpacity={0.85}
          onPress={() =>
            router.push("/(app)/dashboard/track?tab=weight" as any)
          }
        >
          <View style={styles.weightScaleIconBg}>
            <Ionicons name="scale-outline" size={24} color="#0A8554" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.weightActionTitle}>Weight Management</Text>
            <Text style={styles.weightActionSub}>
              {currentWeight
                ? `Current: ${currentWeight} · Track progress & reach goals`
                : "Log your weight, track progress and reach your goals."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* ── DOCUMENT WALLET ACTION CARD ── */}
        <TouchableOpacity
          style={styles.docWalletActionCard}
          activeOpacity={0.85}
          onPress={() => setShowDocumentWalletModal(true)}
        >
          <View style={styles.docWalletIconBg}>
            <Ionicons name="wallet-outline" size={24} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.weightActionTitle}>Document Wallet</Text>
              <View style={styles.secureBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#4F46E5" />
                <Text style={styles.secureBadgeText}>SECURE</Text>
              </View>
            </View>
            <Text style={styles.weightActionSub}>
              Store & manage prescriptions, lab tests, and scans
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* ── AI REPORT ANALYZER ACTION CARD ── */}
        <TouchableOpacity
          style={styles.aiAnalyzerActionCard}
          activeOpacity={0.85}
          onPress={() => setShowReportAnalyzerModal(true)}
        >
          <View style={styles.aiAnalyzerIconBg}>
            <Ionicons name="sparkles" size={22} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.weightActionTitle}>AI Report Analyzer</Text>
              <View style={styles.aiScanBadge}>
                <Ionicons name="flash" size={10} color="#7C3AED" />
                <Text style={styles.aiScanBadgeText}>AI SCAN</Text>
              </View>
            </View>
            <Text style={styles.weightActionSub}>
              Instant biomarker insights & smart health analysis
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </ScrollView>

      {/* ── MODALS ── */}
      <DocumentWalletModal
        visible={showDocumentWalletModal}
        onClose={() => setShowDocumentWalletModal(false)}
      />

      <ReportAnalyzerModal
        visible={showReportAnalyzerModal}
        onClose={() => setShowReportAnalyzerModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandLogoImage: {
    width: 34,
    height: 34,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0A8554",
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0E8F6E",
  },
  aiButtonOuter: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  aiPulseRing: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#12879a",
    backgroundColor: "rgba(18, 135, 154, 0.12)",
  },
  aiOrbitRing: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.2,
    borderColor: "rgba(92, 191, 90, 0.55)",
    borderStyle: "dashed",
  },
  aiTouchTarget: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  aiCoreOrb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0E7C86",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
    overflow: "hidden",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
    paddingBottom: 40,
  },

  /* Greeting Hero Card */
  greetingHeroCard: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 140,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  greetingHeroBgImage: {
    position: "absolute",
    right: -10,
    top: -5,
    width: 210,
    height: 160,
  },
  greetingTextContainer: {
    maxWidth: "60%",
    zIndex: 2,
    justifyContent: "center",
    paddingLeft: 4,
  },
  greetingTimeText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  greetingNameText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 6,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  /* Steps Circular Gauge Card */
  stepsGaugeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  circularArcContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: 144,
    height: 144,
  },
  circleInnerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  walkerIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  stepsCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  stepsCardBigNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  stepsCardGoalText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },

  /* 3 Vitals Row */
  vitalsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  vitalCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: 2,
  },
  vitalIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  vitalLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  vitalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  vitalTarget: {
    fontSize: 10,
    color: "#94A3B8",
  },

  /* Weight Management Action Card */
  weightActionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  weightScaleIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  weightActionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  weightActionSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },

  /* Document Wallet Action Card */
  docWalletActionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    gap: 12,
  },
  docWalletIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  secureBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.3,
  },

  /* AI Report Analyzer Action Card */
  aiAnalyzerActionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    gap: 12,
  },
  aiAnalyzerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  aiScanBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  aiScanBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#7C3AED",
    letterSpacing: 0.3,
  },

  /* Section 2: Your Health Journey */
  journeySection: {
    marginTop: 8,
    gap: 12,
  },
  journeyHeading: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },
  journeySubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: -8,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  journeyCard: {
    width: "48%",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    position: "relative",
  },
  journeyIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  journeyCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  journeyCardDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
  journeyArrowCircle: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  progressBottomBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 12,
    marginTop: 4,
  },
  progressIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  progressBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  progressBannerSub: {
    fontSize: 12,
    color: "#047857",
  },
});
