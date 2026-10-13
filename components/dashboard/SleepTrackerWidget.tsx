import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { SleepLog } from "@/lib/types";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SleepTrackerWidgetProps {
  todaySleep: SleepLog;
  onLogSleep: () => void;
  onOpenHistory?: () => void;
  onIncreaseSleep?: () => void;
  onDecreaseSleep?: () => void;
  onTriggerAutoSync?: () => void;
  isAutoSyncing?: boolean;
}

export const SleepTrackerWidget: React.FC<SleepTrackerWidgetProps> = ({
  todaySleep,
  onLogSleep,
  onOpenHistory,
  onIncreaseSleep,
  onDecreaseSleep,
  onTriggerAutoSync,
  isAutoSyncing = false,
}) => {
  const hours = todaySleep.hours;
  const targetHours = 12.0;
  const progress = Math.min(1, Math.max(0, hours / targetHours));

  // Circular Ring Sizing for prominent central display
  const size = 136;
  const strokeWidth = 7;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animations
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const valScale = useRef(new Animated.Value(1)).current;

  // Smooth Arc Transition on Progress Change
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // Tactile scale pulse when stepping hours
  const triggerStepFeedback = () => {
    Animated.sequence([
      Animated.timing(valScale, {
        toValue: 1.12,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(valScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleIncrease = () => {
    triggerStepFeedback();
    if (onIncreaseSleep) onIncreaseSleep();
  };

  const handleDecrease = () => {
    triggerStepFeedback();
    if (onDecreaseSleep) onDecreaseSleep();
  };

  // Convert decimal hours (e.g. 7.7) to hours + minutes (7h 42m)
  const h = Math.floor(hours);
  const m = Math.round((hours % 1) * 60);

  // Dynamic Sleep Stage Badge
  const getSleepStage = () => {
    if (hours === 0) return { label: "No Log", color: "#64748B", bg: "#F1F5F9" };
    if (hours < 6) return { label: "Light Rest", color: "#D97706", bg: "#FEF3C7" };
    if (hours >= 7.5 && hours <= 9) return { label: "Optimal Peak", color: "#6366F1", bg: "#EEF2FF" };
    if (hours > 9) return { label: "Extended Rest", color: "#059669", bg: "#ECFDF5" };
    return { label: "Good Recovery", color: "#2563EB", bg: "#EFF6FF" };
  };

  const stage = getSleepStage();

  const getSourceBadge = () => {
    if (todaySleep.source === "health_connect") {
      return { label: "Google Health", color: "#059669", bg: "#ECFDF5", icon: "fitness-outline" as const };
    }
    if (todaySleep.source === "sensor_auto") {
      return { label: "Auto Sensors", color: "#6366F1", bg: "#EEF2FF", icon: "hardware-chip-outline" as const };
    }
    return null;
  };

  const sourceBadge = getSourceBadge();

  return (
    <View style={styles.trackerCardWidget}>
      {/* Header */}
      <View style={styles.trackerWidgetHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="moon" size={16} color="#6366F1" />
          <Text style={styles.cardHeaderTitle}>Sleep Tracker</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {sourceBadge && (
            <View style={[styles.sourceBadgeChip, { backgroundColor: sourceBadge.bg }]}>
              <Ionicons name={sourceBadge.icon} size={11} color={sourceBadge.color} />
              <Text style={[styles.sourceBadgeText, { color: sourceBadge.color }]}>
                {sourceBadge.label}
              </Text>
            </View>
          )}

          <View style={[styles.indigoBadgeChip, { backgroundColor: stage.bg }]}>
            <Text style={[styles.indigoBadgeText, { color: stage.color }]}>
              {stage.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Sleep Content Row */}
      <View style={styles.sleepContentContainer}>
        {/* Left Side: Plus (+) Button */}
        <TouchableOpacity
          style={styles.stepBtnSide}
          onPress={handleIncrease}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={22} color="#1E293B" />
        </TouchableOpacity>

        {/* Center: Circular Sleep Ring with Moon, Time, and "Total Sleep" */}
        <View style={styles.ringContainer}>
          <Svg width={size} height={size}>
            {/* Background Track Circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#EEF2FF"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Active Progress Arc */}
            <AnimatedCircle
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

          {/* Center Overlay Content */}
          <Animated.View
            style={[
              styles.ringInnerContent,
              { transform: [{ scale: valScale }] },
            ]}
          >
            {/* Top Center: Glowing Purple Moon Icon */}
            <View style={styles.moonGlowWrap}>
              <Ionicons name="moon" size={20} color="#6366F1" />
            </View>

            {/* Middle Center: Time in 7h 42m format */}
            <Text style={styles.mainTimeText}>
              {h}h{" "}
              <Text style={styles.mainTimeSubText}>
                {m < 10 ? `0${m}` : m}m
              </Text>
            </Text>

            {/* Bottom Center: "Total Sleep" Label */}
            <Text style={styles.totalSleepLabel}>Total Sleep</Text>
          </Animated.View>
        </View>

        {/* Right Side: Minus (-) Button */}
        <TouchableOpacity
          style={styles.stepBtnSide}
          onPress={handleDecrease}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Sleep Bedtime and Waketime interval if auto-tracked */}
      {(todaySleep.bedTime || todaySleep.wakeTime) && (
        <View style={styles.sleepIntervalRow}>
          <Ionicons name="bed-outline" size={13} color="#6366F1" />
          <Text style={styles.sleepIntervalText}>
            Bed: {todaySleep.bedTime || "11:15 PM"}
          </Text>
          <Ionicons name="arrow-forward" size={10} color="#94A3B8" />
          <Ionicons name="sunny-outline" size={13} color="#D97706" />
          <Text style={styles.sleepIntervalText}>
            Wake: {todaySleep.wakeTime || "7:30 AM"}
          </Text>
        </View>
      )}

      {/* Action Row */}
      <View style={styles.sleepActionRow}>
        {onTriggerAutoSync && (
          <TouchableOpacity
            style={styles.sleepAutoSyncBtn}
            onPress={onTriggerAutoSync}
            disabled={isAutoSyncing}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isAutoSyncing ? "sync" : "flash-outline"}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.sleepAutoSyncBtnText}>
              {isAutoSyncing ? "Syncing..." : "Auto-Sync Android"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.sleepLogBtn}
          onPress={onLogSleep}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={14} color="#6366F1" />
          <Text style={styles.sleepLogBtnText}>Manual Log</Text>
        </TouchableOpacity>

        {onOpenHistory && (
          <TouchableOpacity
            style={styles.sleepHistoryBtn}
            onPress={onOpenHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={14} color="#6366F1" />
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
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  indigoBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  /* Main Content Row */
  sleepContentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
  },
  stepBtnSide: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#a780f0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  /* Central Circular Ring Display */
  ringContainer: {
    width: 136,
    height: 136,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringInnerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  moonGlowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  mainTimeText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  mainTimeSubText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  totalSleepLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  sourceBadgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  sleepIntervalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 8,
    marginTop: -4,
  },
  sleepIntervalText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  /* Action Row */
  sleepActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  sleepAutoSyncBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#6366F1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  sleepAutoSyncBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sleepLogBtn: {
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
  sleepLogBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6366F1",
  },
  sleepHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sleepHistoryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
});

export default SleepTrackerWidget;
