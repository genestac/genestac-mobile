// app/(app)/skin-laser-treatment.tsx
// Comprehensive Skin & Laser Specialty Care Hub
// Healing Recovery Timeline, AM/PM Skincare Routine Checklist & Fitzpatrick Barrier Quiz

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
  SkinLaserProfile,
  DEFAULT_SKIN_LASER_PROFILE,
  loadSkinLaserProfile,
  saveSkinLaserProfile,
  LaserSession,
  LaserTreatmentType,
  SkincareStep,
  FitzpatrickSkinData,
} from "@/lib/skinLaser";

import { PostLaserHealingCard } from "@/components/skinLaser/PostLaserHealingCard";
import { AmPmSkincareRoutineCard } from "@/components/skinLaser/AmPmSkincareRoutineCard";
import { FitzpatrickBarrierQuizCard } from "@/components/skinLaser/FitzpatrickBarrierQuizCard";

const SKIN_LASER_TREATMENT_PLANS = [
  "AI skin analysis",
  "Acne and pigmentation",
  "Anti-ageing and rejuvenation",
  "Botox and fillers",
  "Lasers and skin tightening",
  "Scars and stretch marks",
  "Post-weight-loss facial and body restoration",
];

type ActiveTab = "all" | "healing" | "routine" | "quiz" | "plans";

