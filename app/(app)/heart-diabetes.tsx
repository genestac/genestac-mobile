import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { CategoryCards } from "@/components/CategoryCards";
import { VerticalGoalBottomNav } from "@/components/dashboard/VerticalGoalBottomNav";
import { getPrimaryGoalInfo, fetchUserPrimaryGoal } from "@/lib/primaryGoal";
import { supabase } from "@/lib/supabase";

const HEART_DIABETES_PLANS = [
  "Blood pressure",
  "Cholesterol",
  "Diabetes",
  "ECG and cardiac testing",
  "Continuous glucose monitoring",
  "Cardiology consultation",
  "Lifestyle-risk reduction",
];

export default function HeartDiabetesScreen() {
  const [isUserPrimaryGoal, setIsUserPrimaryGoal] = useState(false);
  const goalInfo = getPrimaryGoalInfo("Heart & Diabetes");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const goal = await fetchUserPrimaryGoal(session.user.id);
        const isGoal =
          !!goal &&
          (goal.toLowerCase().includes("heart") ||
            goal.toLowerCase().includes("diabetes"));
        setIsUserPrimaryGoal(isGoal);
      }
    });
  }, []);

  return (
    <View style={styles.rootContainer}>
      <TopNavbar userName="User" />
      <View style={styles.subHeaderNavRow}>
        {!isUserPrimaryGoal ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(app)")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 8 }} />
        )}
        <Text style={styles.headerCategoryTitle}>Heart & Diabetes</Text>
        {isUserPrimaryGoal ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(app)/dashboard/profile")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color="#E11D48" />
            <Text style={[styles.backButtonText, { color: "#E11D48" }]}>Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 8 }} />
        )}
      </View>
      <CategoryCards
        categoryTitle="Heart & Diabetes"
        categoryTagline="Specialized cardiovascular & metabolic wellness care plans."
        consultationSubtitle="Schedule a 1-on-1 consultation with expert doctors for blood sugar & heart management."
        productsSubtitle="Order clinically-approved continuous glucose monitors, blood pressure cuffs & metabolic supplements."
        accentColor="#E11D48"
        consultationIcon="pulse"
        productsIcon="cart"
        treatmentPlans={HEART_DIABETES_PLANS}
      />
      {isUserPrimaryGoal && (
        <VerticalGoalBottomNav goal={goalInfo} activeTab="goal" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: "#F8FAFC" },
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
    fontSize: 14,
    fontWeight: "800",
    color: "#E11D48",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
});
