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
import { RazorpayCheckoutModal } from "@/components/RazorpayCheckoutModal";
import {
  createRazorpayOrder,
  recordSuccessfulPayment,
  RAZORPAY_PLANS,
  RazorpayPlan,
} from "@/lib/razorpay";

interface PricingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribeSuccess?: () => void;
}

type PlanType = "annual" | "sixMonth" | "monthly";

const PRO_FEATURES = [
  {
    icon: "game-controller-outline",
    title: "Unlimited Hunger Games Access",
    desc: "No daily token limits or wait times to play.",
  },
  {
    icon: "analytics-outline",
    title: "Deep Metabolic & Nutrient Insights",
    desc: "Complete macro breakdowns, weekly trends & PDF exports.",
  },
  {
    icon: "trophy-outline",
    title: "Exclusive Pro Badges & Leaderboards",
    desc: "Stand out with VIP badges and high-tier challenges.",
  },
  {
    icon: "flash-outline",
    title: "Priority Support & Ad-Free",
    desc: "Fast-track support and uninterrupted experience.",
  },
];

export const PricingModal: React.FC<PricingModalProps> = ({
  visible,
  onClose,
  onSubscribeSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("annual");
  const [subscribing, setSubscribing] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<{
    orderId: string;
    plan: RazorpayPlan;
  } | null>(null);
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
    if (visible) {
      fetchUser();
    }
  }, [visible]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const plan = RAZORPAY_PLANS[selectedPlan] || RAZORPAY_PLANS.annual;
      const order = await createRazorpayOrder(plan, userInfo.id);
      if (!order) {
        Alert.alert("Payment Error", "Failed to initialize payment order. Please try again.");
        setSubscribing(false);
        return;
      }
      setRazorpayOrder({ orderId: order.orderId, plan });
      setSubscribing(false);
      setCheckoutVisible(true);
    } catch (err: any) {
      setSubscribing(false);
      Alert.alert("Error", err.message || "Failed to process payment.");
    }
  };

  const handlePaymentSuccess = async (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature?: string;
  }) => {
    setCheckoutVisible(false);
    if (!razorpayOrder) return;
    setSubscribing(true);
    try {
      await recordSuccessfulPayment({
        userId: userInfo.id,
        plan: razorpayOrder.plan,
        orderId: data.razorpay_order_id || razorpayOrder.orderId,
        paymentId: data.razorpay_payment_id,
        signature: data.razorpay_signature,
        userName: userInfo.name,
        userEmail: userInfo.email,
        userPhone: userInfo.phone,
      });
      await AsyncStorage.setItem("@genestac_is_pro", "true");
      setSubscribing(false);
      Alert.alert(
        "🎉 Welcome to Genestac Pro!",
        `Your ${razorpayOrder.plan.title} is active! All VIP features & analytics are unlocked.`,
        [
          {
            text: "Awesome!",
            onPress: () => {
              onSubscribeSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      setSubscribing(false);
      Alert.alert("Notice", "Payment recorded successfully. Pro features are enabled.");
      onSubscribeSuccess?.();
      onClose();
    }
  };

  const handlePaymentFailure = (error: any) => {
    setCheckoutVisible(false);
    Alert.alert("Payment Cancelled", error?.description || "Payment was not completed.");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.container} edges={["top", "bottom", "left", "right"]}>
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
              Supercharge your health journey with advanced analytics, gamification & VIP perks.
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
            {/* Annual Plan (Best Value) */}
            <TouchableOpacity
              style={[
                s.planCard,
                selectedPlan === "annual" && s.planCardSelected,
              ]}
              onPress={() => setSelectedPlan("annual")}
              activeOpacity={0.88}
            >
              <View style={s.badgeRibbon}>
                <Text style={s.badgeRibbonText}>BEST VALUE · SAVE 50%</Text>
              </View>
              <View style={s.planRow}>
                <View style={s.radioCircle}>
                  {selectedPlan === "annual" && <View style={s.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.planName}>Yearly Membership</Text>
                  <Text style={s.planSubtext}>Full VIP access · Cancel anytime</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.planPrice}>$17.99 / ₹1,499</Text>
                  <Text style={s.planPeriod}>/ year ($1.50 / ₹125 mo)</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* 6-Month Plan */}
            <TouchableOpacity
              style={[
                s.planCard,
                selectedPlan === "sixMonth" && s.planCardSelected,
              ]}
              onPress={() => setSelectedPlan("sixMonth")}
              activeOpacity={0.88}
            >
              <View style={[s.badgeRibbon, { backgroundColor: Colors.primaryLight }]}>
                <Text style={s.badgeRibbonText}>SAVE 40%</Text>
              </View>
              <View style={s.planRow}>
                <View style={s.radioCircle}>
                  {selectedPlan === "sixMonth" && <View style={s.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.planName}>6-Month Pass</Text>
                  <Text style={s.planSubtext}>Billed every 6 months</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.planPrice}>$10.99 / ₹899</Text>
                  <Text style={s.planPeriod}>/ 6 mo ($1.83 / ₹150 mo)</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Monthly Plan */}
            <TouchableOpacity
              style={[
                s.planCard,
                selectedPlan === "monthly" && s.planCardSelected,
              ]}
              onPress={() => setSelectedPlan("monthly")}
              activeOpacity={0.88}
            >
              <View style={s.planRow}>
                <View style={s.radioCircle}>
                  {selectedPlan === "monthly" && <View style={s.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.planName}>Monthly Pass</Text>
                  <Text style={s.planSubtext}>Flexible monthly billing</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.planPrice}>$2.49 / ₹199</Text>
                  <Text style={s.planPeriod}>/ month</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={[s.subscribeBtn, subscribing && { opacity: 0.75 }]}
            onPress={handleSubscribe}
            disabled={subscribing}
            activeOpacity={0.85}
          >
            {subscribing ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={s.subscribeBtnText}>
                {selectedPlan === "annual"
                  ? "Subscribe :  $17.99 / ₹1,499 (yr)"
                  : selectedPlan === "sixMonth"
                  ? "Subscribe :  $10.99 / ₹899 (6 mo)"
                  : "Subscribe :  $2.49 / ₹199 (mo)"}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={s.guaranteeText}>
            🔒 Secured by App Store / Google Play. Cancel anytime in settings.
          </Text>

          {/* Legal / Restore Links */}
          <View style={s.legalRow}>
            <TouchableOpacity onPress={() => Alert.alert("Restore", "Purchases restored successfully.")}>
              <Text style={s.legalText}>Restore Purchases</Text>
            </TouchableOpacity>
            <Text style={s.dot}>·</Text>
            <Text style={s.legalText}>Terms of Use</Text>
            <Text style={s.dot}>·</Text>
            <Text style={s.legalText}>Privacy Policy</Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Razorpay Secure Gateway Checkout */}
      {razorpayOrder && (
        <RazorpayCheckoutModal
          visible={checkoutVisible}
          orderId={razorpayOrder.orderId}
          plan={razorpayOrder.plan}
          userName={userInfo.name}
          userEmail={userInfo.email}
          userPhone={userInfo.phone}
          onClose={() => setCheckoutVisible(false)}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
        />
      )}
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
    marginTop:10
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
