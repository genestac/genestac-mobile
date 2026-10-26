import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StyleSheet, View, Text, AppState, ActivityIndicator, Platform, TouchableOpacity, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { checkUserSubscription, UserSubscriptionStatus } from "@/lib/subscriptions";
import { PricingModal } from "@/components/PricingModal";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { syncAllNotifications } from '@/lib/notifications';
import { registerExpoPushToken } from '@/lib/pushToken';

const CRM_URL = process.env.EXPO_PUBLIC_CRM_API_URL ?? '';

/** Report to backend when user taps a push notification */
async function trackNotificationOpen(notificationId: string, screen?: string) {
  if (!notificationId || !CRM_URL) return;
  try {
    await fetch(`${CRM_URL}/api/admin/push-notifications/track-open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_id: notificationId, screen }),
    });
  } catch { }
}

function TabIcon({ name, focused, label }: { name: any; focused: boolean; label: string }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={20}
        color={focused ? Colors.primaryLight : Colors.textMuted}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const [checking, setChecking] = useState(true);
  const [subStatus, setSubStatus] = useState<UserSubscriptionStatus | null>(
    null,
  );
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    const checkAuthAndSubscription = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setTimeout(() => {
            router.replace("/(auth)/login");
          }, 0);
          setChecking(false);
          return;
        }

        // Verify active subscription before allowing app usage
        const status = await checkUserSubscription(session.user.id);
        setSubStatus(status);

        const { getNotificationPreferences } = require('@/lib/notificationStorage');
        getNotificationPreferences().then(syncAllNotifications).catch(console.error);
        // Register Expo push token with backend so AI Health Coach can send notifications
        registerExpoPushToken().catch(console.warn);
        // Start background step tracking service immediately on login
        const { initStepTracker } = require('@/lib/stepTracker');
        initStepTracker().catch(console.warn);
      } catch (err) {
        console.error("Auth and subscription check failed:", err);
      } finally {
        setChecking(false);
      }
    };
    checkAuthAndSubscription();

    // Re-check subscription when app comes into foreground (e.g. returning from UPI app)
    const appStateSub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          try {
            const status = await checkUserSubscription(session.user.id);
            setSubStatus(status);
          } catch { }
        }
      }
    });

    // Listen for notification taps → report open event to backend for analytics
    let notifSub: any = null;
    try {
      const Notifications = require('expo-notifications');
      notifSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const notifData = response?.notification?.request?.content?.data ?? {};
        const notifId = response?.notification?.request?.identifier;
        const screen = notifData?.screen;
        if (notifId) trackNotificationOpen(notifId, screen);
        // Deep link: navigate to screen if specified
        if (screen) {
          try { router.push(`/(app)/${screen}` as any); } catch { }
        }
      });
    } catch { }

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setSubStatus(null);
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 0);
      } else {
        try {
          const status = await checkUserSubscription(session.user.id);
          setSubStatus(status);
        } catch { }
      }
    });

    return () => {
      appStateSub.remove();
      listener.subscription.unsubscribe();
      notifSub?.remove?.();
    };
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f2f6f7" }}>
        <ActivityIndicator color={Colors.primaryLight} size="large" />
      </View>
    );
  }

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
          !checking &&
          !!subStatus &&
          (!subStatus.isSubscribed || subStatus.isExpired || subStatus.status === "none")
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
                : "Active Subscription Required"}
            </Text>
            <Text style={styles.expiredLockText}>
              {subStatus?.isExpired
                ? `Your subscription ended on ${subStatus.endDateStr || "recently"}. App access is paused until your plan is renewed.`
                : "An active subscription is required to access your health dashboard, diet plans, and weight loss tracking."}
            </Text>

            <TouchableOpacity
              style={styles.renewBtnPrimary}
              onPress={() => setShowPricingModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.renewBtnText}>Start ₹1 (1 Month) Trial & AutoPay</Text>
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

            <TouchableOpacity
              style={styles.lockLogoutBtn}
              onPress={async () => {
                await supabase.auth.signOut();
                router.replace("/(auth)/login");
              }}
            >
              <Text style={styles.lockLogoutText}>Log in with another account</Text>
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
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 12,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    width: "100%",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 1,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: Colors.primaryLight,
    fontWeight: "700",
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
  lockLogoutBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  lockLogoutText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
