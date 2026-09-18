import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, View, Text, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function TabIcon({
  name,
  focused,
  label,
}: {
  name: string;
  focused: boolean;
  label: string;
}) {
  const isMCI = name.startsWith("mci:");
  const baseName = isMCI ? name.replace("mci:", "") : name;

  return (
    <View style={styles.tabItem}>
      {isMCI ? (
        <MaterialCommunityIcons
          name={(focused ? baseName : `${baseName}-outline`) as any}
          size={20}
          color={focused ? Colors.primaryLight : Colors.textMuted}
        />
      ) : (
        <Ionicons
          name={(focused ? baseName : `${baseName}-outline`) as any}
          size={20}
          color={focused ? Colors.primaryLight : Colors.textMuted}
        />
      )}
      <Text
        adjustsFontSizeToFit
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function DashboardLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 8 : 0,
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: 56 + bottomInset,
          paddingBottom: bottomInset > 0 ? bottomInset : 4,
          paddingTop: 5,
        },
        tabBarItemStyle: styles.tabBarItem,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="mci:file-document-edit"
              focused={focused}
              label="Log"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="restaurant" focused={focused} label="Diet" />
          ),
        }}
      />
      <Tabs.Screen
        name="exercise"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="barbell" focused={focused} label="Exercise" />
          ),
        }}
      />
      <Tabs.Screen
        name="steps"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="walk" focused={focused} label="Steps" />
          ),
        }}
      />
      <Tabs.Screen
        name="referral"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="gift" focused={focused} label="Refer" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" focused={focused} label="Profile" />
          ),
        }}
      />
      <Tabs.Screen
        name="page"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="badges"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="fasting"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="referal"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarItem: {
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    width: "100%",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    marginTop: 1,
    textAlign: "center",
    letterSpacing: -0.1,
    width: 200,
  },
  tabLabelActive: {
    color: Colors.primaryLight,
    fontWeight: "700",
  },
});
