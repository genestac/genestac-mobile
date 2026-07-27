import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface GaugeMeterProps {
  value?: number;
  maxVal?: number;
}

export const GaugeMeter: React.FC<GaugeMeterProps> = ({
  value = 0.7,
  maxVal = 2.0,
}) => {
  const safeVal = Math.max(0, value);
  const pct = Math.min(1, Math.max(0.02, safeVal / maxVal));

  // Gauge Dimensions adjusted so notch labels 0.0 and 2.0+ are 100% visible
  const cx = 100;
  const cy = 76;
  const R = 60;
  const strokeW = 10;

  // Arc length for semi-circle
  const arcLength = Math.PI * R; // ~188.5

  // Animations
  const animatedPct = useRef(new Animated.Value(0)).current;
  const iconSpin = useRef(new Animated.Value(0)).current;

  // Trigger smooth sweep animation from 0
  const triggerSweepAnimation = () => {
    // 1. Spin reload icon
    iconSpin.setValue(0);
    Animated.timing(iconSpin, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // 2. Reset meter to 0 and sweep up to target
    animatedPct.setValue(0);
    Animated.timing(animatedPct, {
      toValue: pct,
      duration: 1200,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    triggerSweepAnimation();
  }, [pct]);

  // Dashoffset interpolation for smooth arc filling
  const strokeDashoffset = animatedPct.interpolate({
    inputRange: [0, 1],
    outputRange: [arcLength, 0],
  });

  // Needle angle interpolation (-90deg at 0% -> +90deg at 100%)
  const needleAngle = animatedPct.interpolate({
    inputRange: [0, 1],
    outputRange: ["-90deg", "90deg"],
  });

  const spinAngle = iconSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Pace Classification Badge
  const getPaceCategory = () => {
    if (safeVal === 0) return { label: "No Loss Yet", color: "#64748B", bg: "#F1F5F9" };
    if (safeVal < 0.4) return { label: "Steady Pace 🌱", color: "#2563EB", bg: "#EFF6FF" };
    if (safeVal <= 1.0) return { label: "Optimal Rate 🔥", color: "#059669", bg: "#ECFDF5" };
    if (safeVal <= 1.5) return { label: "Fast Burn 🚀", color: "#D97706", bg: "#FEF3C7" };
    return { label: "Intense Loss ⚡", color: "#DC2626", bg: "#FEF2F2" };
  };

  const pace = getPaceCategory();

  // Dynamic Arc Color based on performance
  const getArcColor = () => {
    if (safeVal <= 0.4) return "#3B82F6"; // Blue
    if (safeVal <= 1.0) return "#10B981"; // Emerald
    if (safeVal <= 1.5) return "#F59E0B"; // Amber
    return "#EF4444"; // Coral Red
  };

  const activeColor = getArcColor();

  return (
    <View style={styles.gaugeWrapper}>
      {/* Top Right Reload Action Button */}
      <TouchableOpacity
        style={styles.topRightReplayBtn}
        onPress={triggerSweepAnimation}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Animated.View style={{ transform: [{ rotate: spinAngle }] }}>
          <Ionicons name="reload-outline" size={15} color="#6366F1" />
        </Animated.View>
      </TouchableOpacity>

      {/* SVG Gauge Container */}
      <View style={styles.svgBox}>
        <Svg width={200} height={104} viewBox="0 0 200 104">
          {/* Background Arc Track */}
          <Path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />

          {/* Active Color Progress Arc */}
          <AnimatedPath
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke={activeColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${arcLength}`}
            strokeDashoffset={strokeDashoffset}
          />

          {/* Scale Notches & Labels (Positioned well within SVG boundaries) */}
          <SvgText x={cx - R} y={cy + 18} fontSize="10" fontWeight="700" fill="#64748B" textAnchor="middle">
            0.0
          </SvgText>
          <SvgText x={cx} y={cy - R - 9} fontSize="10" fontWeight="700" fill="#64748B" textAnchor="middle">
            1.0
          </SvgText>
          <SvgText x={cx + R} y={cy + 18} fontSize="10" fontWeight="700" fill="#64748B" textAnchor="middle">
            2.0+
          </SvgText>
        </Svg>

        {/* Animated Metallic Speedometer Needle */}
        <Animated.View
          style={[
            styles.needleLayer,
            {
              left: cx - 2,
              top: cy - 48,
              transform: [
                { translateY: 24 },
                { rotate: needleAngle },
                { translateY: -24 },
              ],
            },
          ]}
        >
          <View style={[styles.needlePointer, { backgroundColor: "#1E293B" }]} />
        </Animated.View>

        {/* Center Pivot Hub */}
        <View style={[styles.centerHubOuter, { left: cx - 9, top: cy - 9 }]}>
          <View style={styles.centerHubInner} />
        </View>
      </View>

      {/* Main Metric Value Overlay & Status Badge */}
      <View style={styles.valueWrap}>
        <Text style={styles.mainValText}>
          {safeVal.toFixed(1)}{" "}
          <Text style={styles.unitText}>kg / week</Text>
        </Text>

        <View style={[styles.paceBadgeChip, { backgroundColor: pace.bg }]}>
          <Text style={[styles.paceBadgeText, { color: pace.color }]}>
            {pace.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gaugeWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
    width: "100%",
    position: "relative",
  },
  topRightReplayBtn: {
    position: "absolute",
    top: -28,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  svgBox: {
    position: "relative",
    width: 200,
    height: 104,
    alignItems: "center",
    marginTop: 6,
  },
  needleLayer: {
    position: "absolute",
    width: 4,
    height: 48,
    alignItems: "center",
  },
  needlePointer: {
    width: 4,
    height: 48,
    borderRadius: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  centerHubOuter: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#38BDF8",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  centerHubInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  valueWrap: {
    alignItems: "center",
    marginTop: -2,
    gap: 4,
  },
  mainValText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E293B",
  },
  unitText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  paceBadgeChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  paceBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
});

export default GaugeMeter;
