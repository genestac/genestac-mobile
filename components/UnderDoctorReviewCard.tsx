import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HealthProfile } from "@/lib/types";

interface UnderDoctorReviewCardProps {
  healthProfile?: HealthProfile;
  onEditProfile?: () => void;
}

export const UnderDoctorReviewCard: React.FC<UnderDoctorReviewCardProps> = ({
  healthProfile,
  onEditProfile,
}) => {
  return (
    <View style={styles.cardContainer}>
      {/* Status Badge */}
      <View style={styles.badgeRow}>
        <View style={styles.pendingBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.pendingBadgeText}>UNDER DOCTOR REVIEW</Text>
        </View>
        <Text style={styles.timeEst}>Est. 12-24 Hrs</Text>
      </View>

      {/* Hero Header */}
      <View style={styles.iconCenterRow}>
        <View style={styles.iconCircleBig}>
          <Ionicons name="medical-outline" size={32} color="#D97706" />
        </View>
      </View>

      <Text style={styles.mainTitle}>Your Custom Plan is Being Reviewed</Text>
      <Text style={styles.subDescription}>
        Our medical team & certified nutritionist are evaluating your AI-generated diet and exercise plan to ensure complete clinical safety and metabolic optimization.
      </Text>

      {/* Info Banner Box */}
      <View style={styles.infoBox}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBoxTitle}>Doctor Safety Protocol</Text>
            <Text style={styles.infoBoxText}>
              Every plan is vetted against your health conditions, allergies, and weight goals before release.
            </Text>
          </View>
        </View>
      </View>

      {/* Health Profile Summary */}
      {healthProfile && (
        <View style={styles.profileSummaryCard}>
          <View style={styles.profileHeaderRow}>
            <Text style={styles.profileSectionTitle}>Submitted Health Profile</Text>
            {onEditProfile && (
              <TouchableOpacity onPress={onEditProfile} style={styles.editBtn}>
                <Ionicons name="pencil" size={12} color="#2563EB" />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.profileGrid}>
            <View style={styles.profileTag}>
              <Text style={styles.profileTagLabel}>Goal</Text>
              <Text style={styles.profileTagVal}>{healthProfile.primaryGoal || "Weight Loss"}</Text>
            </View>

            <View style={styles.profileTag}>
              <Text style={styles.profileTagLabel}>Diet</Text>
              <Text style={styles.profileTagVal}>{healthProfile.dietaryPreference || "Vegetarian"}</Text>
            </View>

            <View style={styles.profileTag}>
              <Text style={styles.profileTagLabel}>Activity</Text>
              <Text style={styles.profileTagVal}>{healthProfile.activityLevel || "Moderately Active"}</Text>
            </View>

            <View style={styles.profileTag}>
              <Text style={styles.profileTagLabel}>Weight</Text>
              <Text style={styles.profileTagVal}>{healthProfile.weightKg || 70} kg</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D97706",
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
    letterSpacing: 0.5,
  },
  timeEst: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  iconCenterRow: {
    alignItems: "center",
    marginVertical: 8,
  },
  iconCircleBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginTop: 10,
  },
  subDescription: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
  },
  infoBoxText: {
    fontSize: 12,
    color: "#1E3A8A",
    marginTop: 2,
    lineHeight: 17,
  },
  profileSummaryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  profileHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  profileSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileTag: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  profileTagLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
    textTransform: "uppercase",
  },
  profileTagVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 2,
  },
  demoApproveBtn: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  demoApproveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default UnderDoctorReviewCard;
