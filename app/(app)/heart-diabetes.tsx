import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { CategoryCards } from "@/components/CategoryCards";

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
        <Text style={styles.headerCategoryTitle}>Heart & Diabetes</Text>
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
