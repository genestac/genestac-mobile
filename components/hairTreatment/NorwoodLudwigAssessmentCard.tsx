// components/hairTreatment/NorwoodLudwigAssessmentCard.tsx
// Norwood & Ludwig Interactive Visual Hair Loss Stage Assessment & Stabilization Tracker

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect, Ellipse, G, Line } from "react-native-svg";
import {
  HairLossPattern,
  NorwoodStage,
  LudwigStage,
  HairStageAssessment,
  StabilizationStatus,
  NORWOOD_STAGES_META,
  LUDWIG_STAGES_META,
  getStageMetadata,
} from "@/lib/hairTreatment";

interface NorwoodLudwigAssessmentCardProps {
  assessment: HairStageAssessment;
  onUpdateAssessment: (newAssessment: HairStageAssessment) => void;
}

export function NorwoodLudwigAssessmentCard({
  assessment,
  onUpdateAssessment,
}: NorwoodLudwigAssessmentCardProps) {
  const [activePattern, setActivePattern] = useState<HairLossPattern>(
    assessment.pattern || "norwood"
  );
  const [selectedStage, setSelectedStage] = useState<NorwoodStage | LudwigStage>(
    assessment.selectedStage || "Stage III"
  );
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState<boolean>(false);
  const [tempStatus, setTempStatus] = useState<StabilizationStatus>(
    assessment.stabilizationStatus || "Active Regrowth"
  );

  const meta = getStageMetadata(activePattern, selectedStage);

  const norwoodStages: NorwoodStage[] = [
    "Stage I",
    "Stage II",
    "Stage IIa",
    "Stage III",
    "Stage III-Vertex",
    "Stage IV",
    "Stage V",
    "Stage VI",
    "Stage VII",
  ];

  const ludwigStages: LudwigStage[] = [
    "Grade I-1",
    "Grade I-2",
    "Grade I-3",
    "Grade II-1",
    "Grade II-2",
    "Grade III",
    "Advanced Diffuse",
  ];

  const stabilizationOptions: StabilizationStatus[] = [
    "Active Regrowth",
    "Stabilized (No Progression)",
    "Early Stabilization",
    "Temporary Shedding Phase",
    "Active Thinning / Needs Protocol Adjustment",
  ];

  const handlePatternChange = (pat: HairLossPattern) => {
    setActivePattern(pat);
    if (pat === "norwood") {
      setSelectedStage("Stage III");
    } else {
      setSelectedStage("Grade I-2");
    }
  };

  const handleSaveStage = () => {
    const updated: HairStageAssessment = {
      ...assessment,
      id: `stage_${Date.now()}`,
      pattern: activePattern,
      selectedStage,
      recordedDate: new Date().toISOString(),
      stabilizationStatus: tempStatus,
      dhtRisk: meta.dhtSensitivity,
      stabilizationConfidence:
        tempStatus === "Active Regrowth"
          ? 88
          : tempStatus === "Stabilized (No Progression)"
          ? 80
          : tempStatus === "Early Stabilization"
          ? 65
          : 45,
      recommendedTherapies: meta.treatments,
      notes: `Updated hair loss assessment to ${meta.title}. Stabilization status: ${tempStatus}.`,
    };

    onUpdateAssessment(updated);
    setIsUpdateModalVisible(false);
    Alert.alert(
      "Assessment Saved",
      `Your profile is now tracking ${selectedStage} with status "${tempStatus}".`
    );
  };

  // Render Anatomical Scalp SVG Illustration based on Stage
  const renderScalpGraphic = (stage: NorwoodStage | LudwigStage, pattern: HairLossPattern) => {
    const isNorwood = pattern === "norwood";

    return (
      <View style={styles.scalpSvgWrapper}>
        <Svg width={140} height={150} viewBox="0 0 140 150">
          {/* Head & Scalp Silhouette Oval */}
          <Ellipse cx="70" cy="78" rx="52" ry="60" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2.5" />

          {/* Ears */}
          <Path d="M 17,72 C 12,68 12,85 17,86" stroke="#94A3B8" strokeWidth="2" fill="none" />
          <Path d="M 123,72 C 128,68 128,85 123,86" stroke="#94A3B8" strokeWidth="2" fill="none" />

          {/* Nose tip / Forehead guide */}
          <Line x1="70" y1="20" x2="70" y2="28" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />

          {isNorwood ? (
            /* NORWOOD MALE PATTERN SCALP VISUALIZATION */
            <G>
              {/* Healthy Occipital / Lateral Fringe (Always preserved in horseshoe) */}
              <Path
                d="M 22,65 C 22,120 118,120 118,65 C 118,105 22,105 22,65 Z"
                fill="#334155"
              />

              {/* Frontal Hairline & Crown by stage */}
              {stage === "Stage I" && (
                <Path
                  d="M 28,52 Q 70,36 112,52 C 112,110 28,110 28,52 Z"
                  fill="#334155"
                />
              )}

              {stage === "Stage II" && (
                <Path
                  d="M 28,56 C 45,46 55,42 70,44 C 85,42 95,46 112,56 C 112,110 28,110 28,56 Z"
                  fill="#334155"
                />
              )}

              {stage === "Stage IIa" && (
                <Path
                  d="M 28,60 Q 70,48 112,60 C 112,110 28,110 28,60 Z"
                  fill="#334155"
                />
              )}

              {stage === "Stage III" && (
                <Path
                  d="M 26,65 C 38,48 52,50 70,50 C 88,50 102,48 114,65 C 114,115 26,115 26,65 Z"
                  fill="#334155"
                />
              )}

              {stage === "Stage III-Vertex" && (
                <G>
                  <Path
                    d="M 26,65 C 38,48 52,50 70,50 C 88,50 102,48 114,65 C 114,115 26,115 26,65 Z"
                    fill="#334155"
                  />
                  {/* Vertex thinning spot */}
                  <Circle cx="70" cy="85" r="14" fill="#F8FAFC" stroke="#F43F5E" strokeWidth="2" strokeDasharray="3,3" />
                  <Circle cx="70" cy="85" r="6" fill="#FECDD3" opacity="0.6" />
                </G>
              )}

              {stage === "Stage IV" && (
                <G>
                  {/* Frontal Tuft */}
                  <Path d="M 52,56 C 60,52 80,52 88,56 C 85,68 55,68 52,56 Z" fill="#334155" />
                  {/* Bridge band */}
                  <Path d="M 26,75 Q 70,72 114,75 C 114,83 26,83 26,75 Z" fill="#475569" />
                  {/* Vertex bare circle */}
                  <Circle cx="70" cy="94" r="17" fill="#F8FAFC" stroke="#F43F5E" strokeWidth="2" />
                </G>
              )}

              {stage === "Stage V" && (
                <G>
                  {/* Isolated small frontal island */}
                  <Circle cx="70" cy="56" r="9" fill="#475569" />
                  {/* Narrowing bridge */}
                  <Line x1="32" y1="78" x2="108" y2="78" stroke="#64748B" strokeWidth="3" strokeDasharray="4,4" />
                  {/* Large vertex bareness */}
                  <Ellipse cx="70" cy="95" rx="22" ry="16" fill="#F8FAFC" stroke="#F43F5E" strokeWidth="2" />
                </G>
              )}

              {stage === "Stage VI" && (
                <G>
                  {/* No bridge, wide bare expanse */}
                  <Ellipse cx="70" cy="74" rx="36" ry="32" fill="#F8FAFC" stroke="#F43F5E" strokeWidth="2" />
                  <Text />
                </G>
              )}

              {stage === "Stage VII" && (
                <G>
                  {/* Narrow low strip around perimeter only */}
                  <Path
                    d="M 22,95 C 22,126 118,126 118,95 C 118,112 22,112 22,95 Z"
                    fill="#475569"
                  />
                  <Ellipse cx="70" cy="70" rx="42" ry="38" fill="#F8FAFC" stroke="#EF4444" strokeWidth="2" />
                </G>
              )}
            </G>
          ) : (
            /* LUDWIG FEMALE PATTERN SCALP VISUALIZATION (DIFFUSE MID-PART WIDENING) */
            <G>
              {/* Preserved frontal fringe line in all Ludwig stages */}
              <Path
                d="M 28,48 Q 70,40 112,48 C 112,115 28,115 28,48 Z"
                fill="#334155"
              />

              {/* Parting line widening variations */}
              {stage === "Grade I-1" && (
                <Line x1="70" y1="48" x2="70" y2="95" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" />
              )}

              {stage === "Grade I-2" && (
                <G>
                  <Path d="M 68,48 Q 63,70 66,95 L 74,95 Q 77,70 72,48 Z" fill="#F8FAFC" />
                  <Line x1="70" y1="48" x2="70" y2="95" stroke="#F472B6" strokeWidth="2" strokeDasharray="2,2" />
                </G>
              )}

              {stage === "Grade I-3" && (
                <G>
                  <Path d="M 65,48 Q 58,72 63,100 L 77,100 Q 82,72 75,48 Z" fill="#F8FAFC" />
                  <Ellipse cx="70" cy="76" rx="14" ry="18" fill="#FCE7F3" opacity="0.6" />
                </G>
              )}

              {stage === "Grade II-1" && (
                <G>
                  <Ellipse cx="70" cy="76" rx="20" ry="24" fill="#F8FAFC" stroke="#EC4899" strokeWidth="2" strokeDasharray="3,3" />
                  <Path d="M 62,48 Q 50,72 58,105 L 82,105 Q 90,72 78,48 Z" fill="#F8FAFC" />
                </G>
              )}

              {stage === "Grade II-2" && (
                <G>
                  <Ellipse cx="70" cy="78" rx="26" ry="28" fill="#F8FAFC" stroke="#EC4899" strokeWidth="2.5" />
                  <Circle cx="70" cy="78" r="16" fill="#FCE7F3" opacity="0.8" />
                </G>
              )}

              {stage === "Grade III" && (
                <G>
                  <Ellipse cx="70" cy="80" rx="34" ry="32" fill="#F8FAFC" stroke="#EF4444" strokeWidth="2.5" />
                  <Path d="M 32,48 Q 70,45 108,48" stroke="#334155" strokeWidth="4" />
                </G>
              )}

              {stage === "Advanced Diffuse" && (
                <G>
                  <Ellipse cx="70" cy="78" rx="42" ry="42" fill="#F8FAFC" stroke="#EF4444" strokeWidth="2" strokeDasharray="4,4" />
                  <Path d="M 26,52 Q 70,50 114,52" stroke="#64748B" strokeWidth="2.5" />
                </G>
              )}
            </G>
          )}
        </Svg>
        <Text style={styles.scalpDiagramCaption}>
          {isNorwood ? "Male Pattern • Vertex View" : "Female Pattern • Mid-Part"}
        </Text>
      </View>
    );
  };

  const currentStagesList =
    activePattern === "norwood" ? norwoodStages : ludwigStages;

  return (
    <View style={styles.cardContainer}>
      {/* Card Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="git-network-outline" size={18} color="#EC4899" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Hair Loss Stage Assessment</Text>
            <Text style={styles.cardSubtitle}>
              Norwood & Ludwig scale visual classification
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveAssessmentBtn}
          onPress={() => setIsUpdateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text style={styles.saveAssessmentText}>Track Stage</Text>
        </TouchableOpacity>
      </View>

      {/* Pattern Switcher (Norwood vs Ludwig) */}
      <View style={styles.patternSwitchRow}>
        <TouchableOpacity
          style={[
            styles.patternTab,
            activePattern === "norwood" && styles.patternTabActive,
          ]}
          onPress={() => handlePatternChange("norwood")}
          activeOpacity={0.8}
        >
          <Text style={styles.patternIcon}>👨</Text>
          <View>
            <Text
              style={[
                styles.patternTabText,
                activePattern === "norwood" && styles.patternTabTextActive,
              ]}
            >
              Norwood Scale
            </Text>
            <Text style={styles.patternSubText}>Male Pattern Alopecia</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.patternTab,
            activePattern === "ludwig" && styles.patternTabActive,
          ]}
          onPress={() => handlePatternChange("ludwig")}
          activeOpacity={0.8}
        >
          <Text style={styles.patternIcon}>👩</Text>
          <View>
            <Text
              style={[
                styles.patternTabText,
                activePattern === "ludwig" && styles.patternTabTextActive,
              ]}
            >
              Ludwig Scale
            </Text>
            <Text style={styles.patternSubText}>Female / Diffuse Pattern</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Visual Stage Carousel Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stageCarouselContent}
      >
        {currentStagesList.map((stg) => {
          const isSelected = selectedStage === stg;
          return (
            <TouchableOpacity
              key={stg}
              style={[
                styles.stageCarouselChip,
                isSelected && styles.stageCarouselChipActive,
              ]}
              onPress={() => setSelectedStage(stg)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.stageCarouselChipText,
                  isSelected && styles.stageCarouselChipTextActive,
                ]}
              >
                {stg}
              </Text>
              {isSelected && <View style={styles.stageSelectedDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Interactive Stage Visualizer & Details Box */}
      <View style={styles.diagnosticBox}>
        {/* Left: Scalp Anatomical SVG */}
        {renderScalpGraphic(selectedStage, activePattern)}

        {/* Right: Stage Meta & Clinical Insights */}
        <View style={styles.stageMetaContent}>
          <View style={styles.stageHeadlineRow}>
            <Text style={styles.stageTitleText}>{meta.shortLabel}</Text>
            <View
              style={[
                styles.severityBadge,
                meta.severity === "Minimal" && styles.severityMinimal,
                meta.severity === "Mild" && styles.severityMild,
                meta.severity === "Moderate" && styles.severityModerate,
                meta.severity === "Advanced" && styles.severityAdvanced,
                meta.severity === "Severe" && styles.severitySevere,
              ]}
            >
              <Text style={styles.severityBadgeText}>{meta.severity} Loss</Text>
            </View>
          </View>

          <Text style={styles.stageFullName}>{meta.title}</Text>

          {/* Hairline & Crown Anatomical Status */}
          <View style={styles.diagnosticBullet}>
            <Ionicons name="scan-outline" size={13} color="#EC4899" />
            <Text style={styles.diagnosticText} numberOfLines={2}>
              {meta.hairlineDescription}
            </Text>
          </View>

          <View style={styles.diagnosticBullet}>
            <Ionicons name="radio-button-on-outline" size={13} color="#F43F5E" />
            <Text style={styles.diagnosticText} numberOfLines={2}>
              {meta.crownDescription}
            </Text>
          </View>
        </View>
      </View>

      {/* Stabilization Status & Clinical Risk Tracker Strip */}
      <View style={styles.stabilizationStrip}>
        <View style={styles.stabilizationMetric}>
          <Text style={styles.metricLabel}>Stabilization Status</Text>
          <View style={styles.statusPill}>
            <Ionicons name="shield-checkmark" size={12} color="#10B981" />
            <Text style={styles.statusPillText}>
              {assessment.stabilizationStatus}
            </Text>
          </View>
        </View>

        <View style={styles.dividerVertical} />

        <View style={styles.stabilizationMetric}>
          <Text style={styles.metricLabel}>DHT Sensitivity</Text>
          <Text
            style={[
              styles.dhtRiskText,
              meta.dhtSensitivity === "High" || meta.dhtSensitivity === "Very High"
                ? { color: "#EF4444" }
                : { color: "#F59E0B" },
            ]}
          >
            {meta.dhtSensitivity} Risk
          </Text>
        </View>

        <View style={styles.dividerVertical} />

        <View style={styles.stabilizationMetric}>
          <Text style={styles.metricLabel}>FUE Candidacy</Text>
          <Text style={styles.candidacyText}>{meta.surgicalCandidacy}</Text>
        </View>
      </View>

      {/* Recommended Targeted Treatments for This Stage */}
      <View style={styles.treatmentsBox}>
        <View style={styles.treatmentsTitleRow}>
          <Ionicons name="medkit-outline" size={14} color="#EC4899" />
          <Text style={styles.treatmentsTitle}>
            Clinical Protocol for {meta.shortLabel}
          </Text>
        </View>
        <View style={styles.treatmentsGrid}>
          {meta.treatments.map((tr, idx) => (
            <View key={idx} style={styles.treatmentChip}>
              <Ionicons name="checkmark" size={12} color="#EC4899" />
              <Text style={styles.treatmentChipText}>{tr}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Modal: Track / Update Stabilization Status */}
      <Modal
        visible={isUpdateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsUpdateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Track Hair Loss Stage</Text>
                <Text style={styles.modalSubtitle}>
                  Set current clinical stage & stabilization
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsUpdateModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionLabel}>
              Selected Stage: <Text style={{ color: "#EC4899" }}>{selectedStage}</Text> ({meta.severity})
            </Text>

            <Text style={styles.modalSectionLabel}>Current Stabilization Trend:</Text>
            <View style={styles.modalStatusList}>
              {stabilizationOptions.map((opt) => {
                const isSelected = tempStatus === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.modalStatusOption,
                      isSelected && styles.modalStatusOptionActive,
                    ]}
                    onPress={() => setTempStatus(opt)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={
                        isSelected
                          ? "radio-button-on"
                          : "radio-button-off-outline"
                      }
                      size={18}
                      color={isSelected ? "#EC4899" : "#94A3B8"}
                    />
                    <Text
                      style={[
                        styles.modalStatusText,
                        isSelected && styles.modalStatusTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsUpdateModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveStage}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.modalConfirmText}>Save Assessment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FDF2F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  saveAssessmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EC4899",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  saveAssessmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  patternSwitchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  patternTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  patternTabActive: {
    backgroundColor: "#FDF2F8",
    borderColor: "#EC4899",
  },
  patternIcon: {
    fontSize: 18,
  },
  patternTabText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
  },
  patternTabTextActive: {
    color: "#EC4899",
    fontWeight: "800",
  },
  patternSubText: {
    fontSize: 9.5,
    color: "#94A3B8",
  },
  stageCarouselContent: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 12,
  },
  stageCarouselChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stageCarouselChipActive: {
    backgroundColor: "#EC4899",
  },
  stageCarouselChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  stageCarouselChipTextActive: {
    color: "#FFFFFF",
  },
  stageSelectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  diagnosticBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    gap: 12,
  },
  scalpSvgWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  scalpDiagramCaption: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 4,
  },
  stageMetaContent: {
    flex: 1,
  },
  stageHeadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  stageTitleText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  severityMinimal: { backgroundColor: "#DCFCE7" },
  severityMild: { backgroundColor: "#FEF9C3" },
  severityModerate: { backgroundColor: "#FED7AA" },
  severityAdvanced: { backgroundColor: "#FEE2E2" },
  severitySevere: { backgroundColor: "#FFE4E6" },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0F172A",
  },
  stageFullName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  diagnosticBullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 5,
  },
  diagnosticText: {
    flex: 1,
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
  stabilizationStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FDF2F8",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  stabilizationMetric: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 3,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  dhtRiskText: {
    fontSize: 11,
    fontWeight: "800",
  },
  candidacyText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  dividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: "#FBCFE8",
  },
  treatmentsBox: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  treatmentsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  treatmentsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  treatmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  treatmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  treatmentChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 4,
  },
  modalStatusList: {
    gap: 8,
    marginBottom: 20,
  },
  modalStatusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  modalStatusOptionActive: {
    backgroundColor: "#FDF2F8",
    borderColor: "#EC4899",
  },
  modalStatusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalStatusTextActive: {
    color: "#EC4899",
    fontWeight: "700",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  modalConfirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EC4899",
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

