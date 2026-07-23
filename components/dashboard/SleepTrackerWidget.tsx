import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { SleepLog } from "@/lib/types";

interface SleepTrackerWidgetProps {
  todaySleep: SleepLog;
  onLogSleep: () => void;
  onOpenHistory?: () => void;
  onIncreaseSleep?: () => void;
  onDecreaseSleep?: () => void;
}

export const SleepTrackerWidget: React.FC<SleepTrackerWidgetProps> = ({
  todaySleep,
  onLogSleep,
  onOpenHistory,
  onIncreaseSleep,
  onDecreaseSleep,
}) => {
  const hours = todaySleep.hours;
  const targetHours = 8.0;
  const progress = Math.min(1, Math.max(0, hours / targetHours));

  const size = 64;
  const strokeWidth = 4;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.trackerCardWidget}>
      <View style={styles.trackerWidgetHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="moon-outline" size={18} color="#6366F1" />
          <Text style={styles.cardHeaderTitle}>Sleep Tracker</Text>
        </View>
        <View style={styles.indigoBadgeChip}>
          <Text style={styles.indigoBadgeText}>Optimal</Text>
        </View>
      </View>

      <View style={styles.sleepContentContainer}>
        {/* Left Side: SVG Progress Ring with Moon Icon */}
        <View style={styles.ringContainer}>
          <Svg width={size} height={size}>
            {/* Background Track Circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Active Arc that grows/shrinks dynamically */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#6366F1"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${center} ${center})`}
            />
          </Svg>
          <View style={styles.ringCenterIcon}>
            <Ionicons name="moon-outline" size={22} color="#6366F1" />
          </View>
        </View>

        {/* Right Side: Stepper Pill Box matching user design */}
        <View style={styles.pillControlBox}>
          <TouchableOpacity
            style={styles.stepBtnSquare}
            onPress={onDecreaseSleep}
            activeOpacity={0.7}
          >
            <Text style={styles.stepBtnText}>-</Text>
          </TouchableOpacity>

          <View style={styles.hoursDisplayCenter}>
            <Text style={styles.hoursBigVal}>
              {hours.toFixed(1)}{" "}
              <Text style={styles.hoursUnitText}>hrs</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.stepBtnSquare}
            onPress={onIncreaseSleep}
            activeOpacity={0.7}
          >
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sleepActionRow}>
        <TouchableOpacity
          style={styles.sleepLogBtn}
          onPress={onLogSleep}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={15} color="#FFFFFF" />
          <Text style={styles.sleepLogBtnText}>Log Sleep</Text>
        </TouchableOpacity>

        {onOpenHistory && (
          <TouchableOpacity
            style={styles.sleepHistoryBtn}
            onPress={onOpenHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={15} color="#6366F1" />
            <Text style={styles.sleepHistoryBtnText}>History</Text>
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
  trackerWidgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  indigoBadgeChip: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  indigoBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6366F1",
  },
  sleepContentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  ringContainer: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringCenterIcon: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  pillControlBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    // backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    width: "100%",
  },
  stepBtnSquare: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: -2,
  },
  hoursDisplayCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  hoursBigVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  hoursUnitText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  sleepActionRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  sleepLogBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6366F1",
    paddingVertical: 8,
    borderRadius: 8,
  },
  sleepLogBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sleepHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sleepHistoryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6366F1",
  },
});

export default SleepTrackerWidget;
