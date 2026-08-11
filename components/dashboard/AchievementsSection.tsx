import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export interface AchievementBadge {
  id: string;
  thresholdKg: number;
  title: string;
  subtitle: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Legend";
  iconName: keyof typeof Ionicons.glyphMap;
  badgeBg: string;
  iconColor: string;
  borderColor: string;
  tierBg: string;
  tierTextColor: string;
  description: string;
}

export const BADGES_LIST: AchievementBadge[] = [
  {
    id: "badge_3",
    thresholdKg: 3,
    title: "Bronze Dropper",
    subtitle: "3 kg Lost",
    tier: "Bronze",
    iconName: "flame",
    badgeBg: "#FFFBEB",
    iconColor: "#D97706",
    borderColor: "#FCD34D",
    tierBg: "#FEF3C7",
    tierTextColor: "#B45309",
    description: "Shed your first 3 kg! You've proven your commitment to a healthier lifestyle.",
  },
  {
    id: "badge_5",
    thresholdKg: 5,
    title: "Silver Striker",
    subtitle: "5 kg Lost",
    tier: "Silver",
    iconName: "trophy",
    badgeBg: "#F8FAFC",
    iconColor: "#A8A9AC",
    borderColor: "#CBD5E1",
    tierBg: "#E2E8F0",
    tierTextColor: "#334155",
    description: "5 kg milestone reached! Momentum is building and your body is transforming.",
  },
  {
    id: "badge_10",
    thresholdKg: 10,
    title: "Gold Master",
    subtitle: "10 kg Lost",
    tier: "Gold",
    iconName: "ribbon",
    badgeBg: "#FEFCE8",
    iconColor: "#EAB308",
    borderColor: "#FDE047",
    tierBg: "#FEF08A",
    tierTextColor: "#854D0E",
    description: "Double digit loss! 10 kg shed is a major transformation achievement.",
  },
  {
    id: "badge_15",
    thresholdKg: 15,
    title: "Platinum Crusher",
    subtitle: "15 kg Lost",
    tier: "Platinum",
    iconName: "diamond",
    badgeBg: "#ECFEFF",
    iconColor: "#06B6D4",
    borderColor: "#67E8F9",
    tierBg: "#CFFAFE",
    tierTextColor: "#0E7490",
    description: "15 kg down! An incredible feat of consistency and iron discipline.",
  },
  {
    id: "badge_20",
    thresholdKg: 20,
    title: "Titan Legend",
    subtitle: "20 kg Lost",
    tier: "Diamond",
    iconName: "sparkles",
    badgeBg: "#F5F3FF",
    iconColor: "#8B5CF6",
    borderColor: "#C4B5FD",
    tierBg: "#DDD6FE",
    tierTextColor: "#6D28D9",
    description: "Elite 20 kg milestone! Your dedication is inspiring everyone around you.",
  },
  {
    id: "badge_25",
    thresholdKg: 25,
    title: "Grandmaster",
    subtitle: "25 kg+ Lost",
    tier: "Legend",
    iconName: "star",
    badgeBg: "#ECFDF5",
    iconColor: "#10B981",
    borderColor: "#6EE7B7",
    tierBg: "#A7F3D0",
    tierTextColor: "#047857",
    description: "25+ kg conquered! Ultimate legend status achieved on your wellness journey.",
  },
];

