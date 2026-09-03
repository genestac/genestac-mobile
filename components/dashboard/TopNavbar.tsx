import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
              source={require("../../assets/images/brand/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>genestac</Text>
          </View>
        </View>

        <View style={styles.topNavRight}>
          <View style={styles.topProfileBadge}>
            <Text style={styles.topProfileText}>
              {(userName || "User").substring(0, 2).toUpperCase()}
            </Text>
          </View>
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
    alignItems: "flex-end",
    gap: 6,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  logoText: {
    position:"absolute",
    fontSize: 12,
    fontWeight: "700",
    color: "#00ACC1",
    letterSpacing: -0.5,
    marginLeft:29,
    marginTop:-15
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
