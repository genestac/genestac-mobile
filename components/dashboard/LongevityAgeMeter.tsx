import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import Svg, {
  Path,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
  Circle,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface LongevityAgeMeterProps {
  chronoAge: number;
  bioAge: number;
  paceOfAging?: number;
}

// Scale marks from 10 to 90 years in intervals of 10
const SCALE_MARKS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

export const LongevityAgeMeter: React.FC<LongevityAgeMeterProps> = ({
  chronoAge = 38,
  bioAge = 33.4,
  paceOfAging = 0.84,
}) => {
  // SVG Dimensions & Geometry (mirrored from WeightHeroGauge)
  const svgWidth = 280;
  const svgHeight = 188;
  const cx = 140;
  const cy = 100;
  const radius = 86;
  const strokeWidth = 7;
  const needleLength = 50;

  // Arc angles (135° to 45° = 270° clockwise sweep)
  const radStart = (135 * Math.PI) / 180;
  const radEnd = (45 * Math.PI) / 180;

  const startX = cx + radius * Math.cos(radStart);
  const startY = cy + radius * Math.sin(radStart);
  const endX = cx + radius * Math.cos(radEnd);
  const endY = cy + radius * Math.sin(radEnd);

  const arcPath = `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${radius} ${radius} 0 1 1 ${endX.toFixed(1)} ${endY.toFixed(1)}`;

  // Arc circumference
  const circumference = 2 * Math.PI * radius;
  const totalArcLength = circumference * (270 / 360); // ~ 405.26

  // Biological Age Fraction (0 to 100 scale)
  const validBioAge = !isNaN(bioAge) ? bioAge : 33.4;
  const clampedBioAge = Math.min(100, Math.max(0, validBioAge));
  const bioFraction = clampedBioAge / 100;
  const targetDashoffset = totalArcLength * (1 - bioFraction);

  // Meter needle rotation angle (-135deg at 0 -> 0deg at 50 -> +135deg at 100)
  const targetNeedleDeg = -135 + bioFraction * 270;

  // Chronological Age Marker coordinates on the track
  const validChronoAge = !isNaN(chronoAge) ? chronoAge : 38;
  const clampedChronoAge = Math.min(100, Math.max(0, validChronoAge));
  const chronoFraction = clampedChronoAge / 100;
  const chronoAngleDeg = 135 + chronoFraction * 270;
  const chronoAngleRad = (chronoAngleDeg * Math.PI) / 180;
  const chronoCos = Math.cos(chronoAngleRad);
  const chronoSin = Math.sin(chronoAngleRad);
  const chronoTickR1 = radius - 10;
  const chronoTickR2 = radius + 6;
  const chronoX1 = cx + chronoTickR1 * chronoCos;
  const chronoY1 = cy + chronoTickR1 * chronoSin;
  const chronoX2 = cx + chronoTickR2 * chronoCos;
  const chronoY2 = cy + chronoTickR2 * chronoSin;
  const chronoDotX = cx + (radius + 11) * chronoCos;
  const chronoDotY = cy + (radius + 11) * chronoSin;

  // Sweep animation
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animProgress.setValue(0);
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.back(1.15)),
      useNativeDriver: false,
    }).start();
  }, [clampedBioAge]);

  const animatedDashoffset = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [totalArcLength, targetDashoffset],
  });

  const needleAngle = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["-135deg", `${targetNeedleDeg}deg`],
  });

  const yearsDiff = validChronoAge - validBioAge;
  const isYounger = yearsDiff >= 0;

  return (
    <View style={styles.container}>
      {/* ── Speedometer Meter Arc & Needle ── */}
      <View style={styles.meterContainer}>
        <Svg width={svgWidth} height={svgHeight}>
          <Defs>
            {/* Cyan -> Emerald -> Mint Gradient for biological age progress */}
            <SvgLinearGradient id="bioMeterGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#06B6D4" />
              <Stop offset="50%" stopColor="#10B981" />
              <Stop offset="100%" stopColor="#059669" />
            </SvgLinearGradient>
          </Defs>

          {/* Background Track */}
          <Path
            d={arcPath}
            stroke="rgba(79, 70, 229, 0.15)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />

          {/* Active Biological Age Gradient Arc */}
          <AnimatedPath
            d={arcPath}
            stroke="url(#bioMeterGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${totalArcLength}`}
            strokeDashoffset={animatedDashoffset}
            fill="none"
          />

          {/* Tick Marks & Scale Numbers (10, 20, 30 ... 90) */}
          {SCALE_MARKS.map((markVal) => {
            const fraction = markVal / 100;
            const angleDeg = 135 + fraction * 270;
            const angleRad = (angleDeg * Math.PI) / 180;
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);

            // Tick lines
            const tickInnerR = radius - 7;
            const tickOuterR = radius + 2;
            const tx1 = cx + tickInnerR * cos;
            const ty1 = cy + tickInnerR * sin;
            const tx2 = cx + tickOuterR * cos;
            const ty2 = cy + tickOuterR * sin;

            // Number labels positioned just inside ticks
            const labelR = radius - 17;
            const lx = cx + labelR * cos;
            const ly = cy + labelR * sin + 3;

            const isMid = markVal === 50;
            const isNearBio = Math.abs(clampedBioAge - markVal) <= 6;

            return (
              <React.Fragment key={`mark-${markVal}`}>
                <Line
                  x1={tx1}
                  y1={ty1}
                  x2={tx2}
                  y2={ty2}
                  stroke={isNearBio ? "#059669" : "rgba(79, 70, 229, 0.28)"}
                  strokeWidth={isMid ? 2 : 1.2}
                />
                <SvgText
                  x={lx}
                  y={ly}
                  fontSize={isMid ? "9.5" : "8"}
                  fontWeight={isNearBio || isMid ? "800" : "600"}
                  fill={isNearBio ? "#059669" : "#4F46E5"}
                  textAnchor="middle"
                >
                  {markVal}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Chronological Age Marker on Track */}
          <Line
            x1={chronoX1}
            y1={chronoY1}
            x2={chronoX2}
            y2={chronoY2}
            stroke="#4338CA"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Circle
            cx={chronoDotX}
            cy={chronoDotY}
            r={3.5}
            fill="#4338CA"
          />
        </Svg>

        {/* ── Animated Speedometer Needle pointing to Biological Age ── */}
        <Animated.View
          style={[
            styles.needleLayer,
            {
              left: cx - 2,
              top: cy - needleLength,
              transform: [
                { translateY: needleLength / 2 },
                { rotate: needleAngle },
                { translateY: -needleLength / 2 },
              ],
            },
          ]}
        >
          <View style={[styles.needlePointer, { height: needleLength }]}>
            <View style={styles.needleTipDot} />
          </View>
        </Animated.View>

        {/* ── Center Pivot Hub ── */}
        <View style={[styles.centerHubOuter, { left: cx - 9, top: cy - 9 }]}>
          <View style={styles.centerHubInner} />
        </View>

        {/* ── Central Age Readout directly below Hub ── */}
        <View style={[styles.valueOverlay, { top: cy + 12 }]}>
          <View style={styles.valueRow}>
            <Text style={styles.ageNumber}>{validBioAge.toFixed(1)}</Text>
            <Text style={styles.ageUnit}>yrs</Text>
          </View>
          <Text style={styles.bioAgeLabel}>Biological Age</Text>
        </View>
      </View>

      {/* ── Difference Pill & Comparison Info ── */}
      <View style={styles.badgeWrapper}>
        <View style={styles.diffPill}>
          <Ionicons
            name={isYounger ? "sparkles" : "alert-circle-outline"}
            size={13}
            color={isYounger ? "#059669" : "#D97706"}
          />
          <Text style={[styles.diffPillText, !isYounger && { color: "#D97706" }]}>
            {isYounger
              ? `${yearsDiff.toFixed(1)} yrs younger`
              : `${Math.abs(yearsDiff).toFixed(1)} yrs older`}
          </Text>
        </View>

        <View style={styles.compareRow}>
          <View style={styles.legendDot} />
          <Text style={styles.compareText}>
            Chrono: <Text style={styles.compareBold}>{validChronoAge} yrs</Text>
          </Text>
          <Text style={styles.compareDivider}>•</Text>
          <Text style={styles.compareText}>
            Pace: <Text style={styles.compareBold}>{paceOfAging}x/yr</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 0,
    paddingBottom: 4,
    marginTop: -8,
  },
  meterContainer: {
    width: 280,
    height: 188,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  needleLayer: {
    position: "absolute",
    width: 4,
    alignItems: "center",
    zIndex: 5,
  },
  needlePointer: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: "#1E1B4B",
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
    position: "relative",
    alignItems: "center",
  },
  needleTipDot: {
    width: 4,
    height: 6,
    borderRadius: 2,
    backgroundColor: "#059669",
    position: "absolute",
    top: 0,
  },
  centerHubOuter: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1E1B4B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 6,
  },
  centerHubInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  valueOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  ageNumber: {
    fontSize: 34,
    fontWeight: "900",
    color: "#1E1B4B",
    letterSpacing: -0.5,
  },
  ageUnit: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4F46E5",
    marginLeft: 3,
  },
  bioAgeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
    marginTop: 0,
  },
  badgeWrapper: {
    alignItems: "center",
    marginTop: -4,
    gap: 6,
  },
  diffPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  diffPillText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#059669",
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#4338CA",
  },
  compareText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  compareBold: {
    color: "#1E1B4B",
    fontWeight: "800",
  },
  compareDivider: {
    color: "#94A3B8",
    fontSize: 12,
  },
});

export default LongevityAgeMeter;
