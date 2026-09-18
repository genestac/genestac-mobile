import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, TouchableOpacity, Alert, Modal } from "react-native";

import { syncAllNotifications } from "@/lib/notifications";
import {
  checkUserSubscription,
  UserSubscriptionStatus,
} from "@/lib/subscriptions";
import { PricingModal } from "@/components/PricingModal";

export default function AppLayout() {
  const [checking, setChecking] = useState(true);
  const [subStatus, setSubStatus] = useState<UserSubscriptionStatus | null>(
    null,
  );
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setTimeout(() => {
          router.replace("/(auth)/login");
        }, 0);
      } else {
        const {
          getNotificationPreferences,
        } = require("@/lib/notificationStorage");
        getNotificationPreferences()
          .then(syncAllNotifications)
          .catch(console.error);
        try {
          const status = await checkUserSubscription(session.user.id);
          setSubStatus(status);
        } catch (err) {
          console.error("Layout sub check failed:", err);
        }
      }
      setChecking(false);
    };
    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setTimeout(() => {
            router.replace("/(auth)/login");
          }, 0);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) return null;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="longevity" />
        <Stack.Screen name="pain-regeneration" />
        <Stack.Screen name="hair-treatment" />
        <Stack.Screen name="heart-diabetes" />
        <Stack.Screen name="skin-laser-treatment" />
      </Stack>

      {/* Full Screen Locked Overlay when Subscription Expired or None */}
      <Modal
        visible={
          !!subStatus && (subStatus.isExpired || subStatus.status === "none")
        }
        animationType="fade"
        transparent={true}
      >
        <View style={styles.expiredLockOverlay}>
          <View style={styles.expiredLockCard}>
            <View style={styles.lockIconCircle}>
              <Ionicons name="lock-closed" size={32} color="#DC2626" />
            </View>
            <Text style={styles.expiredLockTitle}>
              {subStatus?.isExpired
                ? "Subscription Expired"
                : "Pro Membership Required"}
            </Text>
            <Text style={styles.expiredLockText}>
              {subStatus?.isExpired
                ? `Your subscription ended on ${subStatus.endDateStr || "recently"}. App access is currently paused until your plan is renewed.`
                : "Subscribe for full access to your health dashboard, diet plans, and weight loss tracking."}
            </Text>

            <TouchableOpacity
              style={styles.renewBtnPrimary}
              onPress={() => setShowPricingModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.renewBtnText}>Start ₹1 Trial & AutoPay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manageUPIBtn}
              onPress={() => {
                Alert.alert(
                  "Manage UPI AutoPay Mandate",
                  "If you have an active AutoPay mandate set up, open your UPI App (Google Pay, PhonePe, Paytm, BHIM) -> Go to Settings/Profile -> Autopay / Mandates to manage your subscription.",
                );
              }}
            >
              <Text style={styles.manageUPIText}>
                How to manage mandate in UPI App?
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pricing Modal */}
      <PricingModal
        visible={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onSubscribeSuccess={async () => {
          // Re-check auth and subscription after payment
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            const status = await checkUserSubscription(session.user.id);
            setSubStatus(status);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  expiredLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  expiredLockCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  expiredLockTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  expiredLockText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  renewBtnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  renewBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  manageUPIBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
  },
  manageUPIText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
