import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Path,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface WeightHeroGaugeProps {
  currentWeight: string;
  diffVal?: string;
  isLoss?: boolean;
  subtext?: string;
  progressPercent?: number; // fallback if currentWeight is invalid
}

// Speedometer scale readings from 0 to 150 in increments of 15
const SCALE_MARKS = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150];

export const WeightHeroGauge: React.FC<WeightHeroGaugeProps> = ({
  currentWeight = '72.4',
  diffVal = '1.2 kg',
  isLoss = true,
  subtext = 'since last week',
}) => {
  // SVG Dimensions & Geometry
  const svgWidth = 280;
  const svgHeight = 195;
  const cx = 140;
  const cy = 100;
  const radius = 86;
  const strokeWidth = 7;
  const needleLength = 48;

  // Arc angles (in standard SVG degrees):
  // 135 deg is bottom-left (value 0), 270 deg is top (value 75), 45 deg is bottom-right (value 150)
  // Total clockwise sweep is 270 degrees
  const radStart = (135 * Math.PI) / 180;
  const radEnd = (45 * Math.PI) / 180;

  const startX = cx + radius * Math.cos(radStart);
  const startY = cy + radius * Math.sin(radStart);
  const endX = cx + radius * Math.cos(radEnd);
  const endY = cy + radius * Math.sin(radEnd);

  const arcPath = `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${radius} ${radius} 0 1 1 ${endX.toFixed(1)} ${endY.toFixed(1)}`;

  // Total Arc Circumference
  const circumference = 2 * Math.PI * radius;
  const totalArcLength = circumference * (270 / 360); // ~ 405.26

  // Parse numerical weight and compute exact fraction on 0-150 scale
  const parsedWeight = parseFloat(currentWeight);
  const validWeight = !isNaN(parsedWeight) ? parsedWeight : 72.4;
  const clampedWeight = Math.min(150, Math.max(0, validWeight));
  const weightFraction = clampedWeight / 150;

  const targetDashoffset = totalArcLength * (1 - weightFraction);

  // Meter needle rotation angle (-135deg at 0kg -> 0deg at 75kg -> +135deg at 150kg)
  const targetNeedleDeg = -135 + weightFraction * 270;

  // Sweep animation on mount & weight update
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animProgress.setValue(0);
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.back(1.15)),
      useNativeDriver: false,
    }).start();
  }, [clampedWeight]);

  const animatedDashoffset = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [totalArcLength, targetDashoffset],
  });

  const needleAngle = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-135deg', `${targetNeedleDeg}deg`],
  });

  return (
    <View style={styles.container}>
      {/* ── Speedometer Meter Arc & Needle ── */}
      <View style={styles.meterContainer}>
        <Svg width={svgWidth} height={svgHeight}>
          <Defs>
            {/* Emerald gradient for active arc stroke */}
            <LinearGradient id="gaugeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#059669" />
              <Stop offset="50%" stopColor="#10B981" />
              <Stop offset="100%" stopColor="#6EE7B7" />
            </LinearGradient>
          </Defs>

          {/* Background Grey Track */}
          <Path
            d={arcPath}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />

          {/* Active Gradient Arc (Animated sweep up to current weight) */}
          <AnimatedPath
            d={arcPath}
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${totalArcLength}`}
            strokeDashoffset={animatedDashoffset}
            fill="none"
          />

          {/* Tick Marks & Speedometer Numbers (0, 15, 30 ... 150) */}
          {SCALE_MARKS.map((markVal) => {
            const fraction = markVal / 150;
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

            const isMid = markVal === 75;
            const isNearCurrent = Math.abs(clampedWeight - markVal) <= 7.5;

            return (
              <React.Fragment key={`mark-${markVal}`}>
                {/* Tick mark line */}
                <Line
                  x1={tx1}
                  y1={ty1}
                  x2={tx2}
                  y2={ty2}
                  stroke={isNearCurrent ? '#059669' : '#CBD5E1'}
                  strokeWidth={isMid ? 2 : 1.2}
                />

                {/* Speedometer Reading Label */}
                <SvgText
                  x={lx}
                  y={ly}
                  fontSize={isMid ? '9.5' : '8'}
                  fontWeight={isNearCurrent || isMid ? '800' : '600'}
                  fill={isNearCurrent ? '#059669' : isMid ? '#1E293B' : '#94A3B8'}
                  textAnchor="middle"
                >
                  {markVal}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>

        {/* ── Animated Speedometer Needle pointing to current weight ── */}
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
            {/* Needle tip accent */}
            <View style={styles.needleTipDot} />
          </View>
        </Animated.View>

        {/* ── Center Pivot Hub ── */}
        <View style={[styles.centerHubOuter, { left: cx - 9, top: cy - 9 }]}>
          <View style={styles.centerHubInner} />
        </View>

        {/* ── Current Weight Display directly below Hub ── */}
        <View style={[styles.valueOverlay, { top: cy + 14 }]}>
          <View style={styles.valueRow}>
            <Text style={styles.weightNumber}>{currentWeight}</Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>
          <Text style={styles.currentWeightLabel}>Current Weight</Text>
        </View>
      </View>

      {/* ── Pill Badge & Subtitle Below Gauge Opening ── */}
      <View style={styles.badgeWrapper}>
        <View
          style={[
            styles.diffPill,
            !isLoss && { backgroundColor: '#FFEDD5' },
          ]}
        >
          <Ionicons
            name={isLoss ? 'arrow-down' : 'arrow-up'}
            size={14}
            color={isLoss ? '#059669' : '#EA580C'}
          />
          <Text
            style={[
              styles.diffPillText,
              !isLoss && { color: '#EA580C' },
            ]}
          >
            {diffVal}
          </Text>
        </View>

        <Text style={styles.subtextLabel}>{subtext}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    paddingBottom: 6,
    marginTop:-15
  },
  meterContainer: {
    width: 280,
    height: 195,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  needleLayer: {
    position: 'absolute',
    width: 4,
    alignItems: 'center',
    zIndex: 5,
  },
  needlePointer: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
    position: 'relative',
    alignItems: 'center',
  },
  needleTipDot: {
    width: 4,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#10B981',
    position: 'absolute',
    top: 0,
  },
  centerHubOuter: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#059669',
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
    backgroundColor: '#FFFFFF',
  },
  valueOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  weightNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  weightUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 3,
  },
  currentWeightLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  badgeWrapper: {
    alignItems: 'center',
    marginTop: -8,
    gap: 4,
  },
  diffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  diffPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  subtextLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});

export default WeightHeroGauge;
