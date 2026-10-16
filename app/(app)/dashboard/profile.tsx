import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { PricingModal } from "@/components/PricingModal";
import { PrimaryGoalModal } from "@/components/PrimaryGoalModal";
import { NotificationSettingsCard } from "@/components/NotificationSettingsCard";
import { getRouteForPrimaryGoal } from "@/lib/primaryGoal";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Vitals stats from health profile
  const [weightKg, setWeightKg] = useState("78 kg");
  const [heightCm, setHeightCm] = useState("178 cm");
  const [ageYrs, setAgeYrs] = useState("24 yrs");

  // Primary Goal State
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Pro Subscription modal
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isProUser, setIsProUser] = useState(false);

  const loadProfileData = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/(auth)/login");
        return;
      }
      setUser(session.user);

      const { data } = await supabase
        .from("users")
        .select(
          "name, email, phone, metadata, interested_plan_id, primary_goal, weight_loss_journey",
        )
        .eq("id", session.user.id)
        .maybeSingle();

      setProfile(data);
      setPrimaryGoal(data?.primary_goal || "Weight Loss");

      // Set vitals - latest logged weight from history
      const journey = data?.weight_loss_journey;
      const meta = data?.metadata;

      if (Array.isArray(journey?.history) && journey.history.length > 0) {
        // Sort descending by date to guarantee the most recent logged weight is displayed
        const sortedHistory = [...journey.history].sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const latestWeight = sortedHistory[0]?.weight;
        if (latestWeight != null && !isNaN(Number(latestWeight))) {
          const formatted = Number(latestWeight).toFixed(1).replace(/\.0$/, "");
          setWeightKg(`${formatted} kg`);
        }
      } else if (journey?.startingWeight != null) {
        const formatted = Number(journey.startingWeight).toFixed(1).replace(/\.0$/, "");
        setWeightKg(`${formatted} kg`);
      } else if (meta?.weight != null) {
        const formatted = Number(meta.weight).toFixed(1).replace(/\.0$/, "");
        setWeightKg(`${formatted} kg`);
      }

      if (meta?.height) {
        setHeightCm(`${meta.height} cm`);
      }
      if (meta?.age) {
        setAgeYrs(`${meta.age} yrs`);
      }

      // Check Pro status
      if (meta && typeof meta === "object" && meta.is_pro === true) {
        setIsProUser(true);
      }
    } catch (err) {
      console.error("Error loading profile data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData]),
  );

  const handleSignOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of Genestac?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["top"]}>
        <ActivityIndicator color="#0A8554" size="large" />
      </SafeAreaView>
    );
  }

  const name =
    profile?.name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    "Jaskamal Singh";
  const email = profile?.email || user?.email || "jaskamal@example.com";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsIconBtn}
          onPress={() => setShowGoalModal(true)}
          hitSlop={12}
        >
          <Ionicons name="settings-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Identity: Avatar, Name & Email (Center Aligned) */}
        <View style={styles.userProfileHero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitialsText}>{initials}</Text>
          </View>
          <Text style={styles.userNameText} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.userEmailText} numberOfLines={1}>
            {email}
          </Text>
        </View>

        {/* 3 Vitals Stats Cards Row (Weight, Height, Age) */}
        <View style={styles.vitalsRow}>
          <View style={styles.vitalCard}>
            <Text style={styles.vitalValueText}>{weightKg}</Text>
            <Text style={styles.vitalLabelText}>Weight</Text>
          </View>

          <View style={styles.vitalCard}>
            <Text style={styles.vitalValueText}>{heightCm}</Text>
            <Text style={styles.vitalLabelText}>Height</Text>
          </View>

          <View style={styles.vitalCard}>
            <Text style={styles.vitalValueText}>{ageYrs}</Text>
            <Text style={styles.vitalLabelText}>Age</Text>
          </View>
        </View>

        {/* ── Genestac Pro Pricing Banner ── */}
        <TouchableOpacity
          style={styles.proBanner}
          onPress={() => setShowPricingModal(true)}
          activeOpacity={0.88}
        >
          {/* Decorative glow circles */}
          <View style={styles.proGlowTopRight} />
          <View style={styles.proGlowBottomLeft} />

          <View style={styles.proBannerLeft}>
            <View style={styles.proIconCircle}>
              <Ionicons name="sparkles" size={22} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              {isProUser ? (
                <>
                  <View style={styles.proActiveBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={13}
                      color="#4ade80"
                    />
                    <Text style={styles.proActiveBadgeText}>PRO ACTIVE</Text>
                  </View>
                  <Text style={styles.proBannerTitle}>
                    {"You're a Pro Member \uD83C\uDF89"}
                  </Text>
                  <Text style={styles.proBannerSubtitle}>
                    All premium features unlocked
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.proBannerTitle}>
                    Upgrade to Genestac Pro
                  </Text>
                  <Text style={styles.proBannerSubtitle}>
                    Unlock advanced plans, AI coaching & more
                  </Text>
                </>
              )}
            </View>
          </View>

          {!isProUser && (
            <View style={styles.proCtaChip}>
              <Text style={styles.proCtaChipText}>View Plans</Text>
              <Ionicons name="chevron-forward" size={13} color="#0A8554" />
            </View>
          )}
        </TouchableOpacity>

        {/* Menu Items List */}
        <View style={styles.menuCard}>
          {/* My Plans */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/(app)/dashboard/plan")}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBg}>
              <Ionicons name="clipboard-outline" size={20} color="#0A8554" />
            </View>
            <Text style={styles.menuTitleText}>My Plans</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Health Reports */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/(app)/dashboard/track")}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBg}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#0A8554"
              />
            </View>
            <Text style={styles.menuTitleText}>Health Reports</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Book Consultation */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/(app)/dashboard/consultation")}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBg}>
              <Ionicons name="medkit-outline" size={20} color="#0A8554" />
            </View>
            <Text style={styles.menuTitleText}>Book Consultation</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Buy Products */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/(app)/dashboard/shop")}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBg}>
              <Ionicons name="bag-handle-outline" size={20} color="#0A8554" />
            </View>
            <Text style={styles.menuTitleText}>Buy Products</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Subscription / Pro Plans */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowPricingModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="diamond-outline" size={20} color="#d97706" />
            </View>
            <Text style={styles.menuTitleText}>Subscription & Plans</Text>
            {isProUser ? (
              <View style={styles.proMenuBadge}>
                <Text style={styles.proMenuBadgeText}>PRO</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            )}
          </TouchableOpacity>

          {/* Settings / Primary Goal */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowGoalModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBg}>
              <Ionicons name="settings-outline" size={20} color="#0A8554" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitleText}>Settings & Primary Goal</Text>
            </View>
            {primaryGoal && (
              <View style={styles.goalBadge}>
                <Text style={styles.goalBadgeText}>{primaryGoal}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              Alert.alert("Support", "Need help? Email care@genestac.com")
            }
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBg}>
              <Ionicons name="help-circle-outline" size={20} color="#0A8554" />
            </View>
            <Text style={styles.menuTitleText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Log Out */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.menuTitleText, { color: "#DC2626" }]}>
              Log Out
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#F87171" />
          </TouchableOpacity>
        </View>

        {/* ── Notification Preferences & Controls ── */}
        <NotificationSettingsCard />

        {/* Footer Brand Card */}
        <View style={styles.brandFooterCard}>
          <View style={styles.brandFooterIconCircle}>
            <Ionicons name="leaf" size={22} color="#0A8554" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandFooterTitle}>
              Better health. Brighter you.
            </Text>
            <Text style={styles.brandFooterSub}>Genestac</Text>
          </View>
        </View>
      </ScrollView>

      {/* Pricing / Pro Membership Modal */}
      <PricingModal
        visible={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onSubscribeSuccess={() => setIsProUser(true)}
      />

      {/* Primary Goal Modal */}
      <PrimaryGoalModal
        visible={showGoalModal}
        userId={user?.id ?? ""}
        initialGoal={primaryGoal}
        allowDismiss={true}
        onClose={() => setShowGoalModal(false)}
        onGoalSaved={(savedGoal, targetRoute) => {
          setPrimaryGoal(savedGoal);
          setShowGoalModal(false);
          const route = targetRoute || getRouteForPrimaryGoal(savedGoal);
          router.replace(route as any);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  settingsIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  userProfileHero: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 3,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#0A8554",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#0A8554",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarInitialsText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  userNameText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  userEmailText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  vitalsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  vitalCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: 2,
  },
  vitalValueText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  vitalLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },

  // ── Pro Banner ──
  proBanner: {
    borderRadius: 20,
    backgroundColor: "#0D1F2D",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    gap: 12,
    shadowColor: "#12879a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  proGlowTopRight: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(18,135,154,0.35)",
  },
  proGlowBottomLeft: {
    position: "absolute",
    bottom: -20,
    left: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(92,191,90,0.2)",
  },
  proBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  proIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(245,158,11,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  proActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  proActiveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4ade80",
    letterSpacing: 0.8,
  },
  proBannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  proBannerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  proCtaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 2,
  },
  proCtaChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0A8554",
  },

  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  proMenuBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proMenuBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#d97706",
  },
  goalBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
  },
  goalBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0A8554",
  },
  brandFooterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 12,
    marginTop: 8,
  },
  brandFooterIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  brandFooterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  brandFooterSub: {
    fontSize: 12,
    color: "#047857",
  },
});
