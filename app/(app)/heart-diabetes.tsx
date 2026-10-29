// app/(app)/heart-diabetes.tsx
// Comprehensive Heart & Diabetes Clinical Specialty Care Hub

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
  HeartDiabetesProfile,
  DEFAULT_HEART_DIABETES_PROFILE,
  loadHeartDiabetesProfile,
  saveHeartDiabetesProfile,
  evaluateGlucose,
  classifyBloodPressure,
  calculateMAP,
  GlucoseLog,
  BloodPressureLog,
  HbA1cGoalData,
  CardioRiskFactors,
  MedicationReminder,
  scheduleMedicationNotification,
  cancelMedicationNotification,
} from "@/lib/heartDiabetes";

import { BloodGlucoseTrackerCard } from "@/components/heartDiabetes/BloodGlucoseTrackerCard";
import { BloodPressureLogCard } from "@/components/heartDiabetes/BloodPressureLogCard";
import { HbA1cCardioRiskCard } from "@/components/heartDiabetes/HbA1cCardioRiskCard";
import { MedicationInsulinTimersCard } from "@/components/heartDiabetes/MedicationInsulinTimersCard";

const HEART_DIABETES_PLANS = [
  "Blood pressure",
  "Cholesterol",
  "Diabetes",
  "ECG and cardiac testing",
  "Continuous glucose monitoring",
  "Cardiology consultation",
  "Lifestyle-risk reduction",
];

type ActiveTab = "all" | "glucose" | "bp" | "hba1c" | "meds" | "plans";

