import React, { useEffect, useState } from "react";
import { Tabs, router, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { fetchUserPrimaryGoal, isWeightLossGoal, getRouteForPrimaryGoal } from "@/lib/primaryGoal";
import { PrimaryGoalModal } from "@/components/PrimaryGoalModal";
import { CustomBottomTabBar } from "@/components/dashboard/CustomBottomTabBar";
import { QuickLogModal } from "@/components/dashboard/QuickLogModal";

export default function DashboardLayout() {
  const pathname = usePathname();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [currentGoal, setCurrentGoal] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user || !isMounted) return;
      const uid = session.user.id;
      setUserId(uid);
      const goal = await fetchUserPrimaryGoal(uid);
      if (isMounted) {
        setCurrentGoal(goal);
        if (!goal) {
          setShowGoalModal(true);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Guard: If user chose a non-weight goal, they should ONLY see their goal page & profile section!
  useEffect(() => {
    if (currentGoal && !isWeightLossGoal(currentGoal)) {
      if (!pathname.includes("/profile")) {
        router.replace(getRouteForPrimaryGoal(currentGoal) as any);
      }
    }
  }, [currentGoal, pathname]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => (
          <CustomBottomTabBar
            {...props}
            primaryGoal={currentGoal}
            onPressCenterButton={() => setShowQuickLogModal(true)}
          />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Tab 1: Home */}
        <Tabs.Screen name="index" />

        {/* Tab 2: Track (Weight, Steps, Sleep) */}
        <Tabs.Screen name="track" />

        {/* Tab 4: Plans (Treatment Plan, Diet & Nutrition, Exercise) */}
        <Tabs.Screen name="plan" />

        {/* Tab 5: Profile */}
        <Tabs.Screen name="profile" />

        {/* Hidden sub-routes accessible via in-app navigation */}
        <Tabs.Screen name="consultation" options={{ href: null }} />
        <Tabs.Screen name="shop" options={{ href: null }} />
        <Tabs.Screen name="diet" options={{ href: null }} />
        <Tabs.Screen name="exercise" options={{ href: null }} />
        <Tabs.Screen name="steps" options={{ href: null }} />
        <Tabs.Screen name="log" options={{ href: null }} />
        <Tabs.Screen name="ai-doctor" options={{ href: null }} />
        <Tabs.Screen name="page" options={{ href: null }} />
        <Tabs.Screen name="badges" options={{ href: null }} />
        <Tabs.Screen name="fasting" options={{ href: null }} />
        <Tabs.Screen name="referral" options={{ href: null }} />
        <Tabs.Screen name="referal" options={{ href: null }} />
      </Tabs>

      {/* Center Floating Plus Quick Log Modal */}
      <QuickLogModal
        visible={showQuickLogModal}
        onClose={() => setShowQuickLogModal(false)}
        onLoggedSuccess={(type) => {
          // If weight was logged, can refresh track or home
          if (type === 'weight') {
            router.push('/(app)/dashboard/track?tab=weight' as any);
          }
        }}
      />

      {/* Primary Goal Selection Modal */}
      <PrimaryGoalModal
        visible={showGoalModal}
        userId={userId}
        initialGoal={currentGoal}
        allowDismiss={false}
        onClose={() => setShowGoalModal(false)}
        onGoalSaved={(savedGoal, targetRoute) => {
          setCurrentGoal(savedGoal);
          setShowGoalModal(false);
          router.replace(targetRoute as any);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({});
