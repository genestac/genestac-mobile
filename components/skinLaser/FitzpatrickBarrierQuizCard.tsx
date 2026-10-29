// components/skinLaser/FitzpatrickBarrierQuizCard.tsx
// Fitzpatrick Skin Type & Barrier Health Interactive Quiz Card

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  FitzpatrickSkinData,
  FITZPATRICK_QUIZ_QUESTIONS,
  FITZPATRICK_DETAILS,
  calculateQuizResults,
} from "@/lib/skinLaser";

interface FitzpatrickBarrierQuizCardProps {
  fitzpatrick: FitzpatrickSkinData;
  onUpdateFitzpatrick: (updated: FitzpatrickSkinData) => void;
}

export const FitzpatrickBarrierQuizCard: React.FC<FitzpatrickBarrierQuizCardProps> = ({
  fitzpatrick,
  onUpdateFitzpatrick,
}) => {
  const insets = useSafeAreaInsets();
  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([2, 2, 2, 2, 2]);

  const activeQuestion = FITZPATRICK_QUIZ_QUESTIONS[currentQuestionIdx];
  const typeDetails = FITZPATRICK_DETAILS[fitzpatrick.skinType] || FITZPATRICK_DETAILS.III;

  const handleSelectOption = (score: number) => {
    const updated = [...selectedAnswers];
    updated[currentQuestionIdx] = score;
    setSelectedAnswers(updated);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < FITZPATRICK_QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      // Calculate final results
      const res = calculateQuizResults(selectedAnswers);
      const computedDetails = FITZPATRICK_DETAILS[res.skinType];

      const newFitzpatrickData: FitzpatrickSkinData = {
        skinType: res.skinType,
        typeName: computedDetails.name,
        description: computedDetails.description,
        burnTendency: computedDetails.burnTendency,
        tanTendency: computedDetails.tanTendency,
        laserSafetyNote: computedDetails.laserSafetyNote,
        hydrationScore: res.hydrationScore,
        barrierHealthScore: res.barrierScore,
        sensitivityScore: res.sensitivityScore,
        acneFlareRisk: res.acneRisk,
        lastAssessmentDate: new Date().toISOString(),
      };

      onUpdateFitzpatrick(newFitzpatrickData);
      setShowQuizModal(false);
      setCurrentQuestionIdx(0);

      Alert.alert(
        "Skin Assessment Completed",
        `Classified as ${computedDetails.name} with Barrier Health Score of ${res.barrierScore}%. Your post-laser care and product recommendations have been customized.`
      );
    }
  };

  const barrierColor =
    fitzpatrick.barrierHealthScore >= 80
      ? "#059669"
      : fitzpatrick.barrierHealthScore >= 60
      ? "#0284C7"
      : "#E11D48";

  const barrierStatus =
    fitzpatrick.barrierHealthScore >= 80
      ? "Resilient & Optimal"
      : fitzpatrick.barrierHealthScore >= 60
      ? "Moderate / Healing"
      : "Compromised Barrier";

  return (
    <View style={styles.cardContainer}>
      {/* ── CARD HEADER ── */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="finger-print" size={17} color="#7C3AED" />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.cardSuperTitle} numberOfLines={1}>
              CLINICAL DERMATOLOGY QUIZ
            </Text>
            <Text style={styles.cardTitle} numberOfLines={1}>
              Fitzpatrick Type & Barrier Health
            </Text>
          </View>
        </View>
      </View>

      {/* ── ACTION BUTTON ROW (BELOW HEADER) ── */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => {
            setCurrentQuestionIdx(0);
            setShowQuizModal(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="clipboard-outline" size={13} color="#7C3AED" />
          <Text style={styles.retakeBtnText}>Retake Quiz</Text>
        </TouchableOpacity>
      </View>

      {/* ── HERO FITZPATRICK CLASSIFICATION CARD ── */}
      <View
        style={[
          styles.fitzHeroCard,
          { borderColor: typeDetails.color + "35" },
        ]}
      >
        <View style={styles.fitzHeroTop}>
          <View style={styles.fitzTypeBadge}>
            <Text style={styles.fitzTypeBadgeText}>
              FITZPATRICK {fitzpatrick.skinType}
            </Text>
          </View>
          <Text style={styles.fitzTypeName}>{typeDetails.name}</Text>
        </View>

        <Text style={styles.fitzDesc}>{typeDetails.description}</Text>

        <View style={styles.tendencyDualRow}>
          <View style={styles.tendencyItem}>
            <Ionicons name="flame-outline" size={13} color="#E11D48" />
            <Text style={styles.tendencyText}>
              <Text style={{ fontWeight: "700" }}>Burn: </Text>
              {typeDetails.burnTendency}
            </Text>
          </View>

          <View style={styles.tendencyItem}>
            <Ionicons name="sunny-outline" size={13} color="#D97706" />
            <Text style={styles.tendencyText}>
              <Text style={{ fontWeight: "700" }}>Tan: </Text>
              {typeDetails.tanTendency}
            </Text>
          </View>
        </View>

        {/* Laser Safety Advisory */}
        <View style={styles.laserAdvisoryRow}>
          <Ionicons name="shield-half" size={15} color="#0284C7" />
          <Text style={styles.laserAdvisoryText}>
            <Text style={{ fontWeight: "700", color: "#0F172A" }}>
              Laser Safety:{" "}
            </Text>
            {typeDetails.laserSafetyNote}
          </Text>
        </View>
      </View>

      {/* ── BARRIER HEALTH SCORE & 3 GAUGES ── */}
      <View style={styles.barrierScoreCard}>
        <View style={styles.barrierHeaderRow}>
          <View>
            <Text style={styles.barrierSectionLabel}>SKIN BARRIER INTEGRITY</Text>
            <View style={styles.barrierScoreValRow}>
              <Text style={[styles.barrierScoreBig, { color: barrierColor }]}>
                {fitzpatrick.barrierHealthScore}%
              </Text>
              <View style={styles.barrierStatusWrap}>
                <Text style={[styles.barrierStatusText, { color: barrierColor }]}>
                  {barrierStatus}
                </Text>
                <Text style={styles.barrierSubText}>Lipid matrix & acid mantle</Text>
              </View>
            </View>
          </View>

          <View style={styles.barrierShieldIcon}>
            <Ionicons name="shield-checkmark" size={24} color={barrierColor} />
          </View>
        </View>

        {/* 3 Metric Gauges: Hydration, Sensitivity, Acne Flare Risk */}
        <View style={styles.metricsGrid}>
          {/* Hydration */}
          <View style={styles.metricBox}>
            <View style={styles.metricHeader}>
              <Ionicons name="water" size={13} color="#0284C7" />
              <Text style={styles.metricName}>Hydration</Text>
            </View>
            <Text style={[styles.metricVal, { color: "#0284C7" }]}>
              {fitzpatrick.hydrationScore}%
            </Text>
            <View style={styles.miniTrack}>
              <View
                style={[
                  styles.miniFill,
                  { width: `${fitzpatrick.hydrationScore}%`, backgroundColor: "#0284C7" },
                ]}
              />
            </View>
            <Text style={styles.metricStatusText}>
              {fitzpatrick.hydrationScore >= 80 ? "Plump & Supple" : "Moderate TEWL"}
            </Text>
          </View>

          {/* Sensitivity */}
          <View style={styles.metricBox}>
            <View style={styles.metricHeader}>
              <Ionicons name="pulse" size={13} color="#E11D48" />
              <Text style={styles.metricName}>Sensitivity</Text>
            </View>
            <Text style={[styles.metricVal, { color: "#E11D48" }]}>
              {fitzpatrick.sensitivityScore}%
            </Text>
            <View style={styles.miniTrack}>
              <View
                style={[
                  styles.miniFill,
                  { width: `${fitzpatrick.sensitivityScore}%`, backgroundColor: "#E11D48" },
                ]}
              />
            </View>
            <Text style={styles.metricStatusText}>
              {fitzpatrick.sensitivityScore <= 30 ? "Low Reactivity" : "Prone to Erythema"}
            </Text>
          </View>

          {/* Acne Flare Risk */}
          <View style={styles.metricBox}>
            <View style={styles.metricHeader}>
              <Ionicons name="fitness" size={13} color="#059669" />
              <Text style={styles.metricName}>Acne Flare</Text>
            </View>
            <Text style={[styles.metricVal, { color: "#059669" }]}>
              {fitzpatrick.acneFlareRisk}
            </Text>
            <View style={styles.miniTrack}>
              <View
                style={[
                  styles.miniFill,
                  {
                    width:
                      fitzpatrick.acneFlareRisk === "Low"
                        ? "30%"
                        : fitzpatrick.acneFlareRisk === "Moderate"
                        ? "60%"
                        : "90%",
                    backgroundColor: "#059669",
                  },
                ]}
              />
            </View>
            <Text style={styles.metricStatusText}>Balanced Sebum</Text>
          </View>
        </View>
      </View>

      {/* ── INTERACTIVE QUIZ MODAL ── */}
      <Modal
        visible={showQuizModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuizModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowQuizModal(false)}
          />
          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(insets.bottom + 16, 28) },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="finger-print" size={18} color="#7C3AED" />
                <Text style={styles.modalTitle}>
                  Question {currentQuestionIdx + 1} of{" "}
                  {FITZPATRICK_QUIZ_QUESTIONS.length}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowQuizModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Question Stepper Indicator */}
            <View style={styles.quizProgressBarTrack}>
              <View
                style={[
                  styles.quizProgressBarFill,
                  {
                    width: `${
                      ((currentQuestionIdx + 1) /
                        FITZPATRICK_QUIZ_QUESTIONS.length) *
                      100
                    }%`,
                  },
                ]}
              />
            </View>

            {/* Question Text */}
            <Text style={styles.questionText}>{activeQuestion.question}</Text>
            <Text style={styles.questionSub}>{activeQuestion.subtitle}</Text>

            {/* Options List */}
            <ScrollView
              style={{ maxHeight: 280 }}
              showsVerticalScrollIndicator={false}
            >
              {activeQuestion.options.map((opt, oIdx) => {
                const isSelected = selectedAnswers[currentQuestionIdx] === opt.score;
                return (
                  <TouchableOpacity
                    key={`opt-${oIdx}`}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                    onPress={() => handleSelectOption(opt.score)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              {currentQuestionIdx > 0 ? (
                <TouchableOpacity
                  style={styles.prevBtn}
                  onPress={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.prevBtnText}>Previous</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.prevBtn}
                  onPress={() => setShowQuizModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.prevBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleNextQuestion}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>
                  {currentQuestionIdx === FITZPATRICK_QUIZ_QUESTIONS.length - 1
                    ? "Compute Results"
                    : "Next Question"}
                </Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
  },
  cardSuperTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C3AED",
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  actionButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FAF5FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
  },
  fitzHeroCard: {
    backgroundColor: "#FAF5FF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  fitzHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  fitzTypeBadge: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fitzTypeBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  fitzTypeName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  fitzDesc: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#475569",
    lineHeight: 16,
    marginBottom: 10,
  },
  tendencyDualRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  tendencyItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tendencyText: {
    fontSize: 10.5,
    color: "#334155",
    flex: 1,
  },
  laserAdvisoryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  laserAdvisoryText: {
    fontSize: 11,
    color: "#334155",
    flex: 1,
    lineHeight: 15,
  },
  barrierScoreCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  barrierHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  barrierSectionLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  barrierScoreValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  barrierScoreBig: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  barrierStatusWrap: {
    justifyContent: "center",
  },
  barrierStatusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  barrierSubText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748B",
  },
  barrierShieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  metricName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  metricVal: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  miniTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 4,
  },
  miniFill: {
    height: "100%",
    borderRadius: 2,
  },
  metricStatusText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#7C3AED",
  },
  quizProgressBarTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    marginBottom: 14,
  },
  quizProgressBarFill: {
    height: "100%",
    backgroundColor: "#7C3AED",
    borderRadius: 2.5,
  },
  questionText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 21,
    marginBottom: 4,
  },
  questionSub: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 14,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  optionCardSelected: {
    backgroundColor: "#FAF5FF",
    borderColor: "#C084FC",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#7C3AED",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7C3AED",
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    lineHeight: 16,
  },
  optionLabelSelected: {
    color: "#581C87",
    fontWeight: "700",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  prevBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  prevBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  nextBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    borderRadius: 10,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
