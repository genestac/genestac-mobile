import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { PrimaryGoalOption } from "@/lib/primaryGoal";

interface VerticalGoalBottomNavProps {
  goal: PrimaryGoalOption;
  activeTab: "goal" | "profile";
}

export const VerticalGoalBottomNav: React.FC<VerticalGoalBottomNavProps> = ({
  goal,
  activeTab,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset =
    insets.bottom > 0 ? insets.bottom : Platform.OS === "android" ? 16 : 10;

  const getShortTitle = (title: string) => {
    if (title.toLowerCase().includes("pain")) return "Pain & Rehab";
    if (title.toLowerCase().includes("heart")) return "Heart & Sugar";
    if (title.toLowerCase().includes("hair")) return "Hair Care";
    if (title.toLowerCase().includes("skin")) return "Skin & Laser";
    return title;
  };

  return (
    <View
      style={[
        styles.tabBarWrapper,
        {
          paddingBottom: bottomInset,
          height: 58 + bottomInset,
        },
      ]}
    >
      {/* 1. Primary Goal Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.8}
        onPress={() => {
          if (activeTab !== "goal") {
            router.replace(goal.route as any);
          }
        }}
      >
        {goal.iconType === "mci" ? (
          <MaterialCommunityIcons
            name={goal.iconName as any}
            size={22}
            color={activeTab === "goal" ? goal.color : "#94A3B8"}
          />
        ) : (
          <Ionicons
            name={
              activeTab === "goal"
                ? (goal.iconName as any)
                : (`${goal.iconName}-outline` as any)
            }
            size={22}
            color={activeTab === "goal" ? goal.color : "#94A3B8"}
          />
        )}
        <Text
          style={[
            styles.tabLabel,
            activeTab === "goal" && [styles.tabLabelActive, { color: goal.color }],
          ]}
        >
          {getShortTitle(goal.title)}
        </Text>
      </TouchableOpacity>

      {/* 2. Profile Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.8}
        onPress={() => {
          if (activeTab !== "profile") {
            router.push("/(app)/dashboard/profile");
          }
        }}
      >
        <Ionicons
          name={activeTab === "profile" ? "person" : "person-outline"}
          size={22}
          color={activeTab === "profile" ? "#0A8554" : "#94A3B8"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "profile" && styles.tabLabelActive,
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 24,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    gap: 3,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 1,
  },
  tabLabelActive: {
    color: "#0A8554",
    fontWeight: "700",
  },
});

export default VerticalGoalBottomNav;
