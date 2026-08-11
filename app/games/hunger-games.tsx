import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import { GameHeader } from "@/components/games/GameHeader";
import { GameResultModal } from "@/components/games/GameResultModal";
import { getUserGameData, recordGameCompletion } from "@/lib/games/gameStorage";
import {
  getScenariosFromDB,
  Scenario,
  ScenarioOption,
} from "@/lib/db/scenarioDatabase";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { SafeLinearGradient } from "@/components/ui/SafeLinearGradient";

const { width } = Dimensions.get("window");

export interface OptionVisual {
  letter: string;
  cleanText: string;
  categoryTag: string;
  tagColor: string;
  tagBg: string;
}

export function parseOptionVisual(
  rawText: string,
  index: number,
  isHealthy?: boolean,
  points?: number,
): OptionVisual {
  let letter = String.fromCharCode(65 + index);
  let cleanText = rawText;

  const match = rawText.match(/^([A-Z])[\)\.]\s*(.*)/i);
  if (match) {
    letter = match[1].toUpperCase();
    cleanText = match[2];
  }

  let categoryTag = "Option Choice";
  let tagColor = Colors.primaryDark;
  let tagBg = Colors.primaryMuted;

  if (isHealthy || (points && points >= 25)) {
    categoryTag = "⚡ Super Fuel";
    tagColor = "#065F46";
    tagBg = "#D1FAE5";
  } else if (points && points >= 10) {
    categoryTag = "⚖️ Moderate";
    tagColor = "#92400E";
    tagBg = "#FEF3C7";
  } else {
    categoryTag = "⚠️ Sugar Crash";
    tagColor = "#991B1B";
    tagBg = "#FEE2E2";
  }

  return {
    letter,
    cleanText,
    categoryTag,
    tagColor,
    tagBg,
  };
}

const LETTER_THEMES: Record<string, { border: string; text: string }> = {
  A: { border: "#10B981", text: "#059669" },
  B: { border: "#F59E0B", text: "#D97706" },
  C: { border: "#6366F1", text: "#4F46E5" },
};

