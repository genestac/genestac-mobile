import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Radius } from "@/constants/colors";

interface CurrentStatsCardsProps {
  current: number;
  startWeight: number;
  target: number;
  lost: number;
  toGo: number;
  lastLoggedDate?: string;
}

export const CurrentStatsCards: React.FC<CurrentStatsCardsProps> = ({
  current,
  startWeight,
  target,
  lost,
  toGo,
  lastLoggedDate,
}) => {
  return (
    <View style={styles.statsCardsRow}>
      {/* Current Weight Card */}
      <View style={styles.statMiniCard}>
        <View style={styles.cardHeaderWithIcon}>
          <Ionicons name="scale-outline" size={15} color="#2563EB" />
          <Text style={styles.sidebarStatLabel}>Current</Text>
        </View>
        <Text style={styles.sidebarStatValue}>
          {current > 0 ? `${current} kg` : "—"}
        </Text>
        {lastLoggedDate ? (
          <Text style={styles.sidebarStatDateLabel}>{lastLoggedDate}</Text>
        ) : (
          <Text style={styles.sidebarStatDateLabel}>No logs yet</Text>
        )}
        <Text style={styles.sidebarStatSubLabel}>
          {lost > 0 ? `-${lost} kg lost` : "0 kg lost"}
        </Text>
      </View>

      {/* Start Weight Card */}
      <View style={styles.statMiniCard}>
        <View style={styles.cardHeaderWithIcon}>
          <Ionicons name="flag-outline" size={15} color="#64748B" />
          <Text style={styles.sidebarStatLabel}>Start</Text>
        </View>
        <Text style={styles.sidebarStatValue}>
          {startWeight > 0 ? `${startWeight} kg` : "—"}
        </Text>
        <Text style={styles.sidebarStatSubLabel}>Baseline</Text>
      </View>

      {/* Goal Weight Card */}
      <View style={styles.statMiniCard}>
        <View style={styles.cardHeaderWithIcon}>
          <Ionicons name="trophy-outline" size={15} color="#059669" />
          <Text style={styles.sidebarStatLabel}>Goal</Text>
        </View>
        <Text style={styles.sidebarStatValue}>
          {target > 0 ? `${target} kg` : "—"}
        </Text>
        <Text style={styles.sidebarStatSubLabel}>
          {toGo > 0 ? `${toGo} kg to go` : target > 0 ? `Goal set` : "Set goal"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsCardsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeaderWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sidebarStatLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  sidebarStatValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  sidebarStatDateLabel: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 1,
  },
  sidebarStatSubLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
});

export default CurrentStatsCards;
