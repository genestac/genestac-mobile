import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Line, Circle } from "react-native-svg";
import { GameHeader } from "@/components/games/GameHeader";
import { GameResultModal } from "@/components/games/GameResultModal";
import { getUserGameData, recordGameCompletion } from "@/lib/games/gameStorage";
import { Colors, Fonts, Spacing, Radius } from "@/constants/colors";
import { SafeLinearGradient } from "@/components/ui/SafeLinearGradient";

const { width } = Dimensions.get("window");

let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch {
  Haptics = null;
}
const triggerBuzz = (type: "success" | "error" | "light") => {
  if (!Haptics) return;
  if (type === "success") Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
  else if (type === "error") Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Error);
  else Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
};

export type BufferType = "fiber" | "protein" | "walk" | "acv";

export interface FoodThreat {
  id: string;
  name: string;
  emoji: string;
  spikeAmount: number; // mg/dL spike
  bestBuffer: BufferType;
  altBuffer: BufferType;
  scienceTip: string;
}

const FOOD_THREATS: Omit<FoodThreat, "id">[] = [
  {
    name: "Glazed Donut",
    emoji: "🍩",
    spikeAmount: 65,
    bestBuffer: "protein",
    altBuffer: "fiber",
    scienceTip: "Proteins & fats slow stomach emptying, lowering sugar absorption rate by 40%!",
  },
  {
    name: "Sugar Soda / Boba",
    emoji: "🥤",
    spikeAmount: 80,
    bestBuffer: "walk",
    altBuffer: "acv",
    scienceTip: "Light walking engages GLUT4 muscle receptors to drain blood sugar without heavy insulin demand!",
  },
  {
    name: "Plain White Rice",
    emoji: "🍚",
    spikeAmount: 55,
    bestBuffer: "fiber",
    altBuffer: "protein",
    scienceTip: "Eating fiber before fast carbs forms a viscous barrier in the small intestine!",
  },
  {
    name: "Crispy French Fries",
    emoji: "🍟",
    spikeAmount: 60,
    bestBuffer: "fiber",
    altBuffer: "walk",
    scienceTip: "High-temperature starches cause rapid glucose spikes; fiber slows enzyme digestion!",
  },
  {
    name: "Chocolate Bar",
    emoji: "🍫",
    spikeAmount: 50,
    bestBuffer: "protein",
    altBuffer: "fiber",
    scienceTip: "Pairing cacao with healthy fats stabilizes blood sugar and extends satiety!",
  },
  {
    name: "Sugary Cereal",
    emoji: "🥣",
    spikeAmount: 70,
    bestBuffer: "protein",
    altBuffer: "walk",
    scienceTip: "Processed cereal causes rapid spikes; adding protein (greek yogurt/chia) prevents the crash!",
  },
];

const BUFFER_DEFINITIONS: Record<
  BufferType,
  { name: string; emoji: string; icon: string; color: string; bg: string }
> = {
  fiber: {
    name: "Fiber First",
    emoji: "🥗",
    icon: "leaf",
    color: "#16a34a",
    bg: "#dcfce7",
  },
  protein: {
    name: "Protein & Fat",
    emoji: "🥚",
    icon: "nutrition",
    color: "#d97706",
    bg: "#fef3c7",
  },
  walk: {
    name: "10-Min Walk",
    emoji: "🚶‍♂️",
    icon: "walk",
    color: "#2563eb",
    bg: "#dbeafe",
  },
  acv: {
    name: "ACV / Vinegar",
    emoji: "🍵",
    icon: "water",
    color: "#9333ea",
    bg: "#f3e8ff",
  },
};