export default function HangerGamesScreen() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbOffset, setDbOffset] = useState(0);
  const [totalScenarios, setTotalScenarios] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{
    text: string;
    points: number;
    isHealthy: boolean;
  } | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const insets = useSafeAreaInsets();

  // Animation Refs
  const avatarPulse = useRef(new Animated.Value(1)).current;
  const cardSlideAnim = useRef(new Animated.Value(0)).current;
  const cardFadeAnim = useRef(new Animated.Value(1)).current;
  const feedbackScale = useRef(new Animated.Value(0.8)).current;
  const feedbackFade = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const optionScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    getUserGameData().then((data) => {
      setHighScore(data.games["hunger-games"]?.highScore || 0);
    });
    fetchBatchFromDB(0);

    // Continuous subtle avatar breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(avatarPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    if (scenarios.length > 0) {
      Animated.timing(progressAnim, {
        toValue: (currentIndex + 1) / scenarios.length,
        duration: 350,
        useNativeDriver: false,
      }).start();

      // Card entry transition
      cardSlideAnim.setValue(30);
      cardFadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(cardSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(cardFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentIndex, scenarios.length]);

  const fetchBatchFromDB = async (offset: number) => {
    setLoading(true);
    setFeedback(null);
    setSelectedIdx(null);
    setGameOver(false);
    setCurrentIndex(0);
    setScore(0);

    try {
      const result = await getScenariosFromDB(10, offset, false);
      setScenarios(result.scenarios);
      setTotalScenarios(result.totalScenarios);
      setDbOffset(result.currentOffset);
    } catch (error) {
      console.error("Failed to load scenarios from DB:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (opt: ScenarioOption, idx: number) => {
    if (selectedIdx !== null) return; // Prevent double taps

    setSelectedIdx(idx);
    const isHealthy = opt.isHealthy ?? opt.points >= 25;

    // Scale animation on selected option card
    Animated.sequence([
      Animated.timing(optionScales[idx], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(optionScales[idx], {
        toValue: 1.03,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    setScore((s) => s + opt.points);
    setFeedback({ text: opt.feedback, points: opt.points, isHealthy });

    // Animate feedback card reveal
    feedbackScale.setValue(0.8);
    feedbackFade.setValue(0);
    Animated.parallel([
      Animated.spring(feedbackScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackFade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      // Reset animations
      optionScales[idx].setValue(1);
      setSelectedIdx(null);
      setFeedback(null);

      if (currentIndex + 1 < scenarios.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        finishGame(score + opt.points);
      }
    }, 2000);
  };

  const finishGame = async (finalScore: number) => {
    setGameOver(true);
    const xp = Math.floor(finalScore * 1.5);
    setXpEarned(xp);
    await recordGameCompletion("hunger-games", finalScore, xp);
  };

  const loadNextBatchFromDB = () => {
    const nextOffset = dbOffset + 10 >= totalScenarios ? 0 : dbOffset + 10;
    fetchBatchFromDB(nextOffset);
  };

  const currentScenario = scenarios[currentIndex];
  const batchNum = Math.floor(dbOffset / 10) + 1;

  // Calculate vitality status based on score
  const getVitalityStatus = () => {
    if (score < 50)
      return { label: "Hungry Monster 🤬", color: "#EF4444", bg: "#FEE2E2" };
    if (score < 150)
      return { label: "Refueling... 😋", color: "#F59E0B", bg: "#FEF3C7" };
    return { label: "Peak Vitality! ⚡", color: "#10B981", bg: "#D1FAE5" };
  };

  const status = getVitalityStatus();

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <GameHeader
        title="The Hunger Games 🥦"
        subtitle="Save your hangry avatar with smart choices"
        score={score}
        onExit={() => router.back()}
        backgroundColor={Colors.background}
        hideBorder
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            Fetching scenarios from Database...
          </Text>
        </View>
      ) : scenarios.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={Colors.textMuted}
          />
          <Text style={styles.emptyText}>No scenarios found in Database.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchBatchFromDB(0)}
          >
            <Text style={styles.retryBtnText}>Reload from DB</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + 20, 28) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Progress & Status Bar */}
          <View style={styles.topBarContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                Scenario{" "}
                <Text style={styles.progressHighlight}>{currentIndex + 1}</Text>{" "}
                / {scenarios.length}
              </Text>
              <View
                style={[styles.statusBadge, { backgroundColor: status.bg }]}
              >
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {/* Animated Progress Bar */}
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
          </View>

          {/* Scenario Hero Card */}
          <Animated.View
            style={[
              styles.avatarCard,
              {
                opacity: cardFadeAnim,
                transform: [{ translateY: cardSlideAnim }],
              },
            ]}
          >
            <SafeLinearGradient
              colors={["#FFFFFF", "#F0FDF4"]}
              style={styles.avatarCardGradient}
            >
              <View style={styles.avatarWrapper}>
                <Animated.View
                  style={[
                    styles.avatarGlowRing,
                    { transform: [{ scale: avatarPulse }] },
                  ]}
                />
                <Text style={styles.avatarEmoji}>
                  {currentScenario?.avatarEmoji || "🤬"}
                </Text>
              </View>

              <Text style={styles.questionText}>
                {currentScenario?.question}
              </Text>
            </SafeLinearGradient>
          </Animated.View>

          {/* Section Header */}
          <View style={styles.sectionHeaderContainer}>
            <Ionicons name="sparkles" size={16} color={Colors.primary} />
            <Text style={styles.sectionTitleText}>
              SELECT YOUR REFUEL CHOICE
            </Text>
          </View>

          {/* Visual Options List */}
          <View style={styles.optionsList}>
            {currentScenario?.options.map((opt, idx) => {
              const visual = parseOptionVisual(
                opt.text,
                idx,
                opt.isHealthy,
                opt.points,
              );
              const isSelected = selectedIdx === idx;
              const isOtherSelected = selectedIdx !== null && !isSelected;
              const letterTheme =
                LETTER_THEMES[visual.letter] || LETTER_THEMES["A"];

              return (
                <Animated.View
                  key={idx}
                  style={[
                    {
                      transform: [{ scale: optionScales[idx] || 1 }],
                      opacity: isOtherSelected ? 0.45 : 1,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      isSelected &&
                        (opt.isHealthy
                          ? styles.optionSelectedHealthy
                          : styles.optionSelectedUnhealthy),
                    ]}
                    onPress={() => handleSelectOption(opt, idx)}
                    activeOpacity={0.85}
                    disabled={selectedIdx !== null}
                  >
                    {/* Left: Option Letter Pill */}
                    <View
                      style={[
                        styles.letterPill,
                        { borderColor: letterTheme.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.letterPillText,
                          { color: letterTheme.text },
                        ]}
                      >
                        {visual.letter}
                      </Text>
                    </View>

                    {/* Middle: Clean Title & Category Tag */}
                    <View style={styles.optionDetails}>
                      <Text style={styles.optionTitleText} numberOfLines={2}>
                        {visual.cleanText}
                      </Text>
                      <View
                        style={[
                          styles.categoryPill,
                          { backgroundColor: visual.tagBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            { color: visual.tagColor },
                          ]}
                        >
                          {visual.categoryTag}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Selection Icon */}
                    <View style={styles.actionIconContainer}>
                      {isSelected ? (
                        <Ionicons
                          name={
                            opt.isHealthy ? "checkmark-circle" : "alert-circle"
                          }
                          size={28}
                          color={opt.isHealthy ? "#10B981" : "#F59E0B"}
                        />
                      ) : (
                        <Ionicons
                          name="chevron-forward-circle-outline"
                          size={24}
                          color={Colors.textMuted}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Feedback Card Overlay */}
          {feedback && (
            <Animated.View
              style={[
                styles.feedbackOverlay,
                {
                  opacity: feedbackFade,
                  transform: [{ scale: feedbackScale }],
                },
              ]}
            >
              <SafeLinearGradient
                colors={
                  feedback.isHealthy
                    ? ["#ECFDF5", "#D1FAE5"]
                    : ["#FFFBEB", "#FEF3C7"]
                }
                style={styles.feedbackGradient}
              >
                <View style={styles.feedbackHeaderRow}>
                  <View style={styles.feedbackBadgeRow}>
                    <Ionicons
                      name={feedback.isHealthy ? "star" : "flame"}
                      size={20}
                      color={feedback.isHealthy ? "#059669" : "#D97706"}
                    />
                    <Text
                      style={[
                        styles.feedbackScoreBadge,
                        { color: feedback.isHealthy ? "#059669" : "#D97706" },
                      ]}
                    >
                      +{feedback.points} PTS
                    </Text>
                  </View>
                  <Text style={styles.feedbackHeadline}>
                    {feedback.isHealthy
                      ? "🎉 Excellent Choice!"
                      : "⚠️ Watch Out!"}
                  </Text>
                </View>

                <Text style={styles.feedbackBodyText}>{feedback.text}</Text>
              </SafeLinearGradient>
            </Animated.View>
          )}
        </ScrollView>
      )}

      <GameResultModal
        visible={gameOver}
        score={score}
        xpEarned={xpEarned}
        highScore={highScore}
        message={`Batch ${batchNum} completed! You scored ${score} points with your nutrition choices!`}
        onRestart={loadNextBatchFromDB}
        onExit={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topBarContainer: {
    marginBottom: 16,
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    // borderColor: Colors.borderLight,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  progressHighlight: {
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  avatarCard: {
    marginBottom: 18,
    borderRadius: 24,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarCardGradient: {
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -20,
  },
  avatarGlowRing: {
    position: "absolute",
    width: 66,
    height: 66,
    borderRadius: 43,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  questionText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    textAlign: "center",
    lineHeight: 24,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionTitleText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionSelectedHealthy: {
    borderColor: "#10B981",
    borderWidth: 2,
    backgroundColor: "#F0FDF4",
  },
  optionSelectedUnhealthy: {
    borderColor: "#F59E0B",
    borderWidth: 2,
    backgroundColor: "#FFFBEB",
  },
  letterPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  letterPillText: {
    fontWeight: "800",
    fontSize: 16,
  },
  optionDetails: {
    flex: 1,
    justifyContent: "center",
  },
  optionTitleText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  categoryPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionIconContainer: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackOverlay: {
    marginTop: 18,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  feedbackGradient: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  feedbackHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  feedbackBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feedbackScoreBadge: {
    fontSize: 13,
    fontWeight: "800",
  },
  feedbackHeadline: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  feedbackBodyText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
