import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Fonts, Spacing, Radius } from "@/constants/colors";
import {
  WeightJourney,
  WeightLog,
  MealLog,
  WaterLog,
  SleepLog,
  MeasurementLog,
  HabitLog,
} from "@/lib/types";
import {
  recommendMeals,
  recommendSleep,
  uploadToCloudinary,
  RecipeRecommendation,
  SleepRecommendation,
} from "@/lib/api";
import { LineChart } from "react-native-chart-kit";
import { GaugeMeter } from "@/components/dashboard/GaugeMeter";
import { CurrentStatsCards } from "@/components/dashboard/CurrentStatsCards";
import { WeightLossChart } from "@/components/dashboard/WeightLossChart";
import { TransformationGallery } from "@/components/dashboard/TransformationGallery";
import { TopNavbar } from "@/components/dashboard/TopNavbar";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { WaterTrackerWidget } from "@/components/dashboard/WaterTrackerWidget";
import { SleepTrackerWidget } from "@/components/dashboard/SleepTrackerWidget";
import { HealthyRecipesWidget } from "@/components/dashboard/HealthyRecipesWidget";
import { BodyMeasurementsWidget } from "@/components/dashboard/BodyMeasurementsWidget";
import { HabitsChecklistWidget } from "@/components/dashboard/HabitsChecklistWidget";
import { HistoryModal, HistoryType } from "@/components/dashboard/HistoryModal";
import { AchievementsSection } from "@/components/dashboard/AchievementsSection";

const DAYS = ["7D", "30D", "90D", "All"];

const SAMPLE_TRANSFORMATION_IMAGES = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
];

