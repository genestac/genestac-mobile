import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  BloodTestRequest,
  UserPlan,
  StepLog,
} from "@/lib/types";
import {
  fetchUserPlans,
  saveUserWaterHistory,
  saveUserSleepHistory,
  saveUserMeasurementHistory,
  fetchTestRequests,
  createBloodTestRequest,
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
import { BloodTestWidget } from "@/components/dashboard/BloodTestWidget";
import { BodyMeasurementsWidget } from "@/components/dashboard/BodyMeasurementsWidget";
import { HabitsChecklistWidget } from "@/components/dashboard/HabitsChecklistWidget";
import { AchievementsSection } from "@/components/dashboard/AchievementsSection";
import { FastingWidget } from "@/components/dashboard/FastingWidget";
import { checkUserSubscription, UserSubscriptionStatus } from "@/lib/subscriptions";
import { BloodTestRequestModal } from "@/components/BloodTestRequestModal";
import ReportAnalyzerModal from "@/components/ReportAnalyzerModal";
import DocumentWalletModal from "@/components/DocumentWalletModal";
import DocumentUploadModal from "@/components/DocumentUploadModal";
import { PrimaryGoalModal } from "@/components/PrimaryGoalModal";
import { isWeightLossGoal, getRouteForPrimaryGoal } from "@/lib/primaryGoal";

const CATEGORIES = [
  {
    id: "weight-management",
    title: "Weight management - Fatloss",
    route: "/(app)/dashboard",
    iconType: "ionicons",
    iconName: "barbell",
    color: "#059669",
    bgColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    description:
      "Track weight loss graph, calories, water, sleep & measurements",
    image: "https://images.pexels.com/photos/5714344/pexels-photo-5714344.jpeg",
  },
  {
    id: "longevity",
    title: "Longevity",
    route: "/(app)/longevity",
    iconType: "mci",
    iconName: "dna",
    color: "#4F46E5",
    bgColor: "#EEF2FF",
    borderColor: "#C7D2FE",
    description: "Cellular age, NAD+ optimization & anti-aging protocols",
    image: "https://images.pexels.com/photos/8939936/pexels-photo-8939936.jpeg",
  },
  {
    id: "pain-regeneration",
    title: "Pain & Regeneration",
    route: "/(app)/pain-regeneration",
    iconType: "mci",
    iconName: "bandage",
    color: "#DC2626",
    bgColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    description: "Joint pain management, muscle recovery & physical rehab",
    image: "https://images.pexels.com/photos/4506109/pexels-photo-4506109.jpeg",
  },
  {
    id: "hair-treatment",
    title: "Hair Treatment",
    route: "/(app)/hair-treatment",
    iconType: "ionicons",
    iconName: "sparkles",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    borderColor: "#FBCFE8",
    description:
      "Hair-loss assessment, scalp care & hair restoration solutions",
    image: "https://images.pexels.com/photos/7755460/pexels-photo-7755460.jpeg",
  },
  {
    id: "heart-diabetes",
    title: "Heart & Diabetes",
    route: "/(app)/heart-diabetes",
    iconType: "ionicons",
    iconName: "heart",
    color: "#E11D48",
    bgColor: "#FFF1F2",
    borderColor: "#FECDD3",
    description:
      "Blood glucose monitoring, blood pressure & cardiovascular health",
    image: "https://images.pexels.com/photos/5207102/pexels-photo-5207102.jpeg",
  },
  {
    id: "skin-laser-treatment",
    title: "Skin Laser Treatment",
    route: "/(app)/skin-laser-treatment",
    iconType: "ionicons",
    iconName: "sparkles",
    color: "#0284C7",
    bgColor: "#F0F9FF",
    borderColor: "#BAE6FD",
    description:
      "Advanced skincare, laser resurfacing & aesthetic dermatological care",
    image: "https://images.pexels.com/photos/4586750/pexels-photo-4586750.jpeg",
  },
];

// ── Daily goals ──────────────────────────────────────────────
const WATER_GOAL_L = 3;    // litres
const STEPS_GOAL   = 7000; // steps
const SLEEP_GOAL_H = 7;    // hours

interface TaskItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  completed: boolean;
  category: string;
}

