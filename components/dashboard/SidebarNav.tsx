import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SidebarNavProps {
  userName: string;
  userEmail: string;
  onSignOut: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  userName,
  userEmail,
  onSignOut,
}) => {
  return (
    <View style={styles.sidebarContainer}>
      <View style={styles.sidebarUserBox}>
        <Text style={styles.sidebarUserName}>{userName}</Text>
        <Text style={styles.sidebarUserEmail}>{userEmail}</Text>
        <Text style={styles.sidebarUserId}>ID: #GEN-84920</Text>
      </View>

      <View style={styles.sidebarNavList}>
        <TouchableOpacity style={[styles.sidebarNavItem, styles.sidebarNavActive]}>
          <Ionicons name="grid-outline" size={18} color="#FFFFFF" />
          <Text style={[styles.sidebarNavText, styles.sidebarNavTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sidebarNavItem}>
          <Ionicons name="bar-chart-outline" size={18} color="#94A3B8" />
          <Text style={styles.sidebarNavText}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sidebarNavItem}>
          <Ionicons name="journal-outline" size={18} color="#94A3B8" />
          <Text style={styles.sidebarNavText}>Weight Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sidebarNavItem}>
          <Ionicons name="restaurant-outline" size={18} color="#94A3B8" />
          <Text style={styles.sidebarNavText}>Meal Plan</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.sidebarSignout}
        onPress={onSignOut}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={18} color="#94A3B8" />
        <Text style={styles.sidebarSignoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 200,
    backgroundColor: "#0F172A",
    padding: 16,
    gap: 20,
  },
  sidebarUserBox: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  sidebarUserName: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  sidebarUserEmail: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 1,
  },
  sidebarUserId: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  sidebarNavList: {
    gap: 4,
    flex: 1,
  },
  sidebarNavItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sidebarNavActive: {
    backgroundColor: "#2563EB",
  },
  sidebarNavText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#94A3B8",
  },
  sidebarNavTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sidebarSignout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  sidebarSignoutText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#94A3B8",
  },
});

export default SidebarNav;
