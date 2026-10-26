import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { fetchUserPrimaryGoal, isWeightLossGoal, getRouteForPrimaryGoal } from "@/lib/primaryGoal";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

interface TopNavbarProps {
  userName: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ userName }) => {
  const handleLogoPress = () => {
    router.push("/(app)/dashboard");
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <View style={styles.topNavbar}>
        <View style={styles.topNavLeft}>
          <TouchableOpacity
            style={styles.logoWrap}
            onPress={handleLogoPress}
            activeOpacity={0.8}
          >
            <Image
              source={require("../../assets/images/brand/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Svg height={22} width={84} viewBox="0 0 84 22">
              <Defs>
                <SvgGradient id="topNavLogoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#12879a" />
                  <Stop offset="100%" stopColor="#5cbf5a" />
                </SvgGradient>
              </Defs>
              <SvgText
                fill="url(#topNavLogoGrad)"
                fontSize="17"
                fontWeight="800"
                letterSpacing="-0.3"
                x="0"
                y="17"
              >
                Genestac
              </SvgText>
            </Svg>
          </TouchableOpacity>
        </View>

        <View style={styles.topNavRight}>
          <TouchableOpacity
            style={styles.topProfileBadge}
            onPress={() => router.push("/(app)/dashboard/profile")}
            activeOpacity={0.7}
          >
            <Text style={styles.topProfileText}>
              {(userName || "User").substring(0, 2).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topNavbar: {
    height: 64,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topNavLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoImage: {
    width: 30,
    height: 34,
  },
  topNavRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topProfileBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  topProfileText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#059669",
  },
});

export default TopNavbar;
