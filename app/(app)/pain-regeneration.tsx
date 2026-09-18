import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { CategoryCards } from "@/components/CategoryCards";

const PAIN_REGENERATION_PLANS = [
  "Knee and joint pain",
  "Back and neck pain",
  "Sports injuries",
  "Arthritis",
  "Physiotherapy",
  "PRP and approved regenerative procedures",
  "Post-surgical rehabilitation",
];

export default function PainRegenerationScreen() {
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
        <Text style={styles.headerCategoryTitle}>Pain & Regeneration</Text>
      </View>
      <CategoryCards
        categoryTitle="Pain & Regenerative"
        categoryTagline="Joint relief, stem cell therapy & tissue regeneration strategies."
        consultationSubtitle="Book a consultation with pain management specialists & orthopedic regenerative doctors."
        productsSubtitle="Shop collagen peptides, joint recovery formulas, topical gels & support braces."
        accentColor="#DC2626"
        consultationIcon="medkit"
        productsIcon="cart"
        treatmentPlans={PAIN_REGENERATION_PLANS}
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
    color: "#DC2626",
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