interface AchievementsSectionProps {
  lostKg: number;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({ lostKg }) => {
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const unlockedCount = BADGES_LIST.filter((b) => lostKg >= b.thresholdKg).length;

  return (
    <View style={styles.containerCard}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="trophy-sharp" size={16} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Achievements & Badges</Text>
            <Text style={styles.headerSubtitle}>
              {unlockedCount} of {BADGES_LIST.length} Badges Unlocked
            </Text>
          </View>
        </View>

        <View style={styles.unlockedCountChip}>
          <Text style={styles.unlockedCountText}>
            🏆 {unlockedCount}/{BADGES_LIST.length}
          </Text>
        </View>
      </View>

      {/* Badges Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {BADGES_LIST.map((badge) => {
          const isUnlocked = lostKg >= badge.thresholdKg;
          const progressPercent = Math.min(
            100,
            Math.max(0, Math.round((lostKg / badge.thresholdKg) * 100))
          );
          const remainingKg = Math.max(0, parseFloat((badge.thresholdKg - lostKg).toFixed(1)));

          return (
            <TouchableOpacity
              key={badge.id}
              style={[
                styles.badgeCard,
                isUnlocked
                  ? { borderColor: badge.borderColor, backgroundColor: badge.badgeBg }
                  : styles.badgeCardLocked,
              ]}
              onPress={() => setSelectedBadge(badge)}
              activeOpacity={0.8}
            >
              {/* Tier Pill */}
              <View
                style={[
                  styles.tierPill,
                  isUnlocked ? { backgroundColor: badge.tierBg } : styles.tierPillLocked,
                ]}
              >
                <Text
                  style={[
                    styles.tierPillText,
                    isUnlocked ? { color: badge.tierTextColor } : styles.tierTextLocked,
                  ]}
                >
                  {isUnlocked ? badge.tier : "Locked"}
                </Text>
              </View>

              {/* Icon Container */}
              <View
                style={[
                  styles.iconWrap,
                  isUnlocked
                    ? { backgroundColor: "#FFFFFF", borderColor: badge.borderColor }
                    : styles.iconWrapLocked,
                ]}
              >
                <Ionicons
                  name={isUnlocked ? badge.iconName : "lock-closed"}
                  size={24}
                  color={isUnlocked ? badge.iconColor : "#94A3B8"}
                />
              </View>

              {/* Titles */}
              <Text
                style={[styles.badgeCardTitle, !isUnlocked && styles.textMuted]}
                numberOfLines={1}
              >
                {badge.title}
              </Text>
              <Text style={styles.badgeCardSubtitle}>{badge.subtitle}</Text>

              {/* Progress Indicator */}
              {isUnlocked ? (
                <View style={styles.unlockedBadgeTag}>
                  <Ionicons name="checkmark-circle" size={12} color="#059669" />
                  <Text style={styles.unlockedBadgeTagText}>Unlocked</Text>
                </View>
              ) : (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                    />
                  </View>
                  <Text style={styles.progressText}>{remainingKg} kg to go</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* View All Badges & Milestones Button */}
      <TouchableOpacity
        style={styles.viewAllBtn}
        onPress={() => router.push("/(app)/badges")}
        activeOpacity={0.8}
      >
        <Text style={styles.viewAllBtnText}>View All Badges & Achievements</Text>
        <Ionicons name="arrow-forward" size={14} color="#0B6B54" />
      </TouchableOpacity>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <Modal
          visible={!!selectedBadge}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedBadge(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedBadge(null)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>

              {(() => {
                const isUnlocked = lostKg >= selectedBadge.thresholdKg;
                const remainingKg = Math.max(
                  0,
                  parseFloat((selectedBadge.thresholdKg - lostKg).toFixed(1))
                );
                return (
                  <View style={{ alignItems: "center" }}>
                    <View
                      style={[
                        styles.bigBadgeCircle,
                        isUnlocked
                          ? { backgroundColor: selectedBadge.badgeBg, borderColor: selectedBadge.borderColor }
                          : { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
                      ]}
                    >
                      <Ionicons
                        name={isUnlocked ? selectedBadge.iconName : "lock-closed"}
                        size={44}
                        color={isUnlocked ? selectedBadge.iconColor : "#64748B"}
                      />
                    </View>

                    <View
                      style={[
                        styles.modalTierTag,
                        isUnlocked
                          ? { backgroundColor: selectedBadge.tierBg }
                          : { backgroundColor: "#E2E8F0" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalTierText,
                          isUnlocked
                            ? { color: selectedBadge.tierTextColor }
                            : { color: "#475569" },
                        ]}
                      >
                        {selectedBadge.tier} Tier • {selectedBadge.thresholdKg} kg Milestone
                      </Text>
                    </View>

                    <Text style={styles.modalTitle}>{selectedBadge.title}</Text>
                    <Text style={styles.modalDescription}>
                      {selectedBadge.description}
                    </Text>

                    <View style={styles.modalStatusBox}>
                      {isUnlocked ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="trophy" size={18} color="#059669" />
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#059669" }}>
                            Badge Mastered & Unlocked!
                          </Text>
                        </View>
                      ) : (
                        <View style={{ width: "100%", alignItems: "center" }}>
                          <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>
                            Progress: <Text style={{ fontWeight: "700", color: "#1E293B" }}>{lostKg} kg / {selectedBadge.thresholdKg} kg</Text>
                          </Text>
                          <View style={styles.modalProgressTrack}>
                            <View
                              style={[
                                styles.modalProgressFill,
                                {
                                  width: `${Math.min(100, Math.round((lostKg / selectedBadge.thresholdKg) * 100))}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={{ fontSize: 11, color: "#2563EB", fontWeight: "700", marginTop: 6 }}>
                            {remainingKg} kg remaining to earn this badge
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.modalDoneBtn}
                      onPress={() => setSelectedBadge(null)}
                    >
                      <Text style={styles.modalDoneBtnText}>Awesome</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  containerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(11, 107, 84, 0.08)",
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  viewAllBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0B6B54",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  unlockedCountChip: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  unlockedCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B45309",
  },
  scrollContent: {
    gap: 10,
    paddingVertical: 2,
  },
  badgeCard: {
    width: 116,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  badgeCardLocked: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    opacity: 0.85,
  },
  tierPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  tierPillLocked: {
    backgroundColor: "#E2E8F0",
  },
  tierPillText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tierTextLocked: {
    color: "#64748B",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  iconWrapLocked: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  badgeCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  badgeCardSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
    marginBottom: 6,
    textAlign: "center",
  },
  textMuted: {
    color: "#64748B",
  },
  unlockedBadgeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unlockedBadgeTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669",
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
    gap: 3,
  },
  progressBarTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 8.5,
    color: "#64748B",
    fontWeight: "600",
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalCloseBtn: {
    alignSelf: "flex-end",
    padding: 2,
  },
  bigBadgeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalTierTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  modalTierText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 14,
  },
  modalStatusBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  modalProgressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  modalProgressFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 3,
  },
  modalDoneBtn: {
    width: "100%",
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalDoneBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default AchievementsSection;