const groupMealsByDate = (meals?: MealLog[]) => {
  if (!meals || meals.length === 0) return [];
  const groups: Record<
    string,
    {
      dateStr: string;
      totalCals: number;
      items: {
        type: string;
        time: string;
        cals: number;
        desc: string;
        feedback: string;
      }[];
    }
  > = {};

  meals.forEach((m) => {
    const dStr = formatDateShort(m.date);
    if (!groups[dStr]) {
      groups[dStr] = {
        dateStr: dStr,
        totalCals: 0,
        items: [],
      };
    }
    groups[dStr].totalCals += m.calories || 0;
    groups[dStr].items.push({
      type: m.mealType || "Meal",
      time: "Logged",
      cals: m.calories || 0,
      desc: m.description,
      feedback: m.feedback || "Balanced choice for your weight loss goals.",
    });
  });

  return Object.values(groups);
};

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return "—";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [user, setUser] = useState<any>(null);
  const [journey, setJourney] = useState<WeightJourney>({
    history: [],
    targetGoal: 70,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState("All");

  // Backend API Recommendations State
  const [recipes, setRecipes] = useState<RecipeRecommendation[]>([]);
  const [sleepAdvice, setSleepAdvice] = useState<SleepRecommendation>({
    targetHours: 7.5,
    tip: "Establish a relaxing bedtime routine to signal your body that it is time for deep recovery.",
  });

  // History Modal state
  const [activeHistoryType, setActiveHistoryType] = useState<HistoryType | null>(null);

  // Log weight modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Permission to access photo library is required!");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setUploadingImage(true);
        try {
          const cloudUrl = await uploadToCloudinary(selectedUri);
          setImageInput(cloudUrl);
        } catch (err: any) {
          Alert.alert("Upload Error", err.message || "Failed to upload image to Cloudinary.");
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (err: any) {
      console.error("Error picking image:", err);
      setUploadingImage(false);
      Alert.alert("Upload Error", err.message || "Failed to select image.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Permission to access camera is required!");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setUploadingImage(true);
        try {
          const cloudUrl = await uploadToCloudinary(selectedUri);
          setImageInput(cloudUrl);
        } catch (err: any) {
          Alert.alert("Upload Error", err.message || "Failed to upload photo to Cloudinary.");
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (err: any) {
      console.error("Error taking photo:", err);
      setUploadingImage(false);
      Alert.alert("Upload Error", err.message || "Failed to capture photo.");
    }
  };

  // Water tracker local state
  const [waterAmount, setWaterAmount] = useState(0.0);

  // Sleep tracker state
  const [sleepHours, setSleepHours] = useState(7.5);

  // Body measurements state
  const [waist, setWaist] = useState("34");
  const [hips, setHips] = useState("40");
  const [chest, setChest] = useState("38");
  const [savingMeasurements, setSavingMeasurements] = useState(false);

  // Habits state
  const [habits, setHabits] = useState<Record<string, boolean>>({
    vitamins: false,
    walk: false,
    noSugar: false,
  });

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      const { data } = await supabase
        .from("users")
        .select("weight_loss_journey")
        .eq("id", session.user.id)
        .maybeSingle();
      if (data?.weight_loss_journey) {
        const j = data.weight_loss_journey as WeightJourney;
        const historyList = Array.isArray(j.history) ? j.history : [];
        const sortedHistory = [...historyList].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        setJourney({
          ...j,
          history: sortedHistory,
          targetGoal: j.targetGoal ?? 70,
        });
        if (j.targetGoal) setTargetInput(String(j.targetGoal));

        // Sync water today
        const today = new Date().toISOString().split("T")[0];
        const todayWater = j.waterLogs?.find((w) => w.date === today);
        setWaterAmount(todayWater?.amount ?? 0);

        // Sync sleep today
        const todaySleep = j.sleepLogs?.find((s) => s.date === today);
        if (todaySleep) setSleepHours(todaySleep.hours);

        // Sync latest measurements
        if (j.measurements && j.measurements.length > 0) {
          const latestM = j.measurements[j.measurements.length - 1];
          if (latestM.waist) setWaist(String(latestM.waist));
          if (latestM.hips) setHips(String(latestM.hips));
          if (latestM.chest) setChest(String(latestM.chest));
        }

        // Sync today's habits
        const todayHabits = j.habitLogs?.find((h) => h.date === today);
        if (todayHabits?.habits) {
          setHabits(todayHabits.habits);
        }

        recommendMeals(j.meals || []).then((res) => setRecipes(res || []));
        recommendSleep(j.sleepLogs || []).then(setSleepAdvice);
      } else {
        recommendMeals([]).then((res) => setRecipes(res || []));
        recommendSleep([]).then(setSleepAdvice);
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getFilteredHistory = () => {
    const h = journey.history || [];
    if (range === "All") return h;
    const days = range === "7D" ? 7 : range === "30D" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const res = h.filter((e) => new Date(e.date) >= cutoff);
    if (res.length === 0) {
      const takeCount = range === "7D" ? 3 : range === "30D" ? 7 : 10;
      return h.slice(-takeCount);
    }
    return res;
  };

  const filtered = getFilteredHistory();
  const first = journey.history[0]?.weight ?? 85;
  const last = journey.history[journey.history.length - 1]?.weight ?? 78.5;
  const lost =
    first > 0 && last > 0 ? parseFloat((first - last).toFixed(1)) : 6.5;
  const current = last || 78.5;
  const target = journey.targetGoal ?? 70;
  const startWeight = first || 85;
  const toGo =
    target > 0 && current > 0
      ? Math.max(0, parseFloat((current - target).toFixed(1)))
      : 8.5;

  const totalGoalDelta = startWeight > target ? startWeight - target : 1;
  const currentProgressDelta =
    startWeight > current ? startWeight - current : 0;
  const progressPercent =
    Math.min(
      100,
      Math.max(0, Math.round((currentProgressDelta / totalGoalDelta) * 100)),
    ) || 43.3;

  const streak = (() => {
    if (!journey.history.length) return 0;
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      if (journey.history.find((e) => e.date === ds)) s++;
      else if (i > 0) break;
    }
    return s;
  })();

  // Last Sync Date from DB
  const lastSyncDate =
    journey.history && journey.history.length > 0
      ? formatDateShort(journey.history[journey.history.length - 1].date)
      : "—";

  // Dynamic calculation for Weekly Comparison: This Week vs Last Week
  const getWeightLossInWindow = (startDaysAgo: number, endDaysAgo: number) => {
    const h = journey.history || [];
    if (h.length === 0) return 0;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - startDaysAgo);
    const endDate = new Date(now);
    endDate.setDate(now.getDate() - endDaysAgo);

    const windowLogs = h.filter((e) => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    });

    if (windowLogs.length >= 2) {
      return parseFloat(
        (windowLogs[0].weight - windowLogs[windowLogs.length - 1].weight).toFixed(1)
      );
    }

    const endLog = [...h].reverse().find((e) => new Date(e.date) <= endDate) || h[h.length - 1];
    const startLog = [...h].reverse().find((e) => new Date(e.date) <= startDate) || h[0];
    if (startLog && endLog && startLog.date !== endLog.date) {
      return parseFloat((startLog.weight - endLog.weight).toFixed(1));
    }
    return 0;
  };

  const thisWeekLoss = getWeightLossInWindow(7, 0);
  const lastWeekLoss = getWeightLossInWindow(14, 7);

  // Dynamic calculation for Average Weekly Loss
  const avgWeeklyLoss = (() => {
    const h = journey.history || [];
    if (h.length < 2) return 0.7;
    const firstTime = new Date(h[0].date).getTime();
    const lastTime = new Date(h[h.length - 1].date).getTime();
    const diffDays = Math.max(1, Math.round((lastTime - firstTime) / (1000 * 60 * 60 * 24)));
    const diffWeeks = Math.max(1, diffDays / 7);
    const totalNetLost = h[0].weight - h[h.length - 1].weight;
    if (totalNetLost <= 0) return 0;
    return parseFloat((totalNetLost / diffWeeks).toFixed(1));
  })();

  // Dynamic Achievements Badges
  const milestoneTargets = [3, 5, 10, 15, 20, 25, 30, 40, 50];
  const unlockedBadges = milestoneTargets.filter((m) => lost >= m);
  const nextMilestone =
    milestoneTargets.find((m) => lost < m) ??
    (unlockedBadges.length > 0 ? unlockedBadges[unlockedBadges.length - 1] + 5 : 3);
  const nextToGo = Math.max(
    0,
    parseFloat((nextMilestone - Math.max(0, lost)).toFixed(1))
  );

  const chartData = filtered;

  const mainChartWidth = isDesktop
    ? 620
    : Math.max(width - 48, chartData.length * 56);

  // WEIGHT CHART CHANGE: derive bounds from the actual visible data instead of
  // injecting invisible datasets (that trick is what was causing the full-area
  // shadow fill once withShadow was enabled). These are now only used to pick
  // a sensible number of gridline segments.
  const chartWeights = chartData.length
    ? chartData.map((e) => e.weight)
    : [target, startWeight];
  const dataMin = Math.min(...chartWeights, target);
  const dataMax = Math.max(...chartWeights, startWeight);
  const minWeightBound = target-1;
  const maxWeightBound = startWeight+3;
  const chartSegments = 5;

  const handleSaveWeight = async () => {
    if (!weightInput) return;
    setSaving(true);
    const todayStr = new Date().toISOString().split("T")[0];
    let newHistory = [...(journey.history || [])];
    const idx = newHistory.findIndex((e) => e.date === todayStr);

    let uploadedUrl: string | undefined = undefined;
    if (imageInput && imageInput.trim()) {
      try {
        uploadedUrl = await uploadToCloudinary(imageInput.trim());
      } catch (err: any) {
        setSaving(false);
        Alert.alert("Upload Error", err.message || "Could not upload image to Cloudinary.");
        return;
      }
    }

    const entry: WeightLog = {
      date: todayStr,
      weight: parseFloat(weightInput),
      note: noteInput || undefined,
      image_url: uploadedUrl,
    };
    if (idx >= 0) newHistory[idx] = entry;
    else newHistory.push(entry);
    newHistory.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const newJourney: WeightJourney = {
      ...journey,
      history: newHistory,
      targetGoal: targetInput ? parseFloat(targetInput) : journey.targetGoal,
    };
    if (user) {
      await supabase
        .from("users")
        .update({ weight_loss_journey: newJourney })
        .eq("id", user.id);
    }
    setSaving(false);
    setJourney(newJourney);
    setWeightInput("");
    setNoteInput("");
    setImageInput("");
    setShowLogModal(false);
  };

  const handleWaterAdd = async (amountToAdd: number) => {
    const today = new Date().toISOString().split("T")[0];
    const newTotal = parseFloat((waterAmount + amountToAdd).toFixed(2));
    setWaterAmount(newTotal);
    const waterLogs = [...(journey.waterLogs || [])];
    const idx = waterLogs.findIndex((w) => w.date === today);
    if (idx >= 0) waterLogs[idx].amount = newTotal;
    else waterLogs.push({ date: today, amount: newTotal });
    const updatedJourney = { ...journey, waterLogs };
    setJourney(updatedJourney);
    if (user)
      await supabase
        .from("users")
        .update({ weight_loss_journey: updatedJourney })
        .eq("id", user.id);
  };

  const handleWaterReset = async () => {
    const today = new Date().toISOString().split("T")[0];
    setWaterAmount(0);
    const waterLogs = [...(journey.waterLogs || [])];
    const idx = waterLogs.findIndex((w) => w.date === today);
    if (idx >= 0) waterLogs[idx].amount = 0;
    const updatedJourney = { ...journey, waterLogs };
    setJourney(updatedJourney);
    if (user)
      await supabase
        .from("users")
        .update({ weight_loss_journey: updatedJourney })
        .eq("id", user.id);
  };

  const handleSleepSave = async () => {
    const today = new Date().toISOString().split("T")[0];
    const sleepLogs = [...(journey.sleepLogs || [])];
    const idx = sleepLogs.findIndex((s) => s.date === today);
    if (idx >= 0) sleepLogs[idx].hours = sleepHours;
    else sleepLogs.push({ date: today, hours: sleepHours });
    const updatedJourney = { ...journey, sleepLogs };
    setJourney(updatedJourney);
    if (user)
      await supabase
        .from("users")
        .update({ weight_loss_journey: updatedJourney })
        .eq("id", user.id);
    Alert.alert("Saved", `Logged ${sleepHours} hrs of sleep.`);
  };

  const handleSaveMeasurements = async () => {
    setSavingMeasurements(true);
    const today = new Date().toISOString().split("T")[0];
    const measurements = [...(journey.measurements || [])];
    const idx = measurements.findIndex((m) => m.date === today);
    const entry: MeasurementLog = {
      date: today,
      waist: waist ? parseFloat(waist) : undefined,
      hips: hips ? parseFloat(hips) : undefined,
      chest: chest ? parseFloat(chest) : undefined,
    };
    if (idx >= 0) measurements[idx] = entry;
    else measurements.push(entry);
    const updatedJourney = { ...journey, measurements };
    setSavingMeasurements(false);
    setJourney(updatedJourney);
    if (user)
      await supabase
        .from("users")
        .update({ weight_loss_journey: updatedJourney })
        .eq("id", user.id);
    Alert.alert("Saved", "Body measurements saved successfully.");
  };

  const handleHabitToggle = async (key: string) => {
    const newHabits = { ...habits, [key]: !habits[key] };
    setHabits(newHabits);
    const today = new Date().toISOString().split("T")[0];
    const habitLogs = [...(journey.habitLogs || [])];
    const idx = habitLogs.findIndex((h) => h.date === today);
    if (idx >= 0) habitLogs[idx].habits = newHabits;
    else habitLogs.push({ date: today, habits: newHabits });
    const updatedJourney = { ...journey, habitLogs };
    setJourney(updatedJourney);
    if (user)
      await supabase
        .from("users")
        .update({ weight_loss_journey: updatedJourney })
        .eq("id", user.id);
  };

  const userName = user?.user_metadata?.full_name ?? "Joe";
  const userEmail = user?.email ?? "segyvesevic@gmail.com";
  const todayStr = new Date().toISOString().split("T")[0];
  const loggedToday = journey.history.some((e) => e.date === todayStr);

  if (loading)
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Colors.primaryLight} size="large" />
      </SafeAreaView>
    );

  return (
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar */}
      <TopNavbar userName={userName} />

      {/* Main Body Layout */}
      <View style={styles.bodyLayout}>
        {/* Left Sidebar */}
        {isDesktop && (
          <SidebarNav
            userName={userName}
            userEmail={userEmail}
            onSignOut={() => supabase.auth.signOut()}
          />
        )}

        {/* Main Workspace Content */}
        <ScrollView
          style={styles.mainContentScroll}
          contentContainerStyle={styles.mainContentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={Colors.primaryLight}
            />
          }
        >
          {/* Greeting Banner */}
          <View style={styles.greetingHeader}>
            <Text style={styles.greetingTitle}>
              <Text style={{ fontSize: 18 }}>👋</Text> Hey {userName}, You've
              missed a day — let's get back on track today.
            </Text>
          </View>

          {/* Top 4 Metrics Chips Row */}
          <View style={styles.metricsGridRow}>
            <View style={styles.metricChipCard}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="calendar-outline" size={16} color="#64748B" />
              </View>
              <View>
                <Text style={styles.chipLabelText}>Last Sync</Text>
                <Text style={styles.chipValueText}>{lastSyncDate}</Text>
              </View>
            </View>

            <View style={styles.metricChipCard}>
              <View
                style={[styles.metricIconWrap, { backgroundColor: "#ECFDF5" }]}
              >
                <Ionicons name="pie-chart-outline" size={16} color="#059669" />
              </View>
              <View>
                <Text style={styles.chipLabelText}>Goal Progress</Text>
                <Text style={styles.chipValueText}>{progressPercent}%</Text>
              </View>
            </View>

            <View style={styles.metricChipCard}>
              <View
                style={[styles.metricIconWrap, { backgroundColor: "#EFF6FF" }]}
              >
                <Ionicons name="trending-down" size={16} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.chipLabelText}>Total Lost</Text>
                <Text style={styles.chipValueText}>
                  {lost > 0 ? `${lost} kg` : "0.0 kg"}
                </Text>
              </View>
            </View>

            <View style={styles.metricChipCard}>
              <View
                style={[styles.metricIconWrap, { backgroundColor: "#FFF7ED" }]}
              >
                <Ionicons name="flame-outline" size={16} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.chipLabelText}>Current Streak</Text>
                <Text style={styles.chipValueText}>
                  {streak ? `${streak} days` : "—"}
                </Text>
              </View>
            </View>
          </View>

          {/* Weekly Performance Achievement Card */}
          <View style={styles.weeklyAchievementCard}>
            {/* Header Row */}
            <View style={styles.weeklyHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.weeklyHeaderIconWrap}>
                  <Ionicons name="trending-down" size={16} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.weeklyHeaderTitle}>Weekly Performance</Text>
                  <Text style={styles.weeklyHeaderSub}>This Week vs Last Week</Text>
                </View>
              </View>

              <View
                style={[
                  styles.weeklyPaceChip,
                  thisWeekLoss >= lastWeekLoss
                    ? { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }
                    : { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" },
                ]}
              >
                <Text
                  style={[
                    styles.weeklyPaceChipText,
                    thisWeekLoss >= lastWeekLoss
                      ? { color: "#047857" }
                      : { color: "#C2410C" },
                  ]}
                >
                  {thisWeekLoss >= lastWeekLoss ? "🔥 Faster Pace" : "⚡ Keep Pushing"}
                </Text>
              </View>
            </View>

            {/* Comparison Badges Row */}
            <View style={styles.weeklyStatsRow}>
              {/* This Week Badge */}
              <View style={[styles.weeklyStatMiniBox, styles.weeklyStatBoxActive]}>
                <Text style={styles.weeklyStatLabel}>THIS WEEK</Text>
                <Text style={styles.weeklyStatValue}>
                  {thisWeekLoss >= 0
                    ? `${thisWeekLoss.toFixed(1)} kg`
                    : `+${Math.abs(thisWeekLoss).toFixed(1)} kg`}
                </Text>
                <Text style={styles.weeklyStatSub}>
                  {thisWeekLoss >= 0 ? "Lost" : "Gained"}
                </Text>
              </View>

              {/* VS Circle Badge */}
              <View style={styles.vsBadgeCircle}>
                <Text style={styles.vsBadgeText}>VS</Text>
              </View>

              {/* Last Week Badge */}
              <View style={styles.weeklyStatMiniBox}>
                <Text style={styles.weeklyStatLabel}>LAST WEEK</Text>
                <Text style={styles.weeklyStatValue}>
                  {lastWeekLoss >= 0
                    ? `${lastWeekLoss.toFixed(1)} kg`
                    : `+${Math.abs(lastWeekLoss).toFixed(1)} kg`}
                </Text>
                <Text style={styles.weeklyStatSub}>
                  {lastWeekLoss >= 0 ? "Lost" : "Gained"}
                </Text>
              </View>
            </View>

            {/* Motivational Victory Summary Banner */}
            <View
              style={[
                styles.weeklySummaryBanner,
                thisWeekLoss >= lastWeekLoss
                  ? { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7" }
                  : { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
              ]}
            >
              <Ionicons
                name={thisWeekLoss >= lastWeekLoss ? "trophy" : "sparkles"}
                size={15}
                color={thisWeekLoss >= lastWeekLoss ? "#059669" : "#64748B"}
              />
              <Text
                style={[
                  styles.weeklySummaryText,
                  thisWeekLoss >= lastWeekLoss
                    ? { color: "#15803D" }
                    : { color: "#475569" },
                ]}
              >
                {thisWeekLoss > lastWeekLoss
                  ? `Great job! You lost ${(thisWeekLoss - lastWeekLoss).toFixed(1)} kg more than last week!`
                  : thisWeekLoss === lastWeekLoss && thisWeekLoss > 0
                  ? `Consistent pace! Matching last week's ${thisWeekLoss.toFixed(1)} kg loss.`
                  : `Keep going! Every effort builds long-term progress.`}
              </Text>
            </View>
          </View>

          {/* Achievements Section */}
          <AchievementsSection lostKg={lost} />

          {/* Daily Steps Card */}
          <TouchableOpacity
            style={styles.achievementsBox}
            onPress={() => router.push('/(app)/steps')}
            activeOpacity={0.9}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="walk" size={18} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.achievementsTitle}>Daily Step Tracker & Pedometer</Text>
                  <Text style={{ fontSize: 12, color: Colors.textMuted }}>Track live steps, distance, & calories</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>


          {/* Main Weight Loss Progress + Current Stats Grid */}

          <View
            style={[
              styles.twoColGrid,
              !isDesktop && { flexDirection: "column" },
            ]}
          >
            {/* Left Chart Card */}
            <View style={{ flex: 2.2 }}>
              <WeightLossChart
                chartData={chartData}
                range={range}
                setRange={setRange}
                DAYS={DAYS}
                mainChartWidth={mainChartWidth}
                minWeightBound={minWeightBound}
                maxWeightBound={maxWeightBound}
                chartSegments={chartSegments}
                formatDateShort={formatDateShort}
              />
            </View>

            {/* Right Current Stats Card */}
            <View style={[styles.statsSidebarCard, { flex: 1 }]}>
              <Text style={styles.sidebarCardHeaderTitle}>Current Stats</Text>
              <CurrentStatsCards
                current={current}
                startWeight={startWeight}
                target={target}
                lost={lost}
                toGo={toGo}
                lastLoggedDate={
                  journey.history && journey.history.length > 0
                    ? formatDateShort(journey.history[journey.history.length - 1].date)
                    : undefined
                }
              />
            </View>
          </View>

          {/* Average Weekly Loss & Transformation Gallery Row */}
          <View
            style={[
              styles.twoColGrid,
              !isDesktop && { flexDirection: "column" },
            ]}
          >
            {/* Average Weekly Loss */}
            <View style={[styles.gaugeMiniCard, { flex: 1, alignItems: "center" }]}>
              <Text style={[styles.cardHeaderTitle, { alignSelf: "flex-start" }]}>
                Average Weekly Loss
              </Text>
              <GaugeMeter value={avgWeeklyLoss} maxVal={2.0} />
            </View>

            {/* My Transformation Gallery */}
            <View style={{ flex: 2.2 }}>
              <TransformationGallery
                history={journey.history}
                startWeight={startWeight}
                sampleImages={SAMPLE_TRANSFORMATION_IMAGES}
                formatDateShort={formatDateShort}
              />
            </View>
          </View>

          {/* Hydration, Sleep, Recipe Ideas Grid */}
          <View
            style={[
              styles.threeColGrid,
              !isDesktop && { flexDirection: "column" },
            ]}
          >
            <View style={{ flex: 1 }}>
              <WaterTrackerWidget
                waterAmount={waterAmount}
                onAddWater={handleWaterAdd}
                onResetWater={handleWaterReset}
                onOpenHistory={() => setActiveHistoryType("water")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SleepTrackerWidget
                todaySleep={{ date: todayStr, hours: sleepHours }}
                onLogSleep={handleSleepSave}
                onOpenHistory={() => setActiveHistoryType("sleep")}
                onIncreaseSleep={() => setSleepHours(parseFloat((sleepHours + 0.5).toFixed(1)))}
                onDecreaseSleep={() => setSleepHours(Math.max(0, parseFloat((sleepHours - 0.5).toFixed(1))))}
              />
            </View>
            <View style={{ flex: 1.2 }}>
              <HealthyRecipesWidget recipes={recipes} />
            </View>
          </View>

          {/* Body Measurements & Daily Habits Grid */}
          <View
            style={[
              styles.twoColGrid,
              !isDesktop && { flexDirection: "column" },
            ]}
          >
            <View style={{ flex: 1 }}>
              <BodyMeasurementsWidget
                waist={waist}
                setWaist={setWaist}
                hips={hips}
                setHips={setHips}
                chest={chest}
                setChest={setChest}
                saving={savingMeasurements}
                onSave={handleSaveMeasurements}
                onOpenHistory={() => setActiveHistoryType("measurements")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <HabitsChecklistWidget
                habits={habits}
                onToggleHabit={handleHabitToggle}
                onOpenHistory={() => setActiveHistoryType("habits")}
              />
            </View>
          </View>

          {/* Today's Meals & Calories Summary */}
          <View style={styles.sectionContainerCard}>
            <View style={styles.sectionHeaderRow}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="fast-food-outline" size={16} color="#EA580C" />
                <Text style={styles.sectionHeaderTitle}>
                  Today's Meals & Calories
                </Text>
              </View>
              <View style={styles.totalCalsPill}>
                <Text style={styles.totalCalsText}>
                  Total Today:{" "}
                  <Text style={{ color: "#EA580C", fontWeight: "800" }}>
                    0 / 1600 kcal
                  </Text>
                </Text>
              </View>
            </View>

            {!loggedToday ? (
              <View style={styles.dottedPromptContainer}>
                <View style={styles.targetIconCircle}>
                  <Ionicons name="disc-outline" size={26} color="#EF4444" />
                </View>
                <Text style={styles.promptMainTitle}>
                  Enter Today's Weight First
                </Text>
                <Text style={styles.promptSubTitle}>
                  You must log your daily weight progress before you can start
                  tracking your meals.
                </Text>
                <TouchableOpacity
                  style={styles.logWeightMainBtn}
                  onPress={() => setShowLogModal(true)}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.logWeightMainBtnText}>
                    Log Weight Now
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.weightLoggedBanner}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <View style={styles.successCheckCircle}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.weightLoggedTitle}>Weight Logged Today!</Text>
                    <Text style={styles.weightLoggedSubtitle}>
                      Track your daily meals to monitor calories & AI nutrition feedback.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.logMealsActionBtn}
                  onPress={() => router.push("/(app)/log")}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.logMealsActionBtnText}>Log Meals</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Past Meal Logs */}
          {/* <View style={styles.sectionContainerCard}>
            <View style={styles.sectionHeaderRow}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="restaurant-outline" size={16} color="#EA580C" />
                <Text style={styles.sectionHeaderTitle}>Past Meal Logs</Text>
              </View>
              <TouchableOpacity
                style={styles.headerAddMealBtn}
                onPress={() => router.push("/(app)/log")}
              >
                <Ionicons name="add" size={14} color="#2563EB" />
                <Text style={styles.headerAddMealBtnText}>Log Meal</Text>
              </TouchableOpacity>
            </View>

            {groupMealsByDate(journey.meals).length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: "center", gap: 8 }}>
                <Ionicons name="fast-food-outline" size={36} color="#94A3B8" />
                <Text style={{ fontSize: 13, color: "#64748B", fontWeight: "500", textAlign: "center" }}>
                  No past meal logs recorded yet. Track your meals for AI calorie feedback!
                </Text>
                <TouchableOpacity
                  style={styles.logMealsActionBtn}
                  onPress={() => router.push("/(app)/log")}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.logMealsActionBtnText}>Log Meal Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              groupMealsByDate(journey.meals).map((group, idx) => (
                <View key={idx} style={styles.pastMealDateGroup}>
                  <View style={styles.pastMealDateHeaderRow}>
                    <Text style={styles.pastMealDateTitle}>{group.dateStr}</Text>
                    <View style={styles.orangeCalsBadgePill}>
                      <Text style={styles.orangeCalsBadgeText}>
                        {group.totalCals} kcal
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pastMealCardsRow}>
                    {group.items.map((m, i) => (
                      <View key={i} style={styles.pastMealSubCard}>
                        <View style={styles.pastMealSubHeader}>
                          <Text style={styles.pastMealTypeLabel}>
                            {m.type} • {m.time}
                          </Text>
                          <Text style={styles.pastMealKcalLabel}>
                            {m.cals} kcal
                          </Text>
                        </View>
                        <Text style={styles.pastMealDescText}>{m.desc}</Text>
                        {m.feedback ? (
                          <View style={styles.aiQuoteBox}>
                            <Text style={styles.aiQuoteText}>"{m.feedback}"</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View> */}

          
        </ScrollView>
      </View>

      {/* Floating Chat Button (Desktop Only) */}
      {isDesktop && (
        <TouchableOpacity style={styles.floatingChatBtn}>
          <View style={styles.chatDoctorAvatarCircle}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&auto=format&fit=crop&q=80",
              }}
              style={{ width: 24, height: 24, borderRadius: 12 }}
            />
          </View>
          <Text style={styles.floatingChatText}>Chat with us</Text>
        </TouchableOpacity>
      )}

      {/* Log Weight Modal */}
      <Modal visible={showLogModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(Spacing.lg, insets.bottom + 12) },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Log Today's Weight</Text>

            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.modalInput}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="e.g. 78.5"
              keyboardType="decimal-pad"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>
              Target Goal (kg){" "}
              <Text style={{ color: "#94A3B8" }}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.modalInput}
              value={targetInput}
              onChangeText={setTargetInput}
              placeholder="e.g. 70"
              keyboardType="decimal-pad"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>
              Progress Photo <Text style={{ color: "#94A3B8" }}>(optional)</Text>
            </Text>

            {imageInput ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageInput }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageInput("")}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
                <View style={styles.uploadedBadge}>
                  <Ionicons name="cloud-done-outline" size={14} color="#059669" />
                  <Text style={styles.uploadedBadgeText}>Uploaded to Cloudinary</Text>
                </View>
              </View>
            ) : uploadingImage ? (
              <View style={styles.uploadingBox}>
                <ActivityIndicator color={Colors.primaryLight} size="small" />
                <Text style={styles.uploadingText}>Uploading photo to Cloudinary...</Text>
              </View>
            ) : (
              <View style={styles.photoPickerRow}>
                <TouchableOpacity
                  style={styles.pickPhotoBtn}
                  onPress={handlePickImage}
                >
                  <Ionicons name="images-outline" size={18} color={Colors.primaryLight} />
                  <Text style={styles.pickPhotoBtnText}>Choose Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickPhotoBtn}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera-outline" size={18} color={Colors.primaryLight} />
                  <Text style={styles.pickPhotoBtnText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.inputLabel}>
              Note <Text style={{ color: "#94A3B8" }}>(optional)</Text>
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { height: 70, textAlignVertical: "top" },
              ]}
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="Feeling great today..."
              multiline
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowLogModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (!weightInput || saving) && { opacity: 0.5 },
                ]}
                onPress={handleSaveWeight}
                disabled={!weightInput || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* History Modal Popup */}
      <HistoryModal
        visible={activeHistoryType !== null}
        onClose={() => setActiveHistoryType(null)}
        type={activeHistoryType}
        waterLogs={journey.waterLogs}
        sleepLogs={journey.sleepLogs}
        measurementLogs={journey.measurements}
        habitLogs={journey.habitLogs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  topNavbar: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topNavLeft: { flexDirection: "row", alignItems: "center" },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoImage: { width: 72, height: 72, resizeMode: "contain" },
  logoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0E8F6E",
    letterSpacing: -0.5,
  },
  topNavCenter: { flexDirection: "row", alignItems: "center", gap: 20 },
  navLink: { fontSize: 15, fontWeight: "500", color: "#475569" },
  navLinkActive: { color: "#0E8F6E", fontWeight: "700" },
  topNavRight: { flexDirection: "row", alignItems: "center" },
  topProfileBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  topProfileText: { fontSize: 14, fontWeight: "800", color: "#059669" },
  bodyLayout: { flex: 1, flexDirection: "row" },
  sidebarContainer: {
    width: 200,
    backgroundColor: "#0F172A",
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  sidebarUserCard: {
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    marginBottom: 16,
  },
  sidebarAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  sidebarAvatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },
  sidebarUserName: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  sidebarUserEmail: { color: "#94A3B8", fontSize: 12, marginTop: 1 },
  sidebarUserId: { color: "#64748B", fontSize: 11, marginTop: 2 },
  sidebarNavList: { gap: 4, flex: 1 },
  sidebarNavItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sidebarNavActive: { backgroundColor: "#2563EB" },
  sidebarNavText: { fontSize: 15, fontWeight: "500", color: "#94A3B8" },
  sidebarNavTextActive: { color: "#FFFFFF", fontWeight: "700" },
  sidebarSignout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  sidebarSignoutText: { fontSize: 15, fontWeight: "500", color: "#94A3B8" },
  mainContentScroll: { flex: 1, backgroundColor: "#F8FAFC" },
  mainContentContainer: {
    padding: 16,
    gap: 14,
    paddingBottom: 60,
    maxWidth: 1320,
    width: "100%",
    alignSelf: "center",
  },
  greetingHeader: { marginBottom: 2 },
  greetingTitle: { fontSize: 15, color: "#475569", fontWeight: "500" },
  metricsGridRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  metricChipCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabelText: { fontSize: 11, color: "#64748B", fontWeight: "500" },
  chipValueText: { fontSize: 15, fontWeight: "800", color: "#1E293B" },
  weeklyAchievementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  weeklyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weeklyHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  weeklyHeaderSub: {
    fontSize: 11,
    color: "#64748B",
  },
  weeklyPaceChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  weeklyPaceChipText: {
    fontSize: 10,
    fontWeight: "800",
  },
  weeklyStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  weeklyStatMiniBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  weeklyStatBoxActive: {
    backgroundColor: "#F0F9FF",
    borderColor: "#BAE6FD",
  },
  weeklyStatLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  weeklyStatValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  weeklyStatSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  vsBadgeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  vsBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  weeklySummaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  weeklySummaryText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  achievementsBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  achievementsHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  achievementsTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  badgesFlexRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badgeItemPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  badgeItemActive: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  badgeActiveText: { fontSize: 13, fontWeight: "700", color: "#059669" },
  badgeMutedText: { fontSize: 13, color: "#64748B", fontWeight: "500" },
  twoColGrid: { flexDirection: "row", gap: 12 },
  threeColGrid: { flexDirection: "row", gap: 12 },
  chartMainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chartTitleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  rangePillsRow: { flexDirection: "row", gap: 4 },
  rangePillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  rangePillBtnActive: { backgroundColor: "#1E293B" },
  rangePillText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  rangePillTextActive: { color: "#FFFFFF" },
  statsSidebarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    justifyContent: "center",
  },
  sidebarCardHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 2,
  },
  statsCardsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    gap: 2,
  },
  sidebarStatBlock: { gap: 1 },
  sidebarStatLabel: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  sidebarStatBigVal: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  sidebarStatMediumVal: { fontSize: 17, fontWeight: "800", color: "#1E293B" },
  sidebarStatSubLabel: { fontSize: 11, color: "#94A3B8" },
  sidebarDividerLine: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 2,
  },
  gaugeMiniCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  gaugeCenterWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  gaugeArcCircle: { alignItems: "center", gap: 4 },
  gaugeBigValue: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  galleryMainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  galleryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  galleryPortraitCard: {
    width: 84,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  galleryPortraitImg: { width: 72, height: 72, borderRadius: 6 },
  galleryPortraitWeight: { fontSize: 13, fontWeight: "800", color: "#1E293B" },
  galleryPortraitDate: { fontSize: 10, color: "#94A3B8" },
  galleryBadgeGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  galleryBadgeGreenText: { fontSize: 10, fontWeight: "800", color: "#059669" },
  trackerCardWidget: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flex: 1,
    gap: 8,
  },
  widgetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  widgetHeaderTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  blueBadgePill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  blueBadgeText: { fontSize: 11, fontWeight: "700", color: "#2563EB" },
  waterGraphicBox: { alignItems: "center", paddingVertical: 4, gap: 2 },
  waterGlassGraphic: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  waterBigNum: { fontSize: 22, fontWeight: "900", color: "#1E293B" },
  waterSubText: { fontSize: 11, color: "#64748B" },
  waterBtnsRow: { flexDirection: "row", gap: 6 },
  waterAddBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
  },
  waterAddBtnText: { fontSize: 13, fontWeight: "700", color: "#2563EB" },
  waterHistoryBtn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  waterHistoryBtnText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  sleepDialCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 4,
  },
  sleepCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sleepBigVal: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  sleepTipBox: { backgroundColor: "#F8FAFC", padding: 8, borderRadius: 6 },
  sleepTipQuote: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
    lineHeight: 15,
  },
  sleepActionRow: { flexDirection: "row", gap: 6 },
  sleepHistoryBtn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sleepHistoryText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  sleepLogBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
  },
  sleepLogBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  recipeCardBox: {
    width: 170,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 3,
  },
  recipeBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orangeKcalBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  orangeKcalText: { fontSize: 11, fontWeight: "800", color: "#EA580C" },
  recipeTimeText: { fontSize: 11, color: "#64748B" },
  recipeCardName: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  recipeCardDesc: { fontSize: 11, color: "#64748B", lineHeight: 14 },
  recipeIngTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },
  recipeIngItem: { fontSize: 10, color: "#64748B" },
  measureFieldsRow: { flexDirection: "row", gap: 8 },
  measureCol: { flex: 1, gap: 2 },
  measureFieldLabel: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  measureInputBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    padding: 6,
    fontSize: 14,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    textAlign: "center",
  },
  widgetActionBtnsRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  widgetLightBtn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  widgetLightBtnText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  widgetBlueBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
  },
  widgetBlueBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  widgetGreenBtn: {
    flex: 1,
    backgroundColor: "#059669",
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
  },
  widgetGreenBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  habitsCheckList: { gap: 6 },
  habitCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  habitSquare: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  habitSquareChecked: { backgroundColor: "#059669", borderColor: "#059669" },
  habitCheckLabel: { fontSize: 14, color: "#475569", fontWeight: "500" },
  habitCheckLabelChecked: {
    color: "#1E293B",
    textDecorationLine: "line-through",
  },
  sectionContainerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  sectionHeaderTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  totalCalsPill: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    marginTop:6
  },
  totalCalsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9A3412",
  },
  dottedPromptContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    borderStyle: "dashed",
  },
  targetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFE4E6",
    alignItems: "center",
    justifyContent: "center",
  },
  promptMainTitle: { fontSize: 15, fontWeight: "800", color: "#1E293B" },
  promptSubTitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 360,
  },
  logWeightMainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  logWeightMainBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  pastMealDateGroup: { gap: 8, marginBottom: 8 },
  pastMealDateHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pastMealDateTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  orangeCalsBadgePill: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  orangeCalsBadgeText: { fontSize: 12, fontWeight: "800", color: "#EA580C" },
  pastMealCardsRow: { gap: 8 },
  pastMealSubCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pastMealSubHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pastMealTypeLabel: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  pastMealKcalLabel: { fontSize: 12, fontWeight: "800", color: "#EA580C" },
  pastMealDescText: { fontSize: 13, color: "#475569" },
  aiQuoteBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 2,
  },
  aiQuoteText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    lineHeight: 16,
  },
  footerContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 14,
    marginTop: 16,
    marginBottom: 10,
  },
  footerTopRow: { flexDirection: "row", gap: 20, flexWrap: "wrap" },
  footerLogoText: { fontSize: 18, fontWeight: "900", color: Colors.textPrimary },
  footerDescText: {
    fontSize: 12,
    color: Colors.textSecondary,
    maxWidth: 300,
    lineHeight: 16,
  },
  footerContactText: { fontSize: 12, color: Colors.textSecondary },
  footerBottomDivider: { height: 1, backgroundColor: Colors.border },
  footerBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  footerCopyright: { fontSize: 11, color: Colors.textMuted },
  footerLegalLink: { fontSize: 11, color: Colors.textSecondary },
  floatingChatBtn: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#2563EB",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  inlineChatBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  chatDoctorAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  floatingChatText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: Spacing.sm,
  },
  inputLabel: { fontSize: Fonts.sizes.sm, fontWeight: "600", color: "#475569" },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Fonts.sizes.md,
    color: "#1E293B",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  modalBtns: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: Radius.md,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  cancelText: { fontWeight: "700", color: "#64748B" },
  saveBtn: {
    flex: 1,
    padding: 15,
    borderRadius: Radius.md,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  saveText: { fontWeight: "700", color: "#FFFFFF" },
  photoPickerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  pickPhotoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  pickPhotoBtnText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  imagePreviewContainer: {
    marginTop: 6,
    marginBottom: 10,
    position: "relative",
    borderRadius: Radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F8FAFC",
  },
  imagePreview: {
    width: "100%",
    height: 140,
    borderRadius: Radius.md,
  },
  removeImageBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 14,
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ECFDF5",
    borderTopWidth: 1,
    borderTopColor: "#D1FAE5",
  },
  uploadedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#F1F5F9",
    borderRadius: Radius.md,
    marginTop: 4,
    marginBottom: 10,
  },
  uploadingText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.primaryLight,
    fontWeight: "600",
  },
  weightLoggedBanner: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 12,
    marginTop: 6,
  },
  successCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  weightLoggedTitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "800",
    color: "#15803D",
  },
  weightLoggedSubtitle: {
    fontSize: Fonts.sizes.xs,
    color: "#166534",
    marginTop: 2,
    lineHeight: 16,
  },
  logMealsActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  logMealsActionBtnText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerAddMealBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  headerAddMealBtnText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: "700",
    color: "#2563EB",
  },
});