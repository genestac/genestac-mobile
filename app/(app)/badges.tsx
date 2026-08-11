import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  Share,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Colors, Fonts, Spacing, Radius } from "@/constants/colors";
import { evaluateUserBadges, getClosestLockedBadge, Badge } from "@/lib/badgeEvaluator";

const { width } = Dimensions.get("window");

type CategoryFilter = "all" | "weight" | "streaks" | "hydration" | "nutrition" | "steps" | "mindfulness";
type StatusFilter = "all" | "unlocked" | "locked";

export default function BadgesScreen() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeBadge, setActiveBadge] = useState<Badge | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVictoryShareModal, setShowVictoryShareModal] = useState(false);
  const [selectedMonthTab, setSelectedMonthTab] = useState<"month1" | "month2" | "month3">("month1");
  const cardRef = useRef<View>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase
            .from("users")
            .select("weight_loss_journey")
            .eq("id", session.user.id)
            .maybeSingle();

          if (data?.weight_loss_journey) {
            const evaluated = evaluateUserBadges(data.weight_loss_journey);
            setBadges(evaluated);
          } else {
            setBadges(evaluateUserBadges({}));
          }
        } else {
          setBadges(evaluateUserBadges({}));
        }
      } catch (err) {
        setBadges(evaluateUserBadges({}));
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const isAllUnlocked = unlockedCount === badges.length;
  const totalXP = badges.filter((b) => b.isUnlocked).reduce((acc, b) => acc + b.xp, 0);
  const progressPercent = Math.round((unlockedCount / badges.length) * 100);
  const closestBadge = getClosestLockedBadge(badges);
  const prestigeTier = Math.max(1, Math.floor(totalXP / 2500) + 1);
  const prestigeMode = isAllUnlocked || totalXP >= 2500;

  const filteredBadges = badges.filter((b) => {
    const matchesCategory = selectedCategory === "all" || b.category === selectedCategory;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "unlocked" && b.isUnlocked) ||
      (statusFilter === "locked" && !b.isUnlocked);
    return matchesCategory && matchesStatus;
  });

  const handleShareStory = async (monthName: string) => {
    try {
      await Share.share({
        message: `🏆 I just conquered 100% of all Wellness & Fitness Milestones on Genestac for ${monthName}! Earned ${totalXP.toLocaleString()} XP Points and Grandmaster Champion status 👑. Join me on Genestac!`,
      });
    } catch (e) {
      console.error("Error in share handler:", e);
    }
  };

  const handleDownloadCard = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow gallery access to save the victory card to your photos.");
        setIsDownloading(false);
        return;
      }

      if (!cardRef.current) {
        Alert.alert("Error", "Victory card view is not ready yet.");
        setIsDownloading(false);
        return;
      }

      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1.0,
        result: "tmpfile",
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("✅ Victory Card Saved!", "The victory card image has been saved to your gallery.");
    } catch (e: any) {
      console.error("Error saving card image:", e);
      Alert.alert("Download Error", "Could not save card to gallery. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={s.headerTitle}>Badges & Achievements</Text>
            {isAllUnlocked && (
              <View style={s.crownBadge}>
                <Text style={{ fontSize: 12 }}>👑</Text>
              </View>
            )}
          </View>
          <Text style={s.headerSubtitle}>
            {isAllUnlocked ? "Grandmaster Champion • 100% Mastered" : "Earn rewards & track your wellness milestones"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={Colors.primaryLight} size="large" />
          <Text style={s.loadingText}>Evaluating your logged achievements...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* XP & Level Hero Card (Turns Golden when 100% Unlocked) */}
          <View style={[s.heroCard, isAllUnlocked && s.heroCardAllUnlocked]}>
            {isAllUnlocked ? (
              <View style={s.goldHeaderRow}>
                <View style={s.xpChipGold}>
                  <Text style={{ fontSize: 13 }}>👑</Text>
                  <Text style={s.xpChipTextGold}>ALL MILESTONES CONQUERED</Text>
                </View>
              </View>
            ) : (
              <View style={s.heroTopRow}>
                <View>
                  <Text style={s.heroLabel}>TOTAL LEVEL PROGRESS</Text>
                  <Text style={s.heroValue}>{totalXP.toLocaleString()} XP</Text>
                </View>

                <View style={s.xpChip}>
                  <Text style={{ fontSize: 14 }}>👑</Text>
                  <Text style={s.xpChipText}>Level {Math.max(1, Math.floor(totalXP / 300))} Champion</Text>
                </View>
              </View>
            )}

            {/* XP Value when 100% Unlocked */}
            {isAllUnlocked && (
              <View style={s.masterXpRow}>
                <Text style={[s.heroLabel, { color: "#78350F" }]}>GRANDMASTER TOTAL XP</Text>
                <Text style={s.heroValueLarge}>{totalXP.toLocaleString()} <Text style={s.heroValueXpSub}>XP</Text></Text>
              </View>
            )}

            {/* Progress Bar */}
            <View style={s.progressRow}>
              <View style={s.progressBarBg}>
                <View
                  style={[
                    s.progressBarFill,
                    isAllUnlocked && { backgroundColor: "#D97706" },
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
              <Text style={[s.progressPercentText, isAllUnlocked && { color: "#B45309" }]}>
                {progressPercent}%
              </Text>
            </View>

            {/* Stats Row */}
            <View style={[s.heroStatsRow, isAllUnlocked && { backgroundColor: "#FEF3C7" }]}>
              <View style={s.heroStatItem}>
                <Text style={s.heroStatNum}>🏆 {unlockedCount}</Text>
                <Text style={s.heroStatLabel}>Unlocked</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStatItem}>
                <Text style={s.heroStatNum}>
                  {isAllUnlocked ? "⭐ 100%" : `🔒 ${badges.length - unlockedCount}`}
                </Text>
                <Text style={s.heroStatLabel}>
                  {isAllUnlocked ? "Mastered" : "Locked"}
                </Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStatItem}>
                <Text style={s.heroStatNum}>🎯 {badges.length}</Text>
                <Text style={s.heroStatLabel}>Total Badges</Text>
              </View>
            </View>

            {/* Actions Section when 100% Unlocked */}
            {isAllUnlocked && (
              <View style={s.unlockedActionsContainer}>
                {/* Primary Action Button */}
                <TouchableOpacity
                  style={s.primaryShareBtn}
                  onPress={() => setShowVictoryShareModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={18} color="#FFFFFF" />
                  <Text style={s.primaryShareBtnText}>Share Victory Card</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Closest Badge OR Season Announcement Notice */}
          {closestBadge ? (
            <TouchableOpacity
              style={s.closestCard}
              onPress={() => setActiveBadge(closestBadge)}
              activeOpacity={0.8}
            >
              <View style={s.closestHeaderRow}>
                <View
                  style={[
                    s.closestIconWrap,
                    { backgroundColor: closestBadge.badgeBg, borderColor: closestBadge.borderColor },
                  ]}
                >
                  <Ionicons name={closestBadge.iconName} size={22} color={closestBadge.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={s.closestBadgeTag}>🎯 CLOSEST TO UNLOCK NEXT</Text>
                    <Text style={s.closestPercentText}>
                      {Math.round((closestBadge.currentValue / closestBadge.targetValue) * 100)}%
                    </Text>
                  </View>
                  <Text style={s.closestTitle}>{closestBadge.title}</Text>
                  <Text style={s.closestSub}>
                    {closestBadge.currentValue} / {closestBadge.targetValue} {closestBadge.unit} ({closestBadge.targetValue - closestBadge.currentValue} {closestBadge.unit} to go!)
                  </Text>
                </View>
              </View>

              <View style={s.closestBarBg}>
                <View
                  style={[
                    s.closestBarFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.round((closestBadge.currentValue / closestBadge.targetValue) * 100)
                      )}%`,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.seasonCard}>
              <View style={s.seasonHeaderRow}>
                <View style={s.seasonIconCircle}>
                  <Text style={{ fontSize: 18 }}>🎉</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.seasonTitle}>Top 1% Legend Status Achieved!</Text>
                  <Text style={s.seasonSub}>
                    All milestones conquered. Next season drop in 3 days!
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Status Toggle Tabs */}
          <View style={s.statusToggleRow}>
            <TouchableOpacity
              style={[s.statusTab, statusFilter === "all" && s.statusTabActive]}
              onPress={() => setStatusFilter("all")}
            >
              <Text style={[s.statusTabText, statusFilter === "all" && s.statusTabTextActive]}>
                All ({badges.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.statusTab, statusFilter === "unlocked" && s.statusTabActive]}
              onPress={() => setStatusFilter("unlocked")}
            >
              <Text style={[s.statusTabText, statusFilter === "unlocked" && s.statusTabTextActive]}>
                🏆 Unlocked ({unlockedCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.statusTab, statusFilter === "locked" && s.statusTabActive]}
              onPress={() => setStatusFilter("locked")}
            >
              <Text style={[s.statusTabText, statusFilter === "locked" && s.statusTabTextActive]}>
                🔒 Locked ({badges.length - unlockedCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category Pills Carousel */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryScroll}>
            {[
              { id: "all", label: "🌟 All Categories" },
              { id: "weight", label: "⚖️ Weight Loss" },
              { id: "streaks", label: "🔥 Streaks" },
              { id: "hydration", label: "💧 Hydration" },
              { id: "nutrition", label: "🥗 Nutrition" },
              { id: "steps", label: "👣 Steps" },
              { id: "mindfulness", label: "🧘 Mindfulness" },
            ].map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.categoryPill, active && s.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat.id as CategoryFilter)}
                >
                  <Text style={[s.categoryPillText, active && s.categoryPillTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Badges Grid */}
          <View style={s.badgesGrid}>
            {filteredBadges.map((badge) => {
              const isUnlocked = badge.isUnlocked;
              const progress = Math.min(100, Math.round((badge.currentValue / badge.targetValue) * 100));

              return (
                <TouchableOpacity
                  key={badge.id}
                  style={[
                    s.badgeCard,
                    isUnlocked
                      ? { borderColor: badge.borderColor, backgroundColor: badge.badgeBg }
                      : s.badgeCardLocked,
                  ]}
                  onPress={() => setActiveBadge(badge)}
                  activeOpacity={0.8}
                >
                  {/* Prestige Star Badge */}
                  {prestigeMode && isUnlocked && (
                    <View style={s.prestigeStarPill}>
                      <Ionicons name="star" size={10} color="#D97706" />
                    </View>
                  )}

                  {/* Tier Pill */}
                  <View
                    style={[
                      s.tierPill,
                      isUnlocked ? { backgroundColor: badge.tierBg } : s.tierPillLocked,
                    ]}
                  >
                    <Text
                      style={[
                        s.tierPillText,
                        isUnlocked ? { color: badge.tierTextColor } : s.tierTextLocked,
                      ]}
                    >
                      {isUnlocked ? badge.tierLabel : "Locked"}
                    </Text>
                  </View>

                  {/* Badge Icon Container */}
                  <View
                    style={[
                      s.iconWrap,
                      isUnlocked
                        ? { backgroundColor: "#FFFFFF", borderColor: badge.borderColor }
                        : s.iconWrapLocked,
                    ]}
                  >
                    <Ionicons
                      name={isUnlocked ? badge.iconName : "lock-closed"}
                      size={26}
                      color={isUnlocked ? badge.iconColor : "#94A3B8"}
                    />
                  </View>

                  {/* Badge Title & Subtitle */}
                  <Text style={[s.badgeTitle, !isUnlocked && s.textMuted]} numberOfLines={2}>
                    {badge.title}
                  </Text>
                  <Text style={s.badgeSubtitle}>{badge.subtitle}</Text>

                  {/* XP Chip */}
                  <View style={s.xpTag}>
                    <Text style={s.xpTagText}>+{badge.xp} XP</Text>
                  </View>

                  {/* Progress / Status indicator */}
                  {isUnlocked ? (
                    <View style={s.unlockedTag}>
                      <Ionicons name="checkmark-circle" size={12} color="#059669" />
                      <Text style={s.unlockedTagText}>Unlocked</Text>
                    </View>
                  ) : (
                    <View style={s.miniProgressContainer}>
                      <View style={s.miniProgressBarBg}>
                        <View style={[s.miniProgressBarFill, { width: `${progress}%` }]} />
                      </View>
                      <Text style={s.miniProgressText}>
                        {badge.currentValue}/{badge.targetValue} {badge.unit}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Shareable Victory Card Modal */}
      <Modal
        visible={showVictoryShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVictoryShareModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.shareCardModalContainer}>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowVictoryShareModal(false)}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            <Text style={s.shareModalTitle}>Share Victory Story Card </Text>
            <Text style={s.shareModalSubtitle}>Select a month victory card to share on social media</Text>

            {/* Month Tabs */}
            <View style={s.monthTabsRow}>
              <TouchableOpacity
                style={[s.monthTab, selectedMonthTab === "month1" && s.monthTabActive]}
                onPress={() => setSelectedMonthTab("month1")}
              >
                <Text style={[s.monthTabText, selectedMonthTab === "month1" && s.monthTabTextActive]}>
                  July 
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.monthTab, selectedMonthTab === "month2" && s.monthTabActive]}
                onPress={() => setSelectedMonthTab("month2")}
              >
                <Text style={[s.monthTabText, selectedMonthTab === "month2" && s.monthTabTextActive]}>
                  August 
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.monthTab, selectedMonthTab === "month3" && s.monthTabActive]}
                onPress={() => setSelectedMonthTab("month3")}
              >
                <Text style={[s.monthTabText, selectedMonthTab === "month3" && s.monthTabTextActive]}>
                  September 
                </Text>
              </TouchableOpacity>
            </View>

            {/* Graphic Victory Story Card (Light Genestac Brand Theme) */}
            <View style={s.victoryGraphicCard} ref={cardRef} collapsable={false}>
              {/* Card Ambient Header Bar */}
              <View style={s.graphicTopBar}>
                <View style={s.appLogoBadge}>
                  <Image
                    source={require("@/assets/images/brand/logo.webp")}
                    style={s.graphicBrandLogo}
                    resizeMode="contain"
                  />
                  <Text style={s.appLogoText}>GENESTAC</Text>
                </View>
                <View style={s.seasonPill}>
                  <Text style={s.seasonPillText}>
                    {selectedMonthTab === "month1" ? "JULY 2026" : selectedMonthTab === "month2" ? "AUG 2026" : "SEP 2026"}
                  </Text>
                </View>
              </View>

              {/* Centerpiece Hero Emblem */}
              <View style={s.graphicHeroCenter}>
                <View style={s.trophyAuraRing}>
                  <Ionicons name="trophy" size={40} color="#F3C94D" />
                </View>

                <Text style={s.graphicHeroTitle}>
                  {selectedMonthTab === "month1" ? "July Grandmaster" : selectedMonthTab === "month2" ? "August Conqueror" : "September Legend"}
                </Text>

                <Text style={s.graphicSubText}>100% MILESTONES CONQUERED</Text>

                {/* Metric Chips */}
                <View style={s.metricBadgeRow}>
                  <View style={s.heroMetricChip}>
                    <Ionicons name="flash" size={12} color={Colors.primary} />
                    <Text style={s.heroMetricText}>{totalXP.toLocaleString()} XP</Text>
                  </View>

                  <View style={s.heroMetricChip}>
                    <Ionicons name="shield-checkmark" size={12} color={Colors.primaryLight} />
                    <Text style={s.heroMetricText}>{badges.length}/{badges.length} Mastered</Text>
                  </View>
                </View>
              </View>

              {/* Showcase Section: Top 6 Badges Grid */}
              <View style={s.showcaseSection}>
                <Text style={s.showcaseTitle}>KEY MILESTONES MASTERED</Text>
                <View style={s.showcaseGrid}>
                  {badges.slice(0, 6).map((b) => (
                    <View key={b.id} style={s.showcaseBadgeItem}>
                      <View style={[s.showcaseBadgeIcon, { backgroundColor: b.badgeBg, borderColor: b.borderColor }]}>
                        <Ionicons name={b.iconName} size={16} color={b.iconColor} />
                      </View>
                      <Text style={s.showcaseBadgeLabel} numberOfLines={1}>
                        {b.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Footer Branding */}
              <View style={s.graphicFooter}>
                <MaterialCommunityIcons name="check-decagram" size={20} color={Colors.primary} />
                <Text style={s.graphicFooterBrand}>GENESTAC</Text>
              </View>
            </View>

            {/* Download Button */}
            <TouchableOpacity
              style={s.downloadBtn}
              onPress={handleDownloadCard}
              activeOpacity={0.8}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  <Text style={s.downloadBtnText}>Save to Gallery</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Badge Detail Modal */}
      <Modal
        visible={!!activeBadge}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActiveBadge(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            {activeBadge && (
              <>
                <TouchableOpacity style={s.modalCloseBtn} onPress={() => setActiveBadge(null)}>
                  <Ionicons name="close" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>

                <View
                  style={[
                    s.modalIconWrap,
                    activeBadge.isUnlocked
                      ? { backgroundColor: activeBadge.badgeBg, borderColor: activeBadge.borderColor }
                      : s.iconWrapLocked,
                  ]}
                >
                  <Ionicons
                    name={activeBadge.isUnlocked ? activeBadge.iconName : "lock-closed"}
                    size={44}
                    color={activeBadge.isUnlocked ? activeBadge.iconColor : "#94A3B8"}
                  />
                </View>

                <View
                  style={[
                    s.modalTierTag,
                    activeBadge.isUnlocked
                      ? { backgroundColor: activeBadge.tierBg }
                      : s.tierPillLocked,
                  ]}
                >
                  <Text
                    style={[
                      s.modalTierTagText,
                      activeBadge.isUnlocked ? { color: activeBadge.tierTextColor } : s.tierTextLocked,
                    ]}
                  >
                    {activeBadge.tierLabel} • {activeBadge.categoryLabel}
                  </Text>
                </View>

                <Text style={s.modalTitle}>{activeBadge.title}</Text>
                <Text style={s.modalSubtitle}>{activeBadge.subtitle}</Text>
                <Text style={s.modalDescription}>{activeBadge.description}</Text>

                <View style={s.modalRewardCard}>
                  <Ionicons name="sparkles" size={20} color="#F59E0B" />
                  <Text style={s.modalRewardText}>Reward: +{activeBadge.xp} XP Points</Text>
                </View>

                {activeBadge.isUnlocked ? (
                  <View style={s.modalUnlockedBanner}>
                    <Ionicons name="checkmark-circle" size={18} color="#059669" />
                    <Text style={s.modalUnlockedBannerText}>
                      Unlocked on {activeBadge.unlockedDate || "Jul 2026"}
                    </Text>
                  </View>
                ) : (
                  <View style={s.modalProgressSection}>
                    <View style={s.modalProgressHeader}>
                      <Text style={s.modalProgressTitle}>Requirement Progress</Text>
                      <Text style={s.modalProgressVal}>
                        {activeBadge.currentValue} / {activeBadge.targetValue} {activeBadge.unit}
                      </Text>
                    </View>
                    <View style={s.modalProgressBarBg}>
                      <View
                        style={[
                          s.modalProgressBarFill,
                          {
                            width: `${Math.min(
                              100,
                              Math.round((activeBadge.currentValue / activeBadge.targetValue) * 100)
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                <TouchableOpacity style={s.modalDoneBtn} onPress={() => setActiveBadge(null)}>
                  <Text style={s.modalDoneBtnText}>Great, Keep Going!</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  crownBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  headerSubtitle: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // Hero Card
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
    position: "relative",
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  heroCardAllUnlocked: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
    borderWidth: 2,
    shadowColor: "#F59E0B",
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  goldHeaderRow: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap:10,
  },
  goldBannerRibbon: {
    backgroundColor: "#D97706",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  goldBannerRibbonText: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.white,
    letterSpacing: 0.6,
  },
  xpChipGold: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  xpChipTextGold: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B45309",
  },
  masterXpRow: {
    marginTop: 2,
    marginBottom: 2,
  },
  heroValueLarge: {
    fontSize: 28,
    fontWeight: "900",
    color: "#92400E",
    letterSpacing: -0.8,
    marginTop: 2,
  },
  heroValueXpSub: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "800",
    color: "#B45309",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: Fonts.sizes.xl,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  xpChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  xpChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.borderLight,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: Colors.primaryLight,
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primaryLight,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: Colors.background,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  heroStatItem: {
    alignItems: "center",
  },
  heroStatNum: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  heroStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },

  // Unlocked Actions Container
  unlockedActionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  primaryShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D97706",
    paddingVertical: 12,
    borderRadius: Radius.md,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryShareBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 0.2,
  },
  secondaryActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
  },

  // Master Actions Row
  masterActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  shareStoryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D97706",
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  shareStoryBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.white,
  },
  prestigeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  prestigeBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
  },
  themeToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  themeToggleBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
  },

  // Closest Badge Card
  closestCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    gap: 10,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  closestHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  closestIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  closestBadgeTag: {
    fontSize: 10,
    fontWeight: "900",
    color: "#D97706",
    letterSpacing: 0.5,
  },
  closestPercentText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primaryLight,
  },
  closestTitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 1,
  },
  closestSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  closestBarBg: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
    overflow: "hidden",
  },
  closestBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
  },

  // Season Notice Card for 100% Unlocked
  seasonCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  seasonHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  seasonIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  seasonTitle: {
    fontSize: Fonts.sizes.xs,
    fontWeight: "900",
    color: "#15803D",
  },
  seasonSub: {
    fontSize: 11,
    color: "#166534",
    marginTop: 1,
  },

  // Status Filter Tabs
  statusToggleRow: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    padding: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: Radius.sm,
  },
  statusTabActive: {
    backgroundColor: Colors.primaryMuted,
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  statusTabTextActive: {
    color: Colors.primary,
    fontWeight: "800",
  },

  // Category Pills
  categoryScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  categoryPillTextActive: {
    color: Colors.white,
  },

  // Badges Grid
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  badgeCard: {
    width: (width - Spacing.md * 2 - 12) / 2,
    borderRadius: Radius.lg,
    padding: 12,
    borderWidth: 1.5,
    alignItems: "center",
    position: "relative",
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  prestigeBadgeGlow: {
    borderColor: "#F59E0B",
    borderWidth: 2,
    shadowColor: "#F59E0B",
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  prestigeStarPill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FEF3C7",
    padding: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  badgeCardLocked: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  tierPill: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  tierPillLocked: {
    backgroundColor: "#F1F5F9",
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  tierTextLocked: {
    color: "#94A3B8",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  iconWrapLocked: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  textMuted: {
    color: Colors.textMuted,
  },
  badgeSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  xpTag: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: 6,
  },
  xpTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
  },
  unlockedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  unlockedTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  miniProgressContainer: {
    width: "100%",
    marginTop: 8,
    alignItems: "center",
    gap: 3,
  },
  miniProgressBarBg: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
    overflow: "hidden",
  },
  miniProgressBarFill: {
    height: "100%",
    backgroundColor: Colors.primaryLight,
    borderRadius: 3,
  },
  miniProgressText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textMuted,
  },

  // Share Card Modal
  shareCardModalContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: "center",
  },
  shareModalTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  shareModalSubtitle: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  monthTabsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
    width: "100%",
  },
  monthTab: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthTabActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  monthTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  monthTabTextActive: {
    color: Colors.white,
  },
  victoryGraphicCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  graphicTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop:-9
  },
  appLogoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  graphicBrandLogo: {
    width: 35,
    height: 35,
  },
  appLogoText: {
    fontSize: 8,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: 0.8,
    marginTop:15,
    marginLeft:-12
  },
  seasonPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seasonPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  graphicHeroCenter: {
    alignItems: "center",
    width: "100%",
  },
  trophyAuraRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  centerHeroLogoWebp: {
    width: 36,
    height: 36,
  },
  graphicHeroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  graphicSubText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primaryLight,
    letterSpacing: 0.8,
    marginTop: 2,
    marginBottom: 8,
  },
  metricBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroMetricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  heroMetricText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  showcaseSection: {
    width: "100%",
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  showcaseTitle: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textAlign: "center",
    marginBottom: 10,
  },
  showcaseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  showcaseBadgeItem: {
    width: "30%",
    alignItems: "center",
    gap: 4,
  },
  showcaseBadgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  showcaseBadgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  graphicFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  graphicFooterBrandLogo: {
    width: 16,
    height: 16,
  },
  graphicFooterBrand: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  shareBtnsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  whatsappShareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderColor:"#25D366",
    borderWidth:1
  },
  instaShareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderColor:"#E1306C",
    borderWidth:1
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.dark,
  },
  downloadBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 31, 23, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    position: "relative",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTierTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 8,
  },
  modalTierTagText: {
    fontSize: 11,
    fontWeight: "800",
  },
  modalTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  modalDescription: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginVertical: 12,
  },
  modalRewardCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  modalRewardText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B45309",
  },
  modalUnlockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    width: "100%",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalUnlockedBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  modalProgressSection: {
    width: "100%",
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: Radius.md,
    gap: 8,
    marginBottom: 14,
  },
  modalProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalProgressTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  modalProgressVal: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primaryLight,
  },
  modalProgressBarBg: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: "hidden",
  },
  modalProgressBarFill: {
    height: "100%",
    backgroundColor: Colors.primaryLight,
    borderRadius: 4,
  },
  modalDoneBtn: {
    width: "100%",
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  modalDoneBtnText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "800",
    color: Colors.white,
  },
});
