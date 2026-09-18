import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { CategoryCards } from "@/components/CategoryCards";
import { LONGEVITY_SECTIONS } from "@/constants/longevityPlans";

export default function LongevityScreen() {
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
        <Text style={styles.headerCategoryTitle}>Longevity</Text>
      </View>
      <CategoryCards
        categoryTitle="Longevity & Anti-Aging"
        categoryTagline="Cellular health, bio-age optimization & anti-aging medicine."
        consultationSubtitle="Meet longevity experts for biological age analysis & anti-aging biomarker planning."
        productsSubtitle="Explore NMN/NAD+ boosters, resveratrol, senolytics & cellular health supplements."
        accentColor="#4F46E5"
        consultationIcon="fitness"
        productsIcon="cart"
        structuredSections={LONGEVITY_SECTIONS}
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
    color: "#4F46E5",
  },
});
