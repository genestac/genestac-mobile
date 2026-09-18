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
import TopNavbar from "@/components/dashboard/TopNavbar";

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

interface TaskItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  completed: boolean;
  category: string;
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

  // Tasks Accordion State
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);

  // Tasks State
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: "task-1",
      title: "Record Morning Weight",
      subtitle: "Keep your daily weight tracking streak",
      icon: "scale-outline",
      completed: false,
      category: "Weight",
    },
    {
      id: "task-2",
      title: "Drink 2.5L Water Goal",
      subtitle: "5 of 10 glasses completed today",
      icon: "water-outline",
      completed: false,
      category: "Hydration",
    },
    {
      id: "task-3",
      title: "Log Healthy Meal & Calorie intake",
      subtitle: "Track your lunch & dinner meals",
      icon: "nutrition-outline",
      completed: false,
      category: "Diet",
    },
    {
      id: "task-4",
      title: "Complete 8,000+ Daily Steps",
      subtitle: "Current progress: 5,420 steps",
      icon: "walk-outline",
      completed: false,
      category: "Fitness",
    },
    {
      id: "task-5",
      title: "Night Sleep & Recovery Check",
      subtitle: "Log your sleep duration & quality",
      icon: "moon-outline",
      completed: false,
      category: "Sleep",
    },
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        const fullName = session.user.user_metadata?.full_name || "User";
        setUserName(fullName);
      }
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

  // Toggle Task Completion
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
    
    // Auto mark morning weight task as done
    setTasks((prev) =>
      prev.map((t) => (t.id === "task-1" ? { ...t, completed: true } : t))
    );
    Alert.alert("Weight Logged!", `Your weight of ${val.toFixed(1)} kg has been updated successfully.`);
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
                Welcome back to your personalized health portal
              </Text>
            </View>

            <TouchableOpacity
              style={styles.profileEditBadge}
              onPress={() => router.push("/(app)/dashboard/profile")}
              activeOpacity={0.8}
            >
            </TouchableOpacity>
          </View>

          {/* Profile Quick Overview Stats */}
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatBox}>
              <Text style={styles.profileStatLabel}>Age</Text>
              <Text style={styles.profileStatValue}>{age} yrs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.profileStatBox}>
              <Text style={styles.profileStatLabel}>Height</Text>
              <Text style={styles.profileStatValue}>{heightCm} cm</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.profileStatBox}>
              <Text style={styles.profileStatLabel}>BMI Index</Text>
              <Text style={[styles.profileStatValue, { color: "#059669" }]}>{bmiVal} (Normal)</Text>
            </View>
          </View>
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
                <Text style={styles.sectionTitle}>Today's Task List</Text>
              </View>
            </View>

            <View style={styles.taskCounterBadge}>
              <Text style={styles.taskCounterText}>
                {completedCount}/{tasks.length} Done
              </Text>
            </View>
          </TouchableOpacity>

          {/* List of Tasks */}
          {isTaskListOpen && (
            <View style={styles.taskListContainer}>
              {tasks.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.taskItemRow,
                    t.completed && styles.taskItemRowCompleted,
                  ]}
                  onPress={() => toggleTask(t.id)}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    style={[
                      styles.checkboxBtn,
                      t.completed && styles.checkboxBtnChecked,
                    ]}
                    onPress={() => toggleTask(t.id)}
                  >
                    {t.completed && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>

                  <View style={styles.taskIconBg}>
                    <Ionicons
                      name={t.icon}
                      size={18}
                      color={t.completed ? "#94A3B8" : "#4F46E5"}
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
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Centered Chevron Button Below */}
          <TouchableOpacity
            style={styles.centeredChevronBtn}
            onPress={() => setIsTaskListOpen((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isTaskListOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color="#4F46E5"
            />
          </TouchableOpacity>
        </View>

        {/* SECTION 3: Current Weight Tracker */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleLeft}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="scale-outline" size={15} color="#059669" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Current Weight</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.logWeightBtn}
              onPress={() => setShowWeightModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.logWeightBtnText}>Log Weight</Text>
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
                <Text style={styles.weightMiniLabel}>Target Weight:</Text>
                <Text style={styles.weightMiniVal}>{targetWeight} kg</Text>
              </View>
              <View style={styles.weightMiniStatRow}>
                <Text style={styles.weightMiniLabel}>Starting Weight:</Text>
                <Text style={styles.weightMiniVal}>{startingWeight} kg</Text>
              </View>
              <View style={styles.weightMiniStatRow}>
                <Text style={styles.weightMiniLabel}>Remaining to Goal:</Text>
                <Text style={[styles.weightMiniVal, { color: "#059669" }]}>
                  {(parseFloat(currentWeight) - parseFloat(targetWeight)).toFixed(1)} kg
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 4: 6 Category Cards */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.hubSectionTitle}>Health & Protocol Services</Text>
        </View>

        {/* 3 Rows x 2 Cards Grid */}
        <View style={styles.gridContainer}>
          {categoryRows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {row.map((cat) => (
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
  profileStatsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  profileStatBox: {
    alignItems: "center",
  },
  profileStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
  profileStatValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
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
  centeredChevronBtn: {
    alignSelf: "center",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
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

  /* Weight Card */
  logWeightBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  logWeightBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  weightMainContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  weightNumberBox: {
    gap: 2,
  },
  weightDisplayRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  weightBigVal: {
    fontSize: 32,
    fontWeight: "900",
    color: "#065F46",
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: "700",
    color: "#047857",
  },
  weightUpdatedTag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#047857",
  },
  weightSubStatsCol: {
    gap: 4,
  },
  weightMiniStatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  weightMiniLabel: {
    fontSize: 12,
    color: "#047857",
  },
  weightMiniVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065F46",
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
});