export default function SkinLaserTreatmentScreen() {
  const [profile, setProfile] = useState<SkinLaserProfile>(
    DEFAULT_SKIN_LASER_PROFILE
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [isUserPrimaryGoal, setIsUserPrimaryGoal] = useState<boolean>(false);
  const goalInfo = getPrimaryGoalInfo("Skin Laser Treatment");

  useEffect(() => {
    async function init() {
      const data = await loadSkinLaserProfile();
      setProfile(data);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const goal = await fetchUserPrimaryGoal(session.user.id);
        const isGoal =
          !!goal &&
          (goal.toLowerCase().includes("skin") ||
            goal.toLowerCase().includes("laser"));
        setIsUserPrimaryGoal(isGoal);
      }
    }
    init();
  }, []);

  // Update & persist helper
  const updateProfile = (nextProfile: SkinLaserProfile) => {
    setProfile(nextProfile);
    saveSkinLaserProfile(nextProfile);
  };

  // 1. LASER HEALING TIMELINE HANDLERS
  const handleUpdateSession = (updated: Partial<LaserSession>) => {
    const updatedSession = {
      ...profile.laserSession,
      ...updated,
    };
    updateProfile({
      ...profile,
      laserSession: updatedSession,
    });
  };

  const handleResetSession = (
    laserType: LaserTreatmentType,
    sessionDate: string
  ) => {
    const newSession: LaserSession = {
      isActive: true,
      laserType,
      sessionDate,
      currentDay: 1,
      comfortLevel: 3,
      notes: `Started new ${laserType} recovery protocol on ${new Date().toLocaleDateString()}.`,
    };
    updateProfile({
      ...profile,
      laserSession: newSession,
    });
  };

  const handleToggleChecklist = (id: string) => {
    const updatedChecklists = profile.checklists.map((c) =>
      c.id === id ? { ...c, completed: !c.completed } : c
    );
    updateProfile({
      ...profile,
      checklists: updatedChecklists,
    });
  };

  // 2. AM / PM SKINCARE ROUTINE HANDLERS
  const handleToggleRoutineStep = (stepId: string, category: "AM" | "PM") => {
    const isAm = category === "AM";
    const targetSteps = isAm ? profile.routine.amSteps : profile.routine.pmSteps;
    const updatedSteps = targetSteps.map((s) =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );

    // Check if all steps in this category are completed to update streak
    const allDone = updatedSteps.every((s) => s.completed);
    let newStreak = profile.routine.streakDays;
    if (allDone) {
      newStreak += 1;
      Alert.alert(
        "🎉 Routine Completed!",
        `You completed all ${category} skincare steps! Streak increased to ${newStreak} days.`
      );
    }

    const updatedRoutine = {
      ...profile.routine,
      amSteps: isAm ? updatedSteps : profile.routine.amSteps,
      pmSteps: !isAm ? updatedSteps : profile.routine.pmSteps,
      streakDays: newStreak,
    };

    updateProfile({
      ...profile,
      routine: updatedRoutine,
    });
  };

  const handleAddRoutineStep = (
    step: Omit<SkincareStep, "id" | "stepNumber" | "completed">
  ) => {
    const isAm = step.category === "AM";
    const targetSteps = isAm ? profile.routine.amSteps : profile.routine.pmSteps;
    const newStepItem: SkincareStep = {
      ...step,
      id: `${step.category.toLowerCase()}-${Date.now()}`,
      stepNumber: targetSteps.length + 1,
      completed: false,
    };

    const updatedSteps = [...targetSteps, newStepItem];
    const updatedRoutine = {
      ...profile.routine,
      amSteps: isAm ? updatedSteps : profile.routine.amSteps,
      pmSteps: !isAm ? updatedSteps : profile.routine.pmSteps,
    };

    updateProfile({
      ...profile,
      routine: updatedRoutine,
    });
    Alert.alert("Step Added", `${step.name} added to ${step.category} routine.`);
  };

  const handleResetRoutine = (category: "AM" | "PM") => {
    const isAm = category === "AM";
    const targetSteps = isAm ? profile.routine.amSteps : profile.routine.pmSteps;
    const resetSteps = targetSteps.map((s) => ({ ...s, completed: false }));

    const updatedRoutine = {
      ...profile.routine,
      amSteps: isAm ? resetSteps : profile.routine.amSteps,
      pmSteps: !isAm ? resetSteps : profile.routine.pmSteps,
    };

    updateProfile({
      ...profile,
      routine: updatedRoutine,
    });
  };

  // 4. FITZPATRICK & BARRIER QUIZ HANDLER
  const handleUpdateFitzpatrick = (updated: FitzpatrickSkinData) => {
    updateProfile({
      ...profile,
      fitzpatrick: updated,
    });
  };

  // Quick Overview Stats
  const healingStageName =
    profile.laserSession.currentDay === 1
      ? "Day 1 (Redness)"
      : profile.laserSession.currentDay === 3
      ? "Day 3 (Peeling)"
      : profile.laserSession.currentDay === 7
      ? "Day 7 (Glowing)"
      : `Day ${profile.laserSession.currentDay}`;

  const amDoneCount = profile.routine.amSteps.filter((s) => s.completed).length;
  const amTotalCount = profile.routine.amSteps.length;

  return (
    <View style={styles.rootContainer}>
      {/* ── TOP APP NAVBAR ── */}
      <TopNavbar userName="User" />

      {/* ── SUBHEADER NAVIGATION: Left Aligned ── */}
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
            <Text style={styles.headerCategoryTitle}>Skin & Laser Care</Text>
            <Text style={styles.headerSubtitle}>
              Aesthetic Dermatology • Recovery & Barrier Care
            </Text>
          </View>
        </View>

        {isUserPrimaryGoal && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(app)/dashboard/profile")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color="#0284C7" />
            <Text style={[styles.backButtonText, { color: "#0284C7" }]}>Profile</Text>
          </TouchableOpacity>
        )}
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
              activeTab === "healing" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("healing")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="bandage-outline"
              size={13}
              color={activeTab === "healing" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "healing" && styles.tabChipTextActive,
              ]}
            >
              Laser Healing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === "routine" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("routine")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="list-outline"
              size={13}
              color={activeTab === "routine" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "routine" && styles.tabChipTextActive,
              ]}
            >
              AM/PM Routine
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === "quiz" && styles.tabChipActive]}
            onPress={() => setActiveTab("quiz")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="finger-print-outline"
              size={13}
              color={activeTab === "quiz" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "quiz" && styles.tabChipTextActive,
              ]}
            >
              Skin Type & Barrier
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
        {/* COMPACT SKIN VITALS OVERVIEW BAR (In All Overview Mode) */}
        {activeTab === "all" && (
          <View style={styles.quickVitalsBar}>
            {/* Healing */}
            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>HEALING</Text>
              <Text style={[styles.quickVitalVal, { color: "#E11D48" }]}>
                {healingStageName}
              </Text>
            </View>

            <View style={styles.quickVitalDivider} />

            {/* Routine */}
            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>AM ROUTINE</Text>
              <Text style={[styles.quickVitalVal, { color: "#0D9488" }]}>
                {amDoneCount}/{amTotalCount} Done
              </Text>
            </View>

            <View style={styles.quickVitalDivider} />

            {/* Barrier */}
            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>BARRIER</Text>
              <Text style={[styles.quickVitalVal, { color: "#059669" }]}>
                {profile.fitzpatrick.barrierHealthScore}%
              </Text>
            </View>
          </View>
        )}

        {/* 1. POST-LASER HEALING & RECOVERY TRACKER */}
        {(activeTab === "all" || activeTab === "healing") && (
          <PostLaserHealingCard
            session={profile.laserSession}
            checklists={profile.checklists}
            onUpdateSession={handleUpdateSession}
            onToggleChecklist={handleToggleChecklist}
            onResetSession={handleResetSession}
          />
        )}

        {/* 2. AM / PM SKINCARE ROUTINE CHECKLIST */}
        {(activeTab === "all" || activeTab === "routine") && (
          <AmPmSkincareRoutineCard
            routine={profile.routine}
            onToggleStep={handleToggleRoutineStep}
            onAddStep={handleAddRoutineStep}
            onResetRoutine={handleResetRoutine}
          />
        )}

        {/* 3. FITZPATRICK SKIN TYPE & BARRIER HEALTH QUIZ */}
        {(activeTab === "all" || activeTab === "quiz") && (
          <FitzpatrickBarrierQuizCard
            fitzpatrick={profile.fitzpatrick}
            onUpdateFitzpatrick={handleUpdateFitzpatrick}
          />
        )}

        {/* 4. CARE PLANS, 1-ON-1 DOCTOR SESSION & CLINICAL PRODUCTS */}
        {(activeTab === "all" || activeTab === "plans") && (
          <View style={styles.categoryCardsSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
              <Text style={styles.sectionHeaderText}>
                Doctor Consultations & Medical Skincare
              </Text>
            </View>
            <CategoryCards
              categoryTitle="Skin Laser Treatment"
              categoryTagline="Advanced skincare, laser resurfacing & aesthetic dermatological care."
              consultationSubtitle="Book a consultation with certified laser dermatologists for skin resurfacing & rejuvenation."
              productsSubtitle="Purchase post-laser healing creams, soothing gels & clinical sunscreen protection packs."
              accentColor="#0284C7"
              consultationIcon="sparkles"
              productsIcon="cart"
              treatmentPlans={SKIN_LASER_TREATMENT_PLANS}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* ── BOTTOM NAV FOR USER WHOSE PRIMARY GOAL IS SKIN LASER ── */}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  subHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTitleWrap: {
    alignItems: "flex-start",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  headerCategoryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "left",
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 1,
    textAlign: "left",
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabChipActive: {
    backgroundColor: "#0284C7",
    borderColor: "#0284C7",
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  quickVitalsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickVitalItem: {
    flex: 1,
    alignItems: "center",
  },
  quickVitalLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  quickVitalVal: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  quickVitalDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#E2E8F0",
  },
  categoryCardsSection: {
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
});
