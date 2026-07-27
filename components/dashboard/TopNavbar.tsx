import React from "react";
import { View, Text, StyleSheet, Image, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface TopNavbarProps {
  userName: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ userName }) => {
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <View style={styles.topNavbar}>
        <View style={styles.topNavLeft}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/brand/logo.webp")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        

        <View style={styles.topNavRight}>
          <View style={styles.topProfileBadge}>
            <Text style={styles.topProfileText}>
              {userName.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topNavbar: {
    height: 72,
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
    gap: 12,
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  topNavSearchWrap: {
    flex: 1,
    maxWidth: 400,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  topNavSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1E293B",
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