export default function GlucoseDefenderGame() {
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(35);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [currentGlucose, setCurrentGlucose] = useState(95); // normal baseline mg/dL
  const [glucoseHistory, setGlucoseHistory] = useState<number[]>([90, 92, 95, 94, 95, 96, 95]);
  const [activeFood, setActiveFood] = useState<FoodThreat | null>(null);
  const [agentFeedback, setAgentFeedback] = useState<string>(
    "🤖 Agentic Health Advisor: Match the incoming food with the right Metabolic Buffer to flatten glucose spikes!"
  );
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  const cardScale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getUserGameData().then((data) => {
      setHighScore(data.games["glucose-defender"]?.highScore || 0);
    });
    spawnFood();
  }, []);

  // Timer loop
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishGame(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, score]);

  const spawnFood = () => {
    const item = FOOD_THREATS[Math.floor(Math.random() * FOOD_THREATS.length)];
    const newThreat: FoodThreat = {
      ...item,
      id: Math.random().toString(),
    };
    setActiveFood(newThreat);

    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleBufferSelect = (selected: BufferType) => {
    if (!activeFood || gameOver) return;
    triggerBuzz("light");

    const isBest = selected === activeFood.bestBuffer;
    const isAlt = selected === activeFood.altBuffer;

    if (isBest || isAlt) {
      // Successful buffer match!
      triggerBuzz("success");
      const addedScore = isBest ? 20 : 12;
      const newStreak = streak + 1;
      setStreak(newStreak);
      const streakMultiplier = newStreak >= 3 ? 1.5 : 1;
      const finalGain = Math.round(addedScore * streakMultiplier);

      setScore((s) => s + finalGain);

      // Smooth glucose curve (small stable bump)
      const bump = isBest ? 5 : 15;
      const newGluc = Math.min(130, Math.max(85, currentGlucose + bump - 10));
      setCurrentGlucose(newGluc);
      setGlucoseHistory((prev) => [...prev.slice(1), newGluc]);

      const bufferName = BUFFER_DEFINITIONS[selected].name;
      setAgentFeedback(
        `✅ ${bufferName} Match! +${finalGain} XP ${newStreak >= 3 ? "🔥 1.5x Streak!" : ""}\n💡 ${activeFood.scienceTip}`
      );
    } else {
      // Failed match — spike occurs!
      triggerBuzz("error");
      setStreak(0);
      const newLives = lives - 1;
      setLives(newLives);

      // Large Glucose Spike!
      const spike = currentGlucose + activeFood.spikeAmount;
      setCurrentGlucose(spike);
      setGlucoseHistory((prev) => [...prev.slice(1), Math.min(220, spike)]);

      const bestName = BUFFER_DEFINITIONS[activeFood.bestBuffer].name;
      setAgentFeedback(
        `⚡ GLUCOSE SPIKE (+${activeFood.spikeAmount} mg/dL)! ${activeFood.name} needed ${bestName}.\n💡 ${activeFood.scienceTip}`
      );

      if (newLives <= 0) {
        finishGame(score);
        return;
      }
    }

    spawnFood();
  };

  const finishGame = async (finalScore: number) => {
    setGameOver(true);
    const xp = Math.floor(finalScore * 1.6);
    setXpEarned(xp);
    await recordGameCompletion("glucose-defender", finalScore, xp);
  };

  // Build SVG Path for Glucose Monitor Chart
  const svgWidth = width - 48;
  const svgHeight = 70;
  const points = glucoseHistory.map((val, idx) => {
    const x = (idx / (glucoseHistory.length - 1)) * svgWidth;
    // val 80 -> y=55, val 200 -> y=10
    const clamped = Math.min(200, Math.max(70, val));
    const y = svgHeight - ((clamped - 70) / 130) * (svgHeight - 15) - 10;
    return `${x},${y}`;
  });
  const chartPath = `M ${points.join(" L ")}`;

  const getGlucoseStatusColor = (val: number) => {
    if (val > 150) return Colors.danger;
    if (val > 125) return "#d97706";
    return Colors.primaryLight;
  };

  return (
    <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
      <GameHeader title="Glucose Defender 📉" />

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HUD Bar */}
        <View style={s.hudRow}>
          <View style={s.hudItem}>
            <Ionicons name="timer-outline" size={18} color={Colors.primaryLight} />
            <Text style={s.hudText}>{timer}s</Text>
          </View>

          <View style={s.hudItem}>
            <Ionicons name="trophy-outline" size={18} color="#f59e0b" />
            <Text style={s.hudText}>{score} PTS</Text>
          </View>

          <View style={s.hudItem}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < lives ? "heart" : "heart-outline"}
                size={18}
                color={Colors.danger}
              />
            ))}
          </View>
        </View>

        {/* Live Glucose Curve Monitor Card */}
        <View style={s.monitorCard}>
          <View style={s.monitorHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[s.statusDot, { backgroundColor: getGlucoseStatusColor(currentGlucose) }]} />
              <Text style={s.monitorTitle}>Blood Glucose Monitor</Text>
            </View>
            <View style={[s.valueBadge, { backgroundColor: getGlucoseStatusColor(currentGlucose) + "1A" }]}>
              <Text style={[s.valueBadgeText, { color: getGlucoseStatusColor(currentGlucose) }]}>
                {currentGlucose} mg/dL
              </Text>
            </View>
          </View>

          {/* SVG Chart */}
          <View style={s.chartContainer}>
            <Svg width={svgWidth} height={svgHeight}>
              {/* Normal Zone Line (110 mg/dL) */}
              <Line
                x1="0"
                y1={svgHeight - ((110 - 70) / 130) * (svgHeight - 15) - 10}
                x2={svgWidth}
                y2={svgHeight - ((110 - 70) / 130) * (svgHeight - 15) - 10}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <Path
                d={chartPath}
                fill="none"
                stroke={getGlucoseStatusColor(currentGlucose)}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.length > 0 && (
                <Circle
                  cx={svgWidth}
                  cy={
                    svgHeight -
                    ((Math.min(200, Math.max(70, currentGlucose)) - 70) / 130) *
                      (svgHeight - 15) -
                    10
                  }
                  r="5"
                  fill={getGlucoseStatusColor(currentGlucose)}
                />
              )}
            </Svg>
          </View>

          <View style={s.chartLabels}>
            <Text style={s.chartLabelText}>Stable (80-110)</Text>
            <Text style={s.chartLabelText}>Elevated (120-140)</Text>
            <Text style={s.chartLabelText}>Spike (&gt;150)</Text>
          </View>
        </View>

        {/* Incoming Food Threat Card */}
        {activeFood && (
          <Animated.View style={[s.foodCard, { transform: [{ scale: cardScale }] }]}>
            <View style={s.threatBadge}>
              <Ionicons name="warning-outline" size={14} color="#dc2626" />
              <Text style={s.threatBadgeText}>POTENTIAL SPIKE +{activeFood.spikeAmount} mg/dL</Text>
            </View>
            <Text style={s.foodEmoji}>{activeFood.emoji}</Text>
            <Text style={s.foodName}>{activeFood.name}</Text>
            <Text style={s.foodSubtext}>Select the optimal Metabolic Buffer below to flatten this spike!</Text>
          </Animated.View>
        )}

        {/* Agentic Advisor Banner */}
        <View style={s.agentBanner}>
          <Text style={s.agentText}>{agentFeedback}</Text>
        </View>

        {/* Metabolic Buffer Selection Grid */}
        <Text style={s.sectionHeader}>SELECT METABOLIC BUFFER</Text>
        <View style={s.bufferGrid}>
          {(Object.keys(BUFFER_DEFINITIONS) as BufferType[]).map((key) => {
            const def = BUFFER_DEFINITIONS[key];
            return (
              <TouchableOpacity
                key={key}
                style={[s.bufferBtn, { borderColor: def.color + "40" }]}
                onPress={() => handleBufferSelect(key)}
                activeOpacity={0.82}
              >
                <View style={[s.bufferIconBox, { backgroundColor: def.bg }]}>
                  <Text style={{ fontSize: 22 }}>{def.emoji}</Text>
                </View>
                <Text style={s.bufferName}>{def.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Game Result Modal */}
      <GameResultModal
        visible={gameOver}
        score={score}
        highScore={highScore}
        xpEarned={xpEarned}
        onRestart={() => {
          setScore(0);
          setTimer(35);
          setLives(3);
          setStreak(0);
          setCurrentGlucose(95);
          setGlucoseHistory([90, 92, 95, 94, 95, 96, 95]);
          setGameOver(false);
          spawnFood();
        }}
        onExit={() => router.replace("/games")}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  hudRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hudItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hudText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  monitorCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  monitorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  monitorTitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  valueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  valueBadgeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: "800",
  },
  chartContainer: {
    marginVertical: 4,
    alignItems: "center",
  },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  chartLabelText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  foodCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    gap: 6,
  },
  threatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  threatBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.danger,
  },
  foodEmoji: {
    fontSize: 54,
    marginVertical: 4,
  },
  foodName: {
    fontSize: Fonts.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  foodSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  agentBanner: {
    backgroundColor: Colors.darkCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  agentText: {
    fontSize: 12,
    color: Colors.white,
    lineHeight: 18,
    fontWeight: "500",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  bufferGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  bufferBtn: {
    width: (width - 48) / 2,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    borderWidth: 1.5,
  },
  bufferIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  bufferName: {
    fontSize: Fonts.sizes.xs,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
});