export default function HeartDiabetesScreen() {
  const [profile, setProfile] = useState<HeartDiabetesProfile>(
    DEFAULT_HEART_DIABETES_PROFILE,
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [isUserPrimaryGoal, setIsUserPrimaryGoal] = useState(false);
  const goalInfo = getPrimaryGoalInfo("Heart & Diabetes");

  useEffect(() => {
    async function init() {
      const data = await loadHeartDiabetesProfile();
      setProfile(data);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const goal = await fetchUserPrimaryGoal(session.user.id);
        const isGoal =
          !!goal &&
          (goal.toLowerCase().includes("heart") ||
            goal.toLowerCase().includes("diabetes"));
        setIsUserPrimaryGoal(isGoal);
      }
    }
    init();
  }, []);

  // Update helper
  const updateProfile = (nextProfile: HeartDiabetesProfile) => {
    setProfile(nextProfile);
    saveHeartDiabetesProfile(nextProfile);
  };

  // 1. GLUCOSE LOGGING
  const handleAddGlucoseLog = (newLog: Omit<GlucoseLog, "id" | "zone">) => {
    const zoneInfo = evaluateGlucose(newLog.value, newLog.context);
    const logItem: GlucoseLog = {
      ...newLog,
      id: `gl-${Date.now()}`,
      zone: zoneInfo.zone,
    };
    const updatedLogs = [logItem, ...profile.glucoseLogs];
    updateProfile({
      ...profile,
      glucoseLogs: updatedLogs,
    });
    Alert.alert(
      "Glucose Reading Logged",
      `${newLog.value} mg/dL (${newLog.context === "fasting" ? "Fasting" : "Post-Meal"}) recorded. Status: ${zoneInfo.label}.`,
    );
  };

  const handleDeleteGlucoseLog = (id: string) => {
    const updatedLogs = profile.glucoseLogs.filter((l) => l.id !== id);
    updateProfile({
      ...profile,
      glucoseLogs: updatedLogs,
    });
  };

  // 2. BLOOD PRESSURE LOGGING
  const handleAddBPLog = (
    newLog: Omit<
      BloodPressureLog,
      "id" | "meanArterialPressure" | "classification"
    >,
  ) => {
    const map = calculateMAP(newLog.systolic, newLog.diastolic);
    const classificationInfo = classifyBloodPressure(
      newLog.systolic,
      newLog.diastolic,
    );

    const bpItem: BloodPressureLog = {
      ...newLog,
      id: `bp-${Date.now()}`,
      meanArterialPressure: map,
      classification: classificationInfo.classification,
    };

    const updatedBP = [bpItem, ...profile.bpLogs];
    updateProfile({
      ...profile,
      bpLogs: updatedBP,
    });

    Alert.alert(
      "Blood Pressure Logged",
      `${newLog.systolic}/${newLog.diastolic} mmHg (Pulse: ${newLog.pulse} bpm) recorded. Status: ${classificationInfo.label}.`,
    );
  };

  const handleDeleteBPLog = (id: string) => {
    const updatedBP = profile.bpLogs.filter((b) => b.id !== id);
    updateProfile({
      ...profile,
      bpLogs: updatedBP,
    });
  };

  // 3. HbA1c & CARDIO RISK
  const handleUpdateHbA1cGoal = (updated: Partial<HbA1cGoalData>) => {
    const updatedGoal = {
      ...profile.hba1cGoal,
      ...updated,
    };
    updateProfile({
      ...profile,
      hba1cGoal: updatedGoal,
    });
    Alert.alert(
      "HbA1c Updated",
      `Latest HbA1c set to ${updatedGoal.currentHbA1c}%. Target: ${updatedGoal.targetHbA1c}%.`,
    );
  };

  const handleUpdateCardioFactors = (factors: CardioRiskFactors) => {
    updateProfile({
      ...profile,
      cardioRiskFactors: factors,
    });
    Alert.alert(
      "Cardiovascular Risk Updated",
      "Risk assessment recalculated successfully.",
    );
  };

  // 4. MEDICATIONS & INSULIN
  const handleToggleMedTaken = (id: string) => {
    const updatedMeds = profile.medications.map((m) => {
      if (m.id === id) {
        const nextTaken = !m.takenToday;
        return {
          ...m,
          takenToday: nextTaken,
          lastTakenTimestamp: nextTaken ? new Date().toISOString() : undefined,
          streakDays: nextTaken
            ? m.streakDays + 1
            : Math.max(0, m.streakDays - 1),
        };
      }
      return m;
    });

    updateProfile({
      ...profile,
      medications: updatedMeds,
    });
  };

  const handleAddMedication = async (
    newMed: Omit<MedicationReminder, "id" | "takenToday" | "streakDays">,
  ) => {
    const medItem: MedicationReminder = {
      ...newMed,
      id: `med-${Date.now()}`,
      takenToday: false,
      streakDays: 0,
    };

    if (medItem.reminderEnabled) {
      await scheduleMedicationNotification(medItem);
    }

    const updatedMeds = [...profile.medications, medItem];
    updateProfile({
      ...profile,
      medications: updatedMeds,
    });

    Alert.alert(
      "Medication Added",
      `${medItem.name} (${medItem.dosage}) added to your daily schedule.`,
    );
  };

  const handleToggleMedReminder = async (id: string, enabled: boolean) => {
    const targetMed = profile.medications.find((m) => m.id === id);
    if (!targetMed) return;

    if (enabled) {
      await scheduleMedicationNotification(targetMed);
    } else {
      await cancelMedicationNotification(id);
    }

    const updatedMeds = profile.medications.map((m) =>
      m.id === id ? { ...m, reminderEnabled: enabled } : m,
    );

    updateProfile({
      ...profile,
      medications: updatedMeds,
    });
  };

  const handleDeleteMedication = async (id: string) => {
    await cancelMedicationNotification(id);
    const updatedMeds = profile.medications.filter((m) => m.id !== id);
    updateProfile({
      ...profile,
      medications: updatedMeds,
    });
  };

  // Quick summary numbers for top strip
  const latestGlucose = profile.glucoseLogs[0]?.value || 95;
  const latestBP = profile.bpLogs[0] || { systolic: 120, diastolic: 80 };
  const currentHbA1c = profile.hba1cGoal.currentHbA1c;
  const medsDone = profile.medications.filter((m) => m.takenToday).length;
  const medsTotal = profile.medications.length;

  return (
    <View style={styles.rootContainer}>
      <TopNavbar userName="User" />

      {/* SUBHEADER NAVIGATION: Left Aligned Title */}
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
          <Text style={styles.headerCategoryTitle}>Heart & Diabetes</Text>
        </View>
        {isUserPrimaryGoal && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(app)/dashboard/profile")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color="#E11D48" />
            <Text style={[styles.backButtonText, { color: "#E11D48" }]}>
              Profile
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* HORIZONTAL CLINICAL MODULE TAB SELECTOR */}
      <View style={styles.tabScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === "all" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("all")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="grid-outline"
              size={13}
              color={activeTab === "all" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "all" && styles.tabChipTextActive,
              ]}
            >
              All Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === "glucose" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("glucose")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="water-outline"
              size={13}
              color={activeTab === "glucose" ? "#FFFFFF" : "#E11D48"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "glucose" && styles.tabChipTextActive,
              ]}
            >
              Blood Sugar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === "bp" && styles.tabChipActive]}
            onPress={() => setActiveTab("bp")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="pulse-outline"
              size={13}
              color={activeTab === "bp" ? "#FFFFFF" : "#0284C7"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "bp" && styles.tabChipTextActive,
              ]}
            >
              BP & Pulse
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === "hba1c" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("hba1c")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="ribbon-outline"
              size={13}
              color={activeTab === "hba1c" ? "#FFFFFF" : "#7C3AED"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "hba1c" && styles.tabChipTextActive,
              ]}
            >
              HbA1c & Risk
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === "meds" && styles.tabChipActive,
            ]}
            onPress={() => setActiveTab("meds")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="alarm-outline"
              size={13}
              color={activeTab === "meds" ? "#FFFFFF" : "#059669"}
            />
            <Text
              style={[
                styles.tabChipText,
                activeTab === "meds" && styles.tabChipTextActive,
              ]}
            >
              Meds & Insulin
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

      {/* MAIN CLINICAL SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP COMPACT VITALS OVERVIEW BAR (In All Overview mode) */}
        {activeTab === "all" && (
          <View style={styles.quickVitalsBar}>
            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>GLUCOSE</Text>
              <Text style={[styles.quickVitalVal, { color: "#E11D48" }]}>
                {latestGlucose} <Text style={styles.quickVitalUnit}>mg/dL</Text>
              </Text>
            </View>

            <View style={styles.quickVitalDivider} />

            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>BLOOD PRESSURE</Text>
              <Text style={[styles.quickVitalVal, { color: "#0284C7" }]}>
                {latestBP.systolic}/{latestBP.diastolic}
              </Text>
            </View>

            <View style={styles.quickVitalDivider} />

            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>HbA1c</Text>
              <Text style={[styles.quickVitalVal, { color: "#7C3AED" }]}>
                {currentHbA1c}%
              </Text>
            </View>

            <View style={styles.quickVitalDivider} />

            <View style={styles.quickVitalItem}>
              <Text style={styles.quickVitalLabel}>TODAY'S MEDS</Text>
              <Text style={[styles.quickVitalVal, { color: "#059669" }]}>
                {medsTotal > 0 ? `${medsDone}/${medsTotal}` : "—"}
              </Text>
            </View>
          </View>
        )}

        {/* 1. BLOOD GLUCOSE TRACKER */}
        {(activeTab === "all" || activeTab === "glucose") && (
          <BloodGlucoseTrackerCard
            logs={profile.glucoseLogs}
            onAddLog={handleAddGlucoseLog}
            onDeleteLog={handleDeleteGlucoseLog}
          />
        )}

        {/* 2. BLOOD PRESSURE & PULSE LOG WITH WEEKLY MAP TREND CHART */}
        {(activeTab === "all" || activeTab === "bp") && (
          <BloodPressureLogCard
            logs={profile.bpLogs}
            onAddLog={handleAddBPLog}
            onDeleteLog={handleDeleteBPLog}
          />
        )}

        {/* 3. 90-DAY HbA1c GOAL & CARDIOVASCULAR RISK SCORE */}
        {(activeTab === "all" || activeTab === "hba1c") && (
          <HbA1cCardioRiskCard
            goalData={profile.hba1cGoal}
            cardioFactors={profile.cardioRiskFactors}
            onUpdateGoal={handleUpdateHbA1cGoal}
            onUpdateFactors={handleUpdateCardioFactors}
          />
        )}

        {/* 4. MEDICATION & INSULIN TIMERS */}
        {(activeTab === "all" || activeTab === "meds") && (
          <MedicationInsulinTimersCard
            medications={profile.medications}
            onToggleTaken={handleToggleMedTaken}
            onAddMedication={handleAddMedication}
            onToggleReminder={handleToggleMedReminder}
            onDeleteMedication={handleDeleteMedication}
          />
        )}

        {/* 5. CARE PLANS, 1-ON-1 DOCTOR SESSION & CLINICAL PRODUCTS */}
        {(activeTab === "all" || activeTab === "plans") && (
          <View style={styles.categoryCardsSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="shield-checkmark" size={16} color="#E11D48" />
              <Text style={styles.sectionHeaderText}>
                Doctor Consultations & Medical Devices
              </Text>
            </View>
            <CategoryCards
              categoryTitle="Heart & Diabetes"
              categoryTagline="Specialized cardiovascular & metabolic wellness care plans."
              consultationSubtitle="Schedule a 1-on-1 consultation with expert cardiologists & endocrinologists for blood sugar & heart management."
              productsSubtitle="Order clinically-approved continuous glucose monitors, blood pressure cuffs & metabolic supplements."
              accentColor="#E11D48"
              consultationIcon="pulse"
              productsIcon="cart"
              treatmentPlans={HEART_DIABETES_PLANS}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* BOTTOM NAV FOR USER WHOSE PRIMARY GOAL IS HEART & DIABETES */}
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
    gap: 10,
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerCategoryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#E11D48",
    textAlign: "left",
  },
  tabScrollWrap: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 8,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabChipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
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
    alignItems: "center",
    flex: 1,
  },
  quickVitalLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  quickVitalVal: {
    fontSize: 14,
    fontWeight: "900",
  },
  quickVitalUnit: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
  },
  quickVitalDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
  categoryCardsSection: {
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
});
