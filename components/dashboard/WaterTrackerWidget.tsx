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
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface WaterTrackerWidgetProps {
  waterAmount: number;
  onAddWater: (amount: number) => void;
  onResetWater: () => void;
  onOpenHistory?: () => void;
}

// Bottle inner dimensions (must match bottleBody style below)
const BOTTLE_WIDTH = 58;
const BOTTLE_HEIGHT = 96;
// Extra height above the bottle so the wave crest has room to rise without
// getting visually clipped right at the top edge
const SVG_HEIGHT = BOTTLE_HEIGHT + 24;
const WAVE_AMPLITUDE = 4; // how tall the ripple bumps are
const WAVE_LENGTH = BOTTLE_WIDTH; // one full ripple cycle width

// Builds a wavy-top fill path. `phase` shifts the wave horizontally (0-1 -> one full cycle).
// The path is drawn 2x width wide so it can be translated seamlessly for a looping ripple.
function buildWavePath(phase: number) {
  const w = BOTTLE_WIDTH * 2;
  const points: string[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const y =
      WAVE_AMPLITUDE * Math.sin((x / WAVE_LENGTH) * Math.PI * 2 + phase * Math.PI * 2);
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${(WAVE_AMPLITUDE + y).toFixed(2)}`);
  }
  // close the shape down to the bottom so everything under the wave line is filled
  points.push(`L${w},${SVG_HEIGHT}`);
  points.push(`L0,${SVG_HEIGHT}`);
  points.push("Z");
  return points.join(" ");
}

export const WaterTrackerWidget: React.FC<WaterTrackerWidgetProps> = ({
  waterAmount,
  onAddWater,
  onResetWater,
  onOpenHistory,
}) => {
  const targetWater = 2.75;
  const remaining = Math.max(0, parseFloat((targetWater - waterAmount).toFixed(2)));
  const fillPercent = Math.min(100, Math.max(0, Math.round((waterAmount / targetWater) * 100)));

  // Drives the vertical rise of the water level (0 -> 100)
  const animatedFill = useRef(new Animated.Value(fillPercent)).current;
  // Subtle bottle bounce on log
  const bottleScale = useRef(new Animated.Value(1)).current;
  // Continuous ripple motion (0 -> 1 -> 0 -> 1 ... loops forever)
  const waveAnim = useRef(new Animated.Value(0)).current;
  // Rising bubbles
  const bubbleAnim = useRef(new Animated.Value(0)).current;

  // Continuous ripple loop — drives horizontal wave phase regardless of fill level
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: false, // path/d strings can't use native driver
      })
    );
    loop.start();
    return () => loop.stop();
  }, [waveAnim]);

  // Animate the water level rising bottom-to-top whenever fillPercent changes.
  // Slower duration so the rise reads as gradual, not a sudden pop.
  useEffect(() => {
    Animated.timing(animatedFill, {
      toValue: fillPercent,
      duration: 1800,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fillPercent, animatedFill]);

  const handleAddWater = (amount: number) => {
    bubbleAnim.setValue(0);
    Animated.timing(bubbleAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.timing(bottleScale, {
        toValue: 1.06,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.spring(bottleScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    onAddWater(amount);
  };

  // translateY: how far to push the wave group down from the top of the bottle.
  // At 0% -> pushed down by BOTTLE_HEIGHT (crest sits right at/below the bottom
  // edge, fully hidden). At 100% -> pushed down by 0 (crest sits at the very top).
  // This maps linearly to fillPercent so even small values (5%, 10%...) show a
  // proportionally thin sliver right away instead of staying hidden until some
  // threshold and then jumping into view.
  const waveTranslateY = animatedFill.interpolate({
    inputRange: [0, 100],
    outputRange: [BOTTLE_HEIGHT, 0],
  });

  // translateX: loops the wave shape sideways by exactly one wavelength so it appears
  // to ripple continuously and seamlessly (since the path itself is 2 wavelengths wide)
  const waveTranslateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -WAVE_LENGTH],
  });

  // We can't animate the actual `d` path smoothly with Animated (no interpolation for path
  // strings), so instead we keep one static wave path (2 wavelengths wide) and animate its
  // X/Y translation — sideways for the ripple look, vertically for the rising level.
  const staticWavePath = buildWavePath(0);

  return (
    <View style={styles.trackerCardWidget}>
      {/* Header */}
      <View style={styles.widgetHeaderRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="water-outline" size={16} color="#2563EB" />
          <Text style={styles.widgetHeaderTitle}>Hydration Tracker</Text>
        </View>
        <View style={styles.blueBadgePill}>
          <Text style={styles.blueBadgeText}>Target {targetWater}L</Text>
        </View>
      </View>

      {/* Interactive Water Bottle Container */}
      <View style={styles.waterGraphicBox}>
        <Animated.View
          style={[styles.bottleWrapper, { transform: [{ scale: bottleScale }] }]}
        >
          <View style={styles.bottleCap} />
          <View style={styles.bottleNeck} />

          <View style={styles.bottleBody}>
            {/* Animated wavy water surface + fill, rendered via SVG */}
            {fillPercent > 0 && (
              <Animated.View
                style={[
                  styles.svgWrap,
                  {
                    transform: [
                      { translateY: waveTranslateY },
                      { translateX: waveTranslateX },
                    ],
                  },
                ]}
                pointerEvents="none"
              >
                <Svg width={BOTTLE_WIDTH * 2} height={SVG_HEIGHT}>
                  <AnimatedPath d={staticWavePath} fill="#3B82F6" />
                </Svg>
              </Animated.View>
            )}

            {/* Rising bubbles */}
            {fillPercent > 0 && (
              <Animated.View
                style={[
                  styles.bubblesWrap,
                  {
                    opacity: bubbleAnim.interpolate({
                      inputRange: [0, 0.2, 0.8, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                    transform: [
                      {
                        translateY: bubbleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [15, -45],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents="none"
              >
                <View style={[styles.bubble, { left: 10, width: 6, height: 6 }]} />
                <View style={[styles.bubble, { left: 24, width: 4, height: 4 }]} />
                <View style={[styles.bubble, { left: 38, width: 7, height: 7 }]} />
              </Animated.View>
            )}

            {/* Side tick marks */}
            <View style={styles.tickMarksContainer} pointerEvents="none">
              <View style={[styles.tickMark, { top: "25%" }]} />
              <View style={[styles.tickMark, { top: "50%" }]} />
              <View style={[styles.tickMark, { top: "75%" }]} />
            </View>

            {/* Bottle percent overlay */}
            <View style={styles.bottleCenterBadge} pointerEvents="none">
              <Text
                style={[
                  styles.bottlePercentText,
                  fillPercent > 55 && { color: "#FFFFFF" },
                ]}
              >
                {fillPercent}%
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsTextWrap}>
          <Text style={styles.waterBigNum}>
            {waterAmount.toFixed(2)}{" "}
            <Text style={{ fontSize: 14, color: "#64748B" }}>L</Text>
          </Text>
          <Text style={styles.waterSubText}>
            {remaining > 0 ? `${remaining} L remaining` : "Goal Reached! 🎉"}
          </Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.waterBtnsRow}>
        <TouchableOpacity
          style={styles.waterAddBtn}
          onPress={() => handleAddWater(0.25)}
          activeOpacity={0.7}
        >
          <Text style={styles.waterAddBtnText}>+0.25L</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.waterAddBtn}
          onPress={() => handleAddWater(0.5)}
          activeOpacity={0.7}
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
        ) : null}

        <TouchableOpacity
          style={styles.waterResetBtn}
          onPress={onResetWater}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={19} color="#3c88f1" />
        </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 12,
  },
  bottleWrapper: {
    alignItems: "center",
    position: "relative",
  },
  bottleCap: {
    width: 20,
    height: 6,
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  bottleNeck: {
    width: 26,
    height: 8,
    backgroundColor: "#E0F2FE",
    borderWidth: 2,
    borderColor: "#93C5FD",
    borderBottomWidth: 0,
  },
  bottleBody: {
    width: BOTTLE_WIDTH,
    height: BOTTLE_HEIGHT,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: "#60A5FA",
    backgroundColor: "#F0F9FF",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  svgWrap: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  bubblesWrap: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 5,
  },
  bubble: {
    position: "absolute",
    bottom: 0,
    backgroundColor: "#7DD3FC",
    borderColor: "#38BDF8",
    borderWidth: 1,
    borderRadius: 10,
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  tickMarksContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  tickMark: {
    position: "absolute",
    left: 4,
    width: 6,
    height: 1.5,
    backgroundColor: "rgba(148, 163, 184, 0.5)",
  },
  bottleCenterBadge: {
    zIndex: 10,
  },
  bottlePercentText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563EB",
  },
  statsTextWrap: {
    justifyContent: "center",
  },
  waterBigNum: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
  },
  waterSubText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  waterBtnsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  waterAddBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    paddingVertical: 7,
    borderRadius: 8,
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
    paddingVertical: 7,
    borderRadius: 8,
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
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderColor:"#BFDBFE"
  },
});

export default WaterTrackerWidget;