import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { CategoryCards } from "@/components/CategoryCards";

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
  return (
    <View style={styles.rootContainer}>
      <TopNavbar userName="User" />
      <View style={styles.subHeaderNavRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(app)")}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerCategoryTitle}>Skin Laser Treatment</Text>
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