/** Returns "YYYY-MM-DD" in local time */
function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CategoryHubScreen() {
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Health Profile State
  const [age, setAge] = useState("28");
  const [heightCm, setHeightCm] = useState("172");
  const [targetWeight, setTargetWeight] = useState("65.0");
  const [currentWeight, setCurrentWeight] = useState("72.5");
  const [startingWeight] = useState("78.0");

  // Weight Modal
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState("");

  // Blood Test Modal
  const [showBloodTestModal, setShowBloodTestModal] = useState(false);
  const [showReportAnalyzerModal, setShowReportAnalyzerModal] = useState(false);
  const [showDocumentWalletModal, setShowDocumentWalletModal] = useState(false);
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [bloodTestLoading, setBloodTestLoading] = useState(false);

  // Primary Goal State
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [showPrimaryGoalModal, setShowPrimaryGoalModal] = useState(false);

  // Tasks Accordion State
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);

  // Tasks State (will be rebuilt dynamically after data loads)
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: "task-weight", title: "Log Today's Weight", subtitle: "Keep your daily weight tracking streak", icon: "scale-outline", completed: false, category: "Weight" },
    { id: "task-water",  title: "Drink 3L Water Today",  subtitle: `Goal: ${WATER_GOAL_L}L — loading…`, icon: "water-outline", completed: false, category: "Hydration" },
    { id: "task-steps",  title: `Walk ${STEPS_GOAL.toLocaleString()} Steps Daily`, subtitle: "Loading today's steps…", icon: "walk-outline", completed: false, category: "Fitness" },
    { id: "task-sleep",  title: `Sleep ${SLEEP_GOAL_H}+ Hours`,  subtitle: "Loading last night's sleep…", icon: "moon-outline", completed: false, category: "Sleep" },
    { id: "task-meal",   title: "Log Today's Meal",   subtitle: "Track your breakfast, lunch & dinner", icon: "nutrition-outline", completed: false, category: "Diet" },
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;

      const uid = session.user.id;
      setUserId(uid);
      const fullName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        (session.user.email ? session.user.email.split("@")[0] : "User");
      setUserName(fullName);

      // Fetch user_plans for activity history
      const plan: UserPlan | null = await fetchUserPlans(uid);

      // Fetch weight_loss_journey & primary_goal for user
      const { data: userData } = await supabase
        .from("users")
        .select("weight_loss_journey, primary_goal")
        .eq("id", uid)
        .maybeSingle();

      const userGoal = userData?.primary_goal || null;
      setPrimaryGoal(userGoal);
      if (userGoal && !isWeightLossGoal(userGoal)) {
        router.replace(getRouteForPrimaryGoal(userGoal) as any);
        return;
      }
      if (!userGoal) {
        // If primary goal is null, show selection modal
        setShowPrimaryGoalModal(true);
      }

      const today = todayDateStr();

      // ── WEIGHT ──────────────────────────────────────────────
      const journey: WeightJourney = (userData?.weight_loss_journey as WeightJourney) || { history: [] };
      const todayWeightLog = journey.history?.find((w: WeightLog) => w.date?.startsWith(today));
      const weightDone = !!todayWeightLog;
      if (todayWeightLog) {
        setCurrentWeight(String(todayWeightLog.weight));
      }

      // ── WATER ──────────────────────────────────────────────
      const waterHistory: WaterLog[] = plan?.water_history || [];
      const todayWater = waterHistory.find((w) => w.date?.startsWith(today));
      const waterAmount = todayWater?.amount ?? 0;
      const waterDone = waterAmount >= WATER_GOAL_L;
      const waterSubtitle = waterDone
        ? `✓ ${waterAmount}L consumed — goal reached!`
        : `${waterAmount}L done · ${(WATER_GOAL_L - waterAmount).toFixed(1)}L more to reach ${WATER_GOAL_L}L goal`;

      // ── STEPS ──────────────────────────────────────────────
      const stepsHistory: StepLog[] = plan?.steps_history || [];
      const todayStep = stepsHistory.find((s) => s.date?.startsWith(today));
      const stepsCount = todayStep?.steps ?? 0;
      const stepsDone = stepsCount >= STEPS_GOAL;
      const stepsSubtitle = stepsDone
        ? `✓ ${stepsCount.toLocaleString()} steps — daily goal achieved!`
        : `${stepsCount.toLocaleString()} steps done · ${(STEPS_GOAL - stepsCount).toLocaleString()} more to reach ${STEPS_GOAL.toLocaleString()}`;

      // ── SLEEP ──────────────────────────────────────────────
      const sleepHistory: SleepLog[] = plan?.sleep_history || [];
      const todaySleep = sleepHistory.find((s) => s.date?.startsWith(today));
      const sleepHours = todaySleep?.hours ?? 0;
      const sleepDone = sleepHours >= SLEEP_GOAL_H;
      const sleepSubtitle = sleepDone
        ? `✓ ${sleepHours}h sleep logged — great recovery!`
        : sleepHours > 0
          ? `${sleepHours}h logged · aim for ${SLEEP_GOAL_H}h tonight`
          : `Log last night's sleep to track recovery`;

      // ── MEAL ──────────────────────────────────────────────
      const meals: MealLog[] = journey.meals || [];
      const todayMeals = meals.filter((m) => m.date?.startsWith(today));
      const mealDone = todayMeals.length > 0;
      const mealSubtitle = mealDone
        ? `✓ ${todayMeals.length} meal(s) logged today`
        : "No meals logged yet — track breakfast, lunch & dinner";

      // ── Rebuild tasks ─────────────────────────────────────
      setTasks([
        {
          id: "task-weight",
          title: "Log Today's Weight",
          subtitle: weightDone
            ? `✓ ${todayWeightLog!.weight} kg logged today`
            : "Keep your daily weight tracking streak",
          icon: "scale-outline",
          completed: weightDone,
          category: "Weight",
        },
        {
          id: "task-water",
          title: "Drink 3L Water Today",
          subtitle: waterSubtitle,
          icon: "water-outline",
          completed: waterDone,
          category: "Hydration",
        },
        {
          id: "task-steps",
          title: `Walk ${STEPS_GOAL.toLocaleString()} Steps Daily`,
          subtitle: stepsSubtitle,
          icon: "walk-outline",
          completed: stepsDone,
          category: "Fitness",
        },
        {
          id: "task-sleep",
          title: `Sleep ${SLEEP_GOAL_H}+ Hours`,
          subtitle: sleepSubtitle,
          icon: "moon-outline",
          completed: sleepDone,
          category: "Sleep",
        },
        {
          id: "task-meal",
          title: "Log Today's Meal",
          subtitle: mealSubtitle,
          icon: "nutrition-outline",
          completed: mealDone,
          category: "Diet",
        },
      ]);
    });
  }, []);

  // Determine Greeting based on hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) {
      return { title: "Good Morning", emoji: "🌅", icon: "sunny" as const, color: "#D97706", bgColor: "#FEF3C7" };
    } else if (hour >= 12 && hour < 17) {
      return { title: "Good Afternoon", emoji: "☀️", icon: "sunny" as const, color: "#EA580C", bgColor: "#FFEDD5" };
    } else {
      return { title: "Good Evening", emoji: "🌙", icon: "moon" as const, color: "#4F46E5", bgColor: "#EEF2FF" };
    }
  };

  const greeting = getGreeting();

  // Toggle Task Completion (manual override)
  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const taskProgressPercent = Math.round((completedCount / tasks.length) * 100);

  // Handle Weight Log Submit
  const handleSaveWeight = () => {
    const val = parseFloat(newWeightInput);
    if (isNaN(val) || val <= 20 || val >= 300) {
      Alert.alert("Invalid Input", "Please enter a valid weight in kg (e.g. 71.5).");
      return;
    }
    setCurrentWeight(val.toFixed(1));
    setShowWeightModal(false);
    setNewWeightInput("");

    // Auto mark weight task as done
    setTasks((prev) =>
      prev.map((t) =>
        t.id === "task-weight"
          ? { ...t, completed: true, subtitle: `✓ ${val.toFixed(1)} kg logged today` }
          : t
      )
    );
    Alert.alert("Weight Logged!", `Your weight of ${val.toFixed(1)} kg has been updated successfully.`);
  };

  // Handle Blood Test Submit
  const handleBloodTestSubmit = async (conditionText: string) => {
    if (!userId) {
      Alert.alert("Sign In Required", "Please sign in to request a lab test.");
      return;
    }
    try {
      setBloodTestLoading(true);
      await createBloodTestRequest(userId, conditionText);
      setShowBloodTestModal(false);
      Alert.alert("Lab Request Submitted", "Your blood test request has been sent for physician review.");
    } catch (err) {
      Alert.alert("Error", "Could not submit blood test request. Please try again.");
    } finally {
      setBloodTestLoading(false);
    }
  };

  // Split 6 cards into 3 rows of 2 cards each
  const categoryRows = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) {
    categoryRows.push(CATEGORIES.slice(i, i + 2));
  }

  // Calculate BMI
  const heightM = parseFloat(heightCm) / 100;
  const bmiVal = (parseFloat(currentWeight) / (heightM * heightM)).toFixed(1);

  return (
    <View style={styles.rootContainer}>
      <TopNavbar userName={userName} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Health Profile & Time Greeting */}
        <View style={styles.healthProfileCard}>
          <View style={styles.greetingHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.greetingBadgeRow}>
                <View style={[styles.greetingIconCircle, { backgroundColor: greeting.bgColor }]}>
                  <Ionicons name={greeting.icon} size={16} color={greeting.color} />
                </View>
                <Text style={styles.greetingTagText}>HEALTH PROFILE</Text>
              </View>
              <Text style={styles.greetingNameText}>
                {greeting.title}, {userName || "User"} {greeting.emoji}
              </Text>
              <Text style={styles.greetingSubtitleText}>
                Welcome back to your personalized dashboard
              </Text>
            </View>

            <TouchableOpacity
              style={styles.profileEditBadge}
              onPress={() => router.push("/(app)/dashboard/profile")}
              activeOpacity={0.8}
            >
            </TouchableOpacity>
          </View>

          {/* Document Wallet Button */}
          <TouchableOpacity
            style={styles.documentWalletBtn}
            onPress={() => setShowDocumentWalletModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.documentWalletBtnContent}>
              <View style={styles.documentWalletIconBadge}>
                <Ionicons name="wallet-outline" size={18} color="#4F46E5" />
              </View>
              <Text style={styles.documentWalletBtnText}>Document Wallet</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* SECTION 2: Today's Task List */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            onPress={() => setIsTaskListOpen((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.sectionTitleLeft}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="checkbox-outline" size={15} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Today's Task</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.taskCounterBadge}>
                <Text style={styles.taskCounterText}>
                  {completedCount}/{tasks.length} Done
                </Text>
              </View>

              <View style={styles.chevronRedBadge}>
                <Ionicons
                  name={isTaskListOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#DC2626"
                />
              </View>
            </View>
          </TouchableOpacity>

          {/* List of Tasks */}
          {isTaskListOpen && (
            <View style={styles.taskListContainer}>
              {tasks.map((t) => (
                <View
                  key={t.id}
                  style={[
                    styles.taskItemRow,
                    t.completed && styles.taskItemRowCompleted,
                  ]}
                >
                  <View style={[styles.taskIconBg, t.completed && { backgroundColor: "#F0FDF4" }]}>
                    <Ionicons
                      name={t.completed ? "checkmark-circle" : t.icon}
                      size={20}
                      color={t.completed ? "#16A34A" : "#4F46E5"}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.taskItemTitle,
                        t.completed && styles.taskItemTitleCompleted,
                      ]}
                    >
                      {t.title}
                    </Text>
                    <Text style={styles.taskItemSub}>{t.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* SECTION 3: Current Weight Tracker (70%) & AI Report Analyzer (30%) */}
        <View style={styles.trackerRow}>
          {/* Current Weight Card (70% width) */}
          <View style={styles.weightCard70}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleLeft}>
                <View style={[styles.sectionIconBadge, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="scale-outline" size={14} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle} numberOfLines={1}>Weight</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.logWeightBtn}
                onPress={() => setShowWeightModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.weightMainContent}>
              <View style={styles.weightNumberBox}>
                <View style={styles.weightDisplayRow}>
                  <Text style={styles.weightBigVal}>{currentWeight}</Text>
                  <Text style={styles.weightUnit}>kg</Text>
                </View>
                <Text style={styles.weightUpdatedTag}>Updated Today</Text>
              </View>

              <View style={styles.weightSubStatsCol}>
                <View style={styles.weightMiniStatRow}>
                  <Text style={styles.weightMiniLabel}>Target Weight :</Text>
                  <Text style={styles.weightMiniVal}>{targetWeight} kg</Text>
                </View>
                <View style={styles.weightMiniStatRow}>
                  <Text style={styles.weightMiniLabel}>Start Weight :</Text>
                  <Text style={styles.weightMiniVal}>{startingWeight} kg</Text>
                </View>
                <View style={styles.weightMiniStatRow}>
                  <Text style={styles.weightMiniLabel}>Remaining to Goal :</Text>
                  <Text style={[styles.weightMiniVal, { color: "#059669" }]}>
                    {(parseFloat(currentWeight) - parseFloat(targetWeight)).toFixed(1)} kg
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* AI Report Analyzer Card (30% width) */}
          <TouchableOpacity
            style={styles.aiReportCard30}
            onPress={() => setShowReportAnalyzerModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.aiReportHeader}>
              <View style={styles.aiReportIconCircle}>
                <Ionicons name="sparkles" size={14} color="#4F46E5" />
              </View>
              <View style={styles.aiReportBadge}>
                <Text style={styles.aiReportBadgeText}>AI SCAN</Text>
              </View>
            </View>

            <View style={styles.aiReportBody}>
              <Text style={styles.aiReportTitle} numberOfLines={1}>
                AI Report Analyzer
              </Text>
              <Text style={styles.aiReportSub} numberOfLines={2}>
                Upload lab reports for AI insights
              </Text>
            </View>

            <View style={styles.aiReportActionBtn}>
              <Ionicons name="document-text-outline" size={20} color="#4F46E5" />
              <Text style={styles.aiReportActionText}>Analyze</Text>
              <Ionicons name="arrow-forward" size={14} color="#4F46E5" />
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION 6: 6 Category Cards */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.hubSectionTitle}>Health & Protocol Services</Text>
        </View>

        {/* 3 Rows x 2 Cards Grid */}
        <View style={styles.gridContainer}>
          {categoryRows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {row.map((cat: typeof CATEGORIES[0]) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    { borderColor: cat.borderColor },
                  ]}
                  onPress={() => router.push(cat.route as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: cat.bgColor },
                      ]}
                    >
                      {cat.image ? (
                        <Image
                          source={{ uri: cat.image }}
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                      ) : cat.iconType === "mci" ? (
                        <MaterialCommunityIcons
                          name={cat.iconName as any}
                          size={24}
                          color={cat.color}
                        />
                      ) : (
                        <Ionicons
                          name={cat.iconName as any}
                          size={24}
                          color={cat.color}
                        />
                      )}
                    </View>
                    <View
                      style={[
                        styles.arrowBadge,
                        { backgroundColor: cat.bgColor },
                      ]}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={cat.color}
                      />
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>{cat.title}</Text>
                  <Text style={styles.cardDescription}>{cat.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Weight Modal */}
      <Modal
        visible={showWeightModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSubHeader}>WEIGHT MANAGEMENT</Text>
                <Text style={styles.modalTitleText}>Log Today's Weight</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowWeightModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescText}>
              Enter your current weight measurement in kilograms (kg) to update your health progress.
            </Text>

            <View style={styles.weightInputBox}>
              <TextInput
                style={styles.weightTextInput}
                placeholder={`Current: ${currentWeight}`}
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={newWeightInput}
                onChangeText={setNewWeightInput}
                autoFocus={true}
              />
              <Text style={styles.weightInputUnit}>kg</Text>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowWeightModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveWeight}
              >
                <Text style={styles.saveBtnText}>Save Weight</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Blood Test Request Modal */}
      <BloodTestRequestModal
        visible={showBloodTestModal}
        onClose={() => setShowBloodTestModal(false)}
        onSubmit={handleBloodTestSubmit}
        loading={bloodTestLoading}
      />

      {/* AI Lab Report Analyzer & Safety Triage Modal */}
      <ReportAnalyzerModal
        visible={showReportAnalyzerModal}
        onClose={() => setShowReportAnalyzerModal(false)}
        onRequestDoctorReview={handleBloodTestSubmit}
      />

      {/* Document Wallet Modal (90% Width & 85% Height Popup) */}
      <DocumentWalletModal
        visible={showDocumentWalletModal}
        onClose={() => setShowDocumentWalletModal(false)}
        onOpenUpload={() => setShowDocumentUploadModal(true)}
      />

      {/* Dedicated Document Upload / Scan Modal */}
      <DocumentUploadModal
        visible={showDocumentUploadModal}
        onClose={() => setShowDocumentUploadModal(false)}
      />

      {/* Primary Goal Selection Modal */}
      <PrimaryGoalModal
        visible={showPrimaryGoalModal}
        userId={userId || ""}
        initialGoal={primaryGoal}
        allowDismiss={false}
        onClose={() => setShowPrimaryGoalModal(false)}
        onGoalSaved={(savedGoal, targetRoute) => {
          setPrimaryGoal(savedGoal);
          setShowPrimaryGoalModal(false);
          router.push(targetRoute as any);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },

  /* Health Profile Card */
  healthProfileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 16,
  },
  greetingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greetingBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  greetingIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  greetingNameText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 28,
  },
  greetingSubtitleText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  profileEditBadge: {
    padding: 4,
  },
  documentWalletBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    marginTop: 12,
  },
  documentWalletBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  documentWalletIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  documentWalletBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3730A3",
  },

  /* Section Card Standard */
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sectionIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubTitle: {
    fontSize: 12,
    color: "#64748B",
  },
  taskCounterBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  taskCounterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  chevronRedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Progress Bar */
  progressBarTrack: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 3,
  },

  /* Tasks List */
  taskListContainer: {
    gap: 8,
  },
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 10,
  },
  taskItemRowCompleted: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    opacity: 0.75,
  },
  checkboxBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBtnChecked: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  taskIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  taskItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  taskItemTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#64748B",
  },
  taskItemSub: {
    fontSize: 11,
    color: "#64748B",
  },
  categoryPill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },

  /* Weight Card & AI Report Row */
  trackerRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  weightCard70: {
    flex: 0.6,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 10,
    justifyContent: "space-between",
  },
  aiReportCard30: {
    flex: 0.4,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    justifyContent: "space-between",
    gap: 6,
  },
  aiReportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiReportIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  aiReportBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  aiReportBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.3,
  },
  aiReportBody: {
    gap: 2,
  },
  aiReportTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  aiReportSub: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 13,
  },
  aiReportActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  aiReportActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },

  logWeightBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  logWeightBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  weightMainContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 6,
    flexWrap: "wrap",
  },
  weightNumberBox: {
    gap: 1,
  },
  weightDisplayRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  weightBigVal: {
    fontSize: 24,
    fontWeight: "900",
    color: "#065F46",
  },
  weightUnit: {
    fontSize: 13,
    fontWeight: "700",
    color: "#047857",
  },
  weightUpdatedTag: {
    fontSize: 9,
    fontWeight: "600",
    color: "#047857",
  },
  weightSubStatsCol: {
    gap: 3,
    flexShrink: 1,
  },
  weightMiniStatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  weightMiniLabel: {
    fontSize: 10,
    color: "#047857",
  },
  weightMiniVal: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065F46",
  },

  /* Fasting & Vitals Cards */
  fastingCard: {
    borderColor: "#FED7AA",
    backgroundColor: "#FFFFFF",
  },
  fastingCardBody: {
    marginTop: 6,
    gap: 4,
  },
  fastingTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  fastingBigTime: {
    fontSize: 20,
    fontWeight: "900",
    color: "#C2410C",
  },
  fastingTag: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fastingTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#EA580C",
  },
  fastingSubText: {
    fontSize: 11,
    color: "#64748B",
  },
  vitalsListCol: {
    marginTop: 6,
    gap: 4,
  },
  vitalItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vitalItemLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  vitalItemValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },

  /* AI Health Brief Card */
  aiBriefCard: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  aiBriefHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiBriefHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aiBriefIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  aiBriefTag: {
    fontSize: 9,
    fontWeight: "800",
    color: "#818CF8",
    letterSpacing: 0.8,
  },
  aiBriefTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  aiStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  aiStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10B981",
  },
  aiBriefBodyText: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 18,
  },
  aiBriefActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  aiPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  aiPrimaryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  aiSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  aiSecondaryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },

  /* Hub Section Header */
  sectionHeaderWrap: {
    marginTop: 8,
    gap: 2,
  },
  hubSectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  hubSectionDesc: {
    fontSize: 12,
    color: "#64748B",
  },

  /* Grid Layout */
  gridContainer: {
    gap: 12,
    marginBottom:20
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  arrowBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 19,
  },
  cardDescription: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalSubHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.8,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDescText: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  weightInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  weightTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  weightInputUnit: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 14,
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
  expiryBannerContainer: {
    backgroundColor: "#FEF3C7",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  expiryBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  expiryBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  expiryBannerSub: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
  },
  expiryBannerBtn: {
    backgroundColor: "#D97706",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  expiryBannerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
