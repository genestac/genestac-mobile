import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface WaterTrackerWidgetProps {
  waterAmount: number;
  onAddWater: (amount: number) => void;
  onResetWater: () => void;
  onOpenHistory?: () => void;
}

export const WaterTrackerWidget: React.FC<WaterTrackerWidgetProps> = ({
  waterAmount,
  onAddWater,
  onResetWater,
  onOpenHistory,
}) => {
  const targetWater = 2.75;
  const remaining = Math.max(0, parseFloat((targetWater - waterAmount).toFixed(2)));

  return (
    <View style={styles.trackerCardWidget}>
      <View style={styles.widgetHeaderRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="water-outline" size={16} color="#2563EB" />
          <Text style={styles.widgetHeaderTitle}>Hydration Tracker</Text>
        </View>
        <View style={styles.blueBadgePill}>
          <Text style={styles.blueBadgeText}>Target 2.75L</Text>
        </View>
      </View>

      <View style={styles.waterGraphicBox}>
        <View style={styles.waterGlassGraphic}>
          <Ionicons name="water" size={36} color="#3B82F6" />
        </View>
        <Text style={styles.waterBigNum}>
          {waterAmount.toFixed(2)}{" "}
          <Text style={{ fontSize: 14, color: "#64748B" }}>L</Text>
        </Text>
        <Text style={styles.waterSubText}>
          {remaining > 0 ? `${remaining} L remaining to reach goal` : "Goal Reached! 🎉"}
        </Text>
      </View>

      <View style={styles.waterBtnsRow}>
        <TouchableOpacity
          style={styles.waterAddBtn}
          onPress={() => onAddWater(0.25)}
        >
          <Text style={styles.waterAddBtnText}>+0.25L</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.waterAddBtn}
          onPress={() => onAddWater(0.5)}
        >
          <Text style={styles.waterAddBtnText}>+0.5L</Text>
        </TouchableOpacity>
        {onOpenHistory ? (
          <TouchableOpacity
            style={styles.waterHistoryBtn}
            onPress={onOpenHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={14} color="#2563EB" />
            <Text style={styles.waterHistoryBtnText}>History</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.waterResetBtn}
            onPress={onResetWater}
          >
            <Text style={styles.waterResetBtnText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  trackerCardWidget: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  widgetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  widgetHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  blueBadgePill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  blueBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  waterGraphicBox: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 4,
  },
  waterGlassGraphic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  waterBigNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
  },
  waterSubText: {
    fontSize: 11,
    color: "#64748B",
  },
  waterBtnsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  waterAddBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  waterAddBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  waterHistoryBtn: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  waterHistoryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  waterResetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  waterResetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
});

export default WaterTrackerWidget;
