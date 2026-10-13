import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { CategoryCards } from "@/components/CategoryCards";
import { VerticalGoalBottomNav } from "@/components/dashboard/VerticalGoalBottomNav";
import { getPrimaryGoalInfo, fetchUserPrimaryGoal } from "@/lib/primaryGoal";
import { supabase } from "@/lib/supabase";

const HAIR_TREATMENT_PLANS = [
  "Hair-loss assessment",
  "AI scalp analysis",
  "Medical hair restoration",
  "Hair PRP",
  "Transplant consultation",
  "Nutrition and hormonal evaluation",
];

export default function HairTreatmentScreen() {
  const [isUserPrimaryGoal, setIsUserPrimaryGoal] = useState(false);
  const goalInfo = getPrimaryGoalInfo("Hair Treatment");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const goal = await fetchUserPrimaryGoal(session.user.id);
        const isGoal =
          !!goal &&
          (goal.toLowerCase().includes("hair") ||
            goal.toLowerCase().includes("hai"));
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
        <Text style={styles.headerCategoryTitle}>Hair Treatment</Text>
        {isUserPrimaryGoal ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(app)/dashboard/profile")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color="#EC4899" />
            <Text style={[styles.backButtonText, { color: "#EC4899" }]}>Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 8 }} />
        )}
      </View>
      <CategoryCards
        categoryTitle="Hair Treatment & Hair Care"
        categoryTagline="Dermatological therapies, hair density log & hair restoration solutions."
        consultationSubtitle="Schedule a 1-on-1 virtual consultation with leading trichologists & hair restoration specialists."
        productsSubtitle="Purchase medical-grade hair growth serums, scalp treatments & hair vitamin complexes."
        accentColor="#EC4899"
        consultationIcon="sparkles"
        productsIcon="cart"
        treatmentPlans={HAIR_TREATMENT_PLANS}
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
    color: "#EC4899",
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
