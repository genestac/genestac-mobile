import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Fonts, Spacing, Radius } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import RazorpayCheckout from "react-native-razorpay";
import {
  createRazorpayOrder,
  recordSuccessfulPayment,
  fetchMobilePlans,
  RAZORPAY_KEY_ID,
  RazorpayPlan,
} from "@/lib/razorpay";
import { TermsModal } from "@/components/TermsModal";
import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal";

interface PricingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribeSuccess?: () => void;
}

const PRO_FEATURES = [
  {
    icon: "scale-outline",
    title: "Weight Loss & Diet Plans",
    desc: "Personalized meal plans, calorie tracking, and weight loss progress.",
  },
  {
    icon: "fitness-outline",
    title: "Steps & Exercise Plans",
    desc: "Daily step counter, workout routines, and active burn goals.",
  },
  {
    icon: "water-outline",
    title: "Water & Hydration Tracking",
    desc: "Daily intake targets, water loggers, and hydration progress.",
  },
  {
    icon: "moon-outline",
    title: "Sleep & Recovery Tracking",
    desc: "Track sleep duration, rest quality, and recovery insights.",
  },
];

export const PricingModal: React.FC<PricingModalProps> = ({
  visible,
  onClose,
  onSubscribeSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>("autopay");
  const [plansMap, setPlansMap] = useState<Record<string, RazorpayPlan>>({});
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
  }>({ id: "", name: "", email: "", phone: "" });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: userData } = await supabase
            .from("users")
            .select("name, email, phone")
            .eq("id", session.user.id)
            .maybeSingle();

          setUserInfo({
            id: session.user.id,
            name: userData?.name || session.user.email?.split("@")[0] || "User",
            email: userData?.email || session.user.email || "",
            phone: userData?.phone || "",
          });
        }
      } catch (e) {
        console.error("Error fetching user profile for checkout:", e);
      }
    };

    const loadPlans = async () => {
      setLoadingPlans(true);
      const plans = await fetchMobilePlans();
      setPlansMap(plans);
      // Ensure selected plan is available
      if (plans["autopay"]) setSelectedPlan("autopay");
      else if (Object.keys(plans).length > 0)
        setSelectedPlan(Object.keys(plans)[0]);
      setLoadingPlans(false);
    };

    if (visible) {
      fetchUser();
      loadPlans();
    }
  }, [visible]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const plan = plansMap[selectedPlan];
      if (!plan) {
        Alert.alert("Error", "Selected plan not found. Please try again.");
        setSubscribing(false);
        return;
      }
      const order = await createRazorpayOrder(plan, userInfo.id);
      if (!order) {
        Alert.alert(
          "Payment Error",
          "Failed to initialize payment. Please try again.",
        );
        setSubscribing(false);
        return;
      }

      // Build native Razorpay options
      const isSubscription = order.orderId.startsWith("sub_");
      const options: any = {
        key: RAZORPAY_KEY_ID,
        name: "Genestac Health",
        description: plan.title,
        prefill: {
          name: userInfo.name || "Patient",
          email: userInfo.email || "",
          contact: userInfo.phone || "",
        },
        theme: { color: "#12879a" },
      };

      if (isSubscription) {
        options.subscription_id = order.orderId;
      } else {
        options.order_id = order.orderId;
        options.amount = String(order.amountPaise);
        options.currency = "INR";
      }

      setSubscribing(false);

      // Open native Razorpay checkout
      const paymentData = await RazorpayCheckout.open(options);

      // Payment succeeded
      setSubscribing(true);
      await recordSuccessfulPayment({
        userId: userInfo.id,
        plan,
        orderId:
          paymentData.razorpay_order_id ||
          (paymentData as any).razorpay_subscription_id ||
          order.orderId,
        paymentId: paymentData.razorpay_payment_id,
        signature: paymentData.razorpay_signature,
        userName: userInfo.name,
        userEmail: userInfo.email,
        userPhone: userInfo.phone,
      });
      await AsyncStorage.setItem("@genestac_is_pro", "true");
      setSubscribing(false);
      Alert.alert(
        "🎉 Welcome to Genestac Pro!",
        `Your ${plan.title} is active! All VIP features & analytics are unlocked.`,
        [
          {
            text: "Awesome!",
            onPress: () => {
              onSubscribeSuccess?.();
              onClose();
            },
          },
        ],
      );
    } catch (err: any) {
      setSubscribing(false);
      // err.code === 'PAYMENT_CANCELLED' means user dismissed the sheet
      if (err?.code !== "PAYMENT_CANCELLED") {
        Alert.alert(
          "Payment Failed",
          err?.description || err?.message || "Payment could not be completed.",
        );
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={s.container}
        edges={["top", "bottom", "left", "right"]}
      >
        {/* Header Bar */}
        <View style={s.headerBar}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Genestac Pro</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <View style={s.heroCard}>
            <View style={s.crownCircle}>
              <Ionicons name="sparkles" size={32} color="#f59e0b" />
            </View>
            <Text style={s.heroTitle}>Unlock Your Full Potential</Text>
            <Text style={s.heroSubtitle}>
              Supercharge your health journey with advanced analytics,
              gamification & VIP perks.
            </Text>
          </View>

          {/* Feature List */}
          <View style={s.featuresContainer}>
            <Text style={s.sectionHeader}>WHAT'S INCLUDED IN PRO</Text>
            {PRO_FEATURES.map((feat, idx) => (
              <View key={idx} style={s.featureRow}>
                <View style={s.featureIconBox}>
                  <Ionicons
                    name={feat.icon as any}
                    size={20}
                    color={Colors.primaryLight}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureTitle}>{feat.title}</Text>
                  <Text style={s.featureDesc}>{feat.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Pricing Options */}
          <Text style={s.sectionHeader}>SELECT YOUR PLAN</Text>
          <View style={s.plansContainer}>
            {loadingPlans ? (
              <ActivityIndicator
                color={Colors.primary}
                size="large"
                style={{ marginVertical: 32 }}
              />
            ) : (
              // Order them based on a specific logical array if they exist
              ["autopay", "annual", "sixMonth", "monthly"]
                .filter((slug) => plansMap[slug])
                .map((slug) => {
                  const plan = plansMap[slug];
                  const isSelected = selectedPlan === slug;

                  return (
                    <TouchableOpacity
                      key={slug}
                      style={[s.planCard, isSelected && s.planCardSelected]}
                      onPress={() => setSelectedPlan(slug)}
                      activeOpacity={0.88}
                    >
                      {plan.badge_text ? (
                        <View
                          style={[
                            s.badgeRibbon,
                            plan.badge_color
                              ? { backgroundColor: plan.badge_color }
                              : {},
                          ]}
                        >
                          <Text style={s.badgeRibbonText}>
                            {plan.badge_text}
                          </Text>
                        </View>
                      ) : null}
                      <View style={s.planRow}>
                        <View style={s.radioCircle}>
                          {isSelected && <View style={s.radioInner} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.planName}>{plan.title}</Text>
                          <Text style={s.planSubtext}>{plan.description}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={[
                              s.planPrice,
                              plan.badge_color
                                ? { color: plan.badge_color }
                                : {},
                            ]}
                          >
                            {plan.term}
                          </Text>
                          <Text style={s.planPeriod}>{plan.cadence}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
            )}
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={[
              s.subscribeBtn,
              (subscribing ||
                loadingPlans ||
                Object.keys(plansMap).length === 0) && { opacity: 0.75 },
            ]}
            onPress={handleSubscribe}
            disabled={
              subscribing || loadingPlans || Object.keys(plansMap).length === 0
            }
            activeOpacity={0.85}
          >
            {subscribing ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={s.subscribeBtnText}>
                {plansMap[selectedPlan]?.cta || "Subscribe Now"}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={s.guaranteeText}>
            🔒 Secured by App Store / Google Play. Cancel anytime in settings.
          </Text>

          {/* Legal / Restore Links */}
          <View style={s.legalRow}>
            <TouchableOpacity
              onPress={() => setShowTermsModal(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={s.legalText}>Terms & Conditions</Text>
            </TouchableOpacity>
            <Text style={s.dot}>·</Text>
            <TouchableOpacity
              onPress={() => setShowPrivacyModal(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={s.legalText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Terms & Conditions Modal Overlay */}
      <TermsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        useNativeModal={false}
      />

      {/* Privacy Policy Modal Overlay */}
      <PrivacyPolicyModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        useNativeModal={false}
      />
    </Modal>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  heroCard: {
    backgroundColor: Colors.dark,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.xs,
  },
  crownCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    textAlign: "center",
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: Fonts.sizes.xs,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginTop: Spacing.xs,
  },
  featuresContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  plansContainer: {
    gap: Spacing.sm,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.md,
    position: "relative",
    marginTop: 10,
  },
  planCardSelected: {
    borderColor: Colors.primaryLight,
    backgroundColor: "#F0FDF8",
  },
  badgeRibbon: {
    position: "absolute",
    top: -11,
    right: 16,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeRibbonText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.white,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryLight,
  },
  planName: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  planSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  planPrice: {
    fontSize: Fonts.sizes.md,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  planPeriod: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  subscribeBtn: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: Spacing.xs,
  },
  subscribeBtnText: {
    fontSize: Fonts.sizes.md,
    fontWeight: "800",
    color: Colors.white,
  },
  guaranteeText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  legalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  dot: {
    color: Colors.textMuted,
  },
});
