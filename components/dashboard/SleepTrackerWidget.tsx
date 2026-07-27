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
}

export const SleepTrackerWidget: React.FC<SleepTrackerWidgetProps> = ({
  todaySleep,
  onLogSleep,
  onOpenHistory,
  onIncreaseSleep,
  onDecreaseSleep,
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

  return (
    <View style={styles.trackerCardWidget}>
      {/* Header */}
      <View style={styles.trackerWidgetHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="moon" size={16} color="#6366F1" />
          <Text style={styles.cardHeaderTitle}>Sleep Tracker</Text>
        </View>
        <View style={[styles.indigoBadgeChip, { backgroundColor: stage.bg }]}>
          <Text style={[styles.indigoBadgeText, { color: stage.color }]}>
            {stage.label}
          </Text>
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

          {/* Center Overlay Content (Matching Uploaded Image) */}
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

      {/* Action Row */}
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
    borderRadius: 12,
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
  /* Action Row */
  sleepActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  sleepLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6366F1",
    paddingHorizontal: 14,
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
