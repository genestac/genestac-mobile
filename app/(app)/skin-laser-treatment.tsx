import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { CategoryCards } from "@/components/CategoryCards";
import { VerticalGoalBottomNav } from "@/components/dashboard/VerticalGoalBottomNav";
import { getPrimaryGoalInfo, fetchUserPrimaryGoal } from "@/lib/primaryGoal";
import { supabase } from "@/lib/supabase";

const SKIN_LASER_TREATMENT_PLANS = [
  "AI skin analysis",
  "Acne and pigmentation",
  "Anti-ageing and rejuvenation",
  "Botox and fillers",
  "Lasers and skin tightening",
  "Scars and stretch marks",
  "Post-weight-loss facial and body restoration",
];

export default function SkinLaserTreatmentScreen() {
  const [isUserPrimaryGoal, setIsUserPrimaryGoal] = useState(false);
  const goalInfo = getPrimaryGoalInfo("Skin Laser Treatment");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const goal = await fetchUserPrimaryGoal(session.user.id);
        const isGoal =
          !!goal &&
          (goal.toLowerCase().includes("skin") ||
            goal.toLowerCase().includes("laser"));
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
        <Text style={styles.headerCategoryTitle}>Skin Laser Treatment</Text>
        {isUserPrimaryGoal ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(app)/dashboard/profile")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color="#0284C7" />
            <Text style={[styles.backButtonText, { color: "#0284C7" }]}>Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 8 }} />
        )}
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
    color: "#0284C7",
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
