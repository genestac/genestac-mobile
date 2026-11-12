// app/(app)/hair-treatment.tsx
// Comprehensive Hair Treatment & Restoration Specialty Hub
// Photo Progression Journal (Before/After Slider & Ghost Camera), Norwood/Ludwig Assessment, Daily Protocol & Shedding Log

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { CategoryCards } from "@/components/CategoryCards";
import { VerticalGoalBottomNav } from "@/components/dashboard/VerticalGoalBottomNav";
import { getPrimaryGoalInfo, fetchUserPrimaryGoal } from "@/lib/primaryGoal";
import { supabase } from "@/lib/supabase";

import {
  HairTreatmentProfile,
  DEFAULT_HAIR_PROFILE,
  loadHairProfile,
  saveHairProfile,
  HairProgressionPhoto,
  HairStageAssessment,
  SheddingLog,
  calculateTreatmentDays,
} from "@/lib/hairTreatment";

import { HairProgressionPhotoJournalCard } from "@/components/hairTreatment/HairProgressionPhotoJournalCard";
import { NorwoodLudwigAssessmentCard } from "@/components/hairTreatment/NorwoodLudwigAssessmentCard";
import { DailyRegrowthProtocolCard } from "@/components/hairTreatment/DailyRegrowthProtocolCard";
import { HairSheddingDensityLogCard } from "@/components/hairTreatment/HairSheddingDensityLogCard";

const HAIR_TREATMENT_PLANS = [
  "Hair-loss assessment",
  "AI scalp analysis",
  "Medical hair restoration",
  "Hair PRP & PRF therapy",
  "Transplant consultation (FUE)",
  "Nutrition and hormonal evaluation",
];

type ActiveTab = "all" | "journal" | "stage" | "protocol" | "shedding" | "plans";

export default function HairTreatmentScreen() {
  const [profile, setProfile] = useState<HairTreatmentProfile>(DEFAULT_HAIR_PROFILE);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [isUserPrimaryGoal, setIsUserPrimaryGoal] = useState<boolean>(false);
  const goalInfo = getPrimaryGoalInfo("Hair Treatment");

  useEffect(() => {
    async function init() {
      const data = await loadHairProfile();
      setProfile(data);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const goal = await fetchUserPrimaryGoal(session.user.id);
        const isGoal =
          !!goal &&
          (goal.toLowerCase().includes("hair") ||
            goal.toLowerCase().includes("hai"));
        setIsUserPrimaryGoal(isGoal);
      }
    }
    init();
  }, []);

  // Update & persist helper
  const updateProfile = (
    updater:
      | HairTreatmentProfile
      | ((prev: HairTreatmentProfile) => HairTreatmentProfile)
  ) => {
    setProfile((prev) => {
      const nextProfile = typeof updater === "function" ? updater(prev) : updater;
      saveHairProfile(nextProfile);
      return nextProfile;
    });
  };

  // 1. Photo Journal Handlers
  const handleAddPhoto = (newPhoto: HairProgressionPhoto) => {
    updateProfile((prev) => ({
      ...prev,
      photos: [...prev.photos, newPhoto],
      lastUpdatedDate: new Date().toISOString(),
    }));
  };

  const handleDeletePhoto = (photoId: string) => {
    updateProfile((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== photoId),
      lastUpdatedDate: new Date().toISOString(),
    }));
  };

  // 2. Stage Assessment Handlers
  const handleUpdateAssessment = (newAssessment: HairStageAssessment) => {
    updateProfile((prev) => ({
      ...prev,
      currentStageAssessment: newAssessment,
      stageHistory: [...prev.stageHistory, newAssessment],
      lastUpdatedDate: new Date().toISOString(),
    }));
  };

  // 3. Daily Protocol Handlers
  const handleToggleProtocolItem = (itemId: string) => {
    const updatedItems = profile.dailyProtocol.todayItems.map((item) => {
      if (item.id === itemId) {
        const nowCompleted = !item.completed;
        const nowTime = nowCompleted
          ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : undefined;
        return { ...item, completed: nowCompleted, time: nowTime };
      }
      return item;
    });

    const allCompleted = updatedItems.every((i) => i.completed);
    let newStreak = profile.dailyProtocol.streak;
    if (allCompleted) {
      newStreak += 1;
      Alert.alert(
        "🎉 Daily Protocol Completed!",
        `Outstanding! You finished all regrowth steps today. Your streak is now ${newStreak} days! 🔥`
      );
    }

    updateProfile((prev) => ({
      ...prev,
      dailyProtocol: {
        ...prev.dailyProtocol,
        todayItems: updatedItems,
        streak: newStreak,
      },
      lastUpdatedDate: new Date().toISOString(),
    }));
  };

  // 4. Shedding Log Handlers
  const handleAddSheddingLog = (newLog: SheddingLog) => {
    updateProfile((prev) => ({
      ...prev,
      sheddingLogs: [...prev.sheddingLogs, newLog],
      lastUpdatedDate: new Date().toISOString(),
    }));
  };

  // Calculated stats
  const daysElapsed = calculateTreatmentDays(profile.treatmentStartDate);
  const completedProtocolCount = profile.dailyProtocol.todayItems.filter(
    (i) => i.completed
  ).length;
  const totalProtocolCount = profile.dailyProtocol.todayItems.length;
  const latestShedding =
    profile.sheddingLogs.length > 0
      ? profile.sheddingLogs[profile.sheddingLogs.length - 1]
      : null;

  return (
    <View style={styles.rootContainer}>
      {/* ── TOP APP NAVBAR ── */}
      <TopNavbar userName="User" />

      {/* ── SUBHEADER NAVIGATION ── */}
      <View style={styles.subHeaderNavRow}>
        <View style={styles.subHeaderLeft}>
          {!isUserPrimaryGoal && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(app)")}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerCategoryTitle}>Hair Restoration Hub</Text>
            <Text style={styles.headerSubtitle}>
              Trichology & Follicle Longevity OS
            </Text>
          </View>
        </View>
      </View>

      {/* ── HORIZONTAL CATEGORY FILTER TABS ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          <TouchableOpacity
            style={[styles.tabChip, activeTab === "all" && styles.tabChipActive]}
            onPress={() => setActiveTab("all")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="sparkles"
              size={13}
              color={activeTab === "all" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "all" && styles.tabChipTextActive,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === "journal" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("journal")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="images-outline"
              size={13}
              color={activeTab === "journal" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "journal" && styles.tabChipTextActive,
              ]}
            >
              Photo Journal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === "stage" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("stage")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="git-network-outline"
              size={13}
              color={activeTab === "stage" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "stage" && styles.tabChipTextActive,
              ]}
            >
              Norwood / Ludwig
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === "protocol" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("protocol")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkbox-outline"
              size={13}
              color={activeTab === "protocol" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "protocol" && styles.tabChipTextActive,
              ]}
            >
              Daily Protocol
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === "shedding" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("shedding")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="analytics-outline"
              size={13}
              color={activeTab === "shedding" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "shedding" && styles.tabChipTextActive,
              ]}
            >
              Shedding Log
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === "plans" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("plans")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="medkit-outline"
              size={13}
              color={activeTab === "plans" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "plans" && styles.tabChipTextActive,
              ]}
            >
              Doctor & Shop
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── MAIN SCROLLABLE CONTENT ── */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* COMPACT HAIR VITALS SUMMARY BAR */}
        {activeTab === "all" && (
          <View style={styles.quickVitalsBar}>
            {/* Treatment Day */}
            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>PROGRESSION</Text>
              <Text style={[styles.quickVitalVal, { color: "#EC4899" }]}>
                Day {daysElapsed}
              </Text>
            </View>

            <View style={styles.quickVitalDivider} />

            {/* Current Stage */}
            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>CLASSIFICATION</Text>
              <Text style={[styles.quickVitalVal, { color: "#8B5CF6" }]}>
                {profile.currentStageAssessment.selectedStage}
              </Text>
            </View>

            <View style={styles.quickVitalDivider} />

            {/* Daily Protocol Adherence */}
            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>PROTOCOL</Text>
              <Text style={[styles.quickVitalVal, { color: "#059669" }]}>
                {completedProtocolCount}/{totalProtocolCount} Done
              </Text>
            </View>

            <View style={styles.quickVitalDivider} />

            {/* Shedding Level */}
            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>SHEDDING</Text>
              <Text
                style={[
                  styles.quickVitalVal,
                  latestShedding?.sheddingLevel === "low"
                    ? { color: "#10B981" }
                    : latestShedding?.sheddingLevel === "heavy"
                    ? { color: "#EF4444" }
                    : { color: "#F59E0B" },
                ]}
              >
                {latestShedding?.sheddingLevel
                  ? latestShedding.sheddingLevel.toUpperCase()
                  : "NORMAL"}
              </Text>
            </View>
          </View>
        )}

        {/* 1. HAIR PROGRESSION PHOTO JOURNAL (BEFORE / AFTER SLIDER & GHOST CAMERA) */}
        {(activeTab === "all" || activeTab === "journal") && (
          <HairProgressionPhotoJournalCard
            photos={profile.photos}
            treatmentStartDate={profile.treatmentStartDate}
            onAddPhoto={handleAddPhoto}
            onDeletePhoto={handleDeletePhoto}
          />
        )}

        {/* 2. NORWOOD / LUDWIG HAIR LOSS STAGE ASSESSMENT */}
        {(activeTab === "all" || activeTab === "stage") && (
          <NorwoodLudwigAssessmentCard
            assessment={profile.currentStageAssessment}
            onUpdateAssessment={handleUpdateAssessment}
          />
        )}

        {/* 3. DAILY REGROWTH PROTOCOL TRACKER (WITH 10-MIN LLLT TIMER) */}
        {(activeTab === "all" || activeTab === "protocol") && (
          <DailyRegrowthProtocolCard
            items={profile.dailyProtocol.todayItems}
            streak={profile.dailyProtocol.streak}
            onToggleItem={handleToggleProtocolItem}
          />
        )}

        {/* 4. HAIR SHEDDING & DENSITY LOG */}
        {(activeTab === "all" || activeTab === "shedding") && (
          <HairSheddingDensityLogCard
            logs={profile.sheddingLogs}
            onAddLog={handleAddSheddingLog}
          />
        )}

        {/* 5. CLINICAL CONSULTATION & HAIR RESTORATION PRODUCTS */}
        {(activeTab === "all" || activeTab === "plans") && (
          <CategoryCards
            categoryTitle="Hair Treatment & Hair Care"
            categoryTagline="Dermatological therapies, follicle density log & medical hair restoration solutions."
            consultationSubtitle="Schedule a 1-on-1 virtual consultation with leading trichologists & hair restoration surgeons."
            productsSubtitle="Purchase medical-grade hair growth serums (Minoxidil 5%), LLLT caps & follicular vitamin complexes."
            accentColor="#EC4899"
            consultationIcon="sparkles"
            productsIcon="cart"
            treatmentPlans={HAIR_TREATMENT_PLANS}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── 2-TAB BOTTOM NAVIGATION (IF USER PRIMARY GOAL) ── */}
      {isUserPrimaryGoal && (
        <VerticalGoalBottomNav goal={goalInfo} activeTab="goal" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  subHeaderNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  subHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  backButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerTitleWrap: {},
  headerCategoryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  tabsWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 8,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabChipActive: {
    backgroundColor: "#EC4899",
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 14,
    paddingBottom: 24,
  },
  quickVitalsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickVitalItem: {
    alignItems: "center",
    flex: 1,
  },
  quickVitalLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  quickVitalVal: {
    fontSize: 12,
    fontWeight: "800",
  },
  quickVitalDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#F1F5F9",
  },
});
