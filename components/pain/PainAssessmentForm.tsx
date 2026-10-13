// components/pain/PainAssessmentForm.tsx
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  PatientPainMap,
  PainType,
  PainDuration,
  AggravatingFactor,
  BodyRegionId,
  BODY_REGIONS,
  ClinicalAssessment,
} from "@/lib/painMap";

interface PainAssessmentFormProps {
  selectedRegion?: BodyRegionId;
  selectedRegions?: BodyRegionId[];
  onSubmitAssessment: (
    map: PatientPainMap,
    assessment: ClinicalAssessment,
    allRegions?: BodyRegionId[]
  ) => void;
  onGenerateAISummary: (
    map: PatientPainMap,
    assessment: ClinicalAssessment,
    allRegions?: BodyRegionId[]
  ) => void;
}

const PAIN_TYPES: { type: PainType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: "Sharp", icon: "flash-outline" },
  { type: "Dull", icon: "ellipse-outline" },
  { type: "Burning", icon: "flame-outline" },
  { type: "Stabbing", icon: "navigate-outline" },
  { type: "Throbbing", icon: "pulse-outline" },
  { type: "Tingling", icon: "sparkles-outline" },
  { type: "Numbness", icon: "hand-left-outline" },
];

const DURATIONS: { label: string; value: PainDuration }[] = [
  { label: "1 Week", value: "1_week" },
  { label: "2 Weeks", value: "2_weeks" },
  { label: "1 Month", value: "1_month" },
  { label: "3 Months", value: "3_months" },
  { label: "1 Year+", value: "1_year" },
];

const AGGRAVATING_FACTORS: {
  label: string;
  value: AggravatingFactor;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: "Walking", value: "walking", icon: "walk-outline" },
  { label: "Running", value: "running", icon: "fitness-outline" },
  { label: "Standing", value: "standing", icon: "body-outline" },
  { label: "Sitting", value: "sitting", icon: "easel-outline" },
  { label: "Stairs", value: "stairs", icon: "trending-up-outline" },
  { label: "Sleeping", value: "sleeping", icon: "bed-outline" },
];

/**
 * Custom Interactive Pain Score Range Selector Bar Component
 * Supports smooth drag/scroll left and right directly on the bar.
 */
const PainScoreRangeBar: React.FC<{
  value: number;
  onChange: (val: number) => void;
  color: string;
}> = ({ value, onChange, color }) => {
  const [barWidth, setBarWidth] = useState<number>(0);
  const initialValueRef = useRef<number>(value);
  const initialXRef = useRef<number>(0);
  const barWidthRef = useRef<number>(0);
  barWidthRef.current = barWidth;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        initialValueRef.current = value;
        initialXRef.current = evt.nativeEvent.locationX;
        if (barWidthRef.current > 0) {
          const directScore = Math.min(
            10,
            Math.max(
              0,
              Math.round(
                (evt.nativeEvent.locationX / barWidthRef.current) * 10,
              ),
            ),
          );
          onChange(directScore);
          initialValueRef.current = directScore;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (barWidthRef.current > 0) {
          const currentX = initialXRef.current + gestureState.dx;
          const newScore = Math.min(
            10,
            Math.max(0, Math.round((currentX / barWidthRef.current) * 10)),
          );
          onChange(newScore);
        }
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const pct = (value / 10) * 100;

  return (
    <View style={styles.rangeContainer}>
      {/* Interactive Range Track & Drag Handle */}
      <View
        style={styles.rangeTrackWrapper}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        {/* Track Background */}
        <View style={styles.rangeTrackBg}>
          <View
            style={[
              styles.rangeTrackFill,
              { width: `${pct}%`, backgroundColor: color },
            ]}
          />
        </View>

        {/* Thumb Knob */}
        <View
          style={[
            styles.rangeThumb,
            {
              left: `${pct}%`,
              borderColor: color,
            },
          ]}
        >
          <View style={[styles.rangeThumbDot, { backgroundColor: color }]} />
        </View>
      </View>

      {/* Static Non-Clickable Scale Indicator Numbers 0 to 10 */}
      <View style={styles.rangeTicksRow}>
        {Array.from({ length: 11 }, (_, i) => i).map((score) => {
          const isSelected = value === score;
          return (
            <Text
              key={score}
              style={[
                styles.tickText,
                isSelected && { color: color, fontWeight: "800", fontSize: 13 },
              ]}
            >
              {score}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

export const PainAssessmentForm: React.FC<PainAssessmentFormProps> = ({
  selectedRegion,
  selectedRegions,
  onSubmitAssessment,
  onGenerateAISummary,
}) => {
  const [painScore, setPainScore] = useState<number>(8);
  const [selectedPainTypes, setSelectedPainTypes] = useState<PainType[]>([
    "Sharp",
    "Burning",
  ]);
  const [duration, setDuration] = useState<PainDuration>("3_months");
  const [selectedFactors, setSelectedFactors] = useState<AggravatingFactor[]>([
    "walking",
    "stairs",
  ]);
  const [notes, setNotes] = useState<string>(
    "Pain increases during stair climbing or prolonged walking.",
  );

  const activeRegions: BodyRegionId[] =
    selectedRegions !== undefined && selectedRegions.length > 0
      ? selectedRegions
      : selectedRegion
      ? [selectedRegion]
      : ["left_knee"];

  const primaryRegion = activeRegions[0] || "left_knee";
  const allRegionLabels = activeRegions
    .map((rId) => BODY_REGIONS.find((r) => r.id === rId)?.label || rId)
    .join(", ");

  const togglePainType = (type: PainType) => {
    if (selectedPainTypes.includes(type)) {
      setSelectedPainTypes(selectedPainTypes.filter((t) => t !== type));
    } else {
      setSelectedPainTypes([...selectedPainTypes, type]);
    }
  };

  const toggleFactor = (factor: AggravatingFactor) => {
    if (selectedFactors.includes(factor)) {
      setSelectedFactors(selectedFactors.filter((f) => f !== factor));
    } else {
      setSelectedFactors([...selectedFactors, factor]);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 3) return "#10B981";
    if (score <= 6) return "#F59E0B";
    return "#EF4444";
  };

  const getScoreLabel = (score: number) => {
    if (score === 0) return "No Pain";
    if (score <= 3) return "Mild Pain";
    if (score <= 6) return "Moderate Pain";
    if (score <= 8) return "Severe Pain";
    return "Extreme Pain";
  };

  const buildCurrentObjects = (): {
    map: PatientPainMap;
    assessment: ClinicalAssessment;
  } => {
    const map: PatientPainMap = {
      id: `pm-${Date.now()}`,
      body_region: primaryRegion,
      body_region_label: allRegionLabels,
      additional_regions: activeRegions.length > 1 ? activeRegions : undefined,
      pain_score: painScore,
      pain_type: selectedPainTypes,
      duration: duration,
      aggravating_factors: selectedFactors,
      notes: notes,
      created_at: new Date().toISOString(),
    };

    const assessment: ClinicalAssessment = {
      id: `pa-${Date.now()}`,
      diagnosis: "",
      flexion_degrees: 95,
      extension_degrees: 5,
      walking_distance_meters: 200,
      stairs_difficulty: true,
      squat_difficulty: true,
      created_at: new Date().toISOString(),
    };

    return { map, assessment };
  };

  const handleSave = () => {
    const { map, assessment } = buildCurrentObjects();
    onSubmitAssessment(map, assessment, activeRegions);
  };

  const handleAISummary = () => {
    const { map, assessment } = buildCurrentObjects();
    onGenerateAISummary(map, assessment, activeRegions);
  };

  return (
    <View style={styles.cardContainer}>
      {/* Target Assessment Areas Banner */}
      <View style={styles.targetAreasBanner}>
        <View style={styles.targetAreasHeader}>
          <Ionicons name="medical" size={13} color="#DC2626" />
          <Text style={styles.targetAreasTitle}>
            ASSESSMENT TARGET ({activeRegions.length} {activeRegions.length === 1 ? "POINT" : "POINTS"})
          </Text>
        </View>
        <View style={styles.targetAreasChips}>
          {activeRegions.map((rId) => {
            const label = BODY_REGIONS.find((r) => r.id === rId)?.label || rId;
            return (
              <View key={rId} style={styles.targetAreaChip}>
                <View style={[styles.targetDot, { backgroundColor: getScoreColor(painScore) }]} />
                <Text style={styles.targetAreaChipText}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.tabContent}>
        {/* 1. Pain Severity Range Selector Bar */}
        <View style={styles.sectionGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Pain Score</Text>
            <View
              style={[
                styles.scoreBadge,
                { backgroundColor: getScoreColor(painScore) },
              ]}
            >
              <Text style={styles.scoreBadgeText}>
                {painScore}/10 — {getScoreLabel(painScore)}
              </Text>
            </View>
          </View>

          {/* Interactive Range Selector Bar */}
          <PainScoreRangeBar
            value={painScore}
            onChange={setPainScore}
            color={getScoreColor(painScore)}
          />
        </View>

        {/* 2. Pain Sensation / Type */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>2. Pain Type & Sensation</Text>
          <View style={styles.gridWrap}>
            {PAIN_TYPES.map((item) => {
              const isSelected = selectedPainTypes.includes(item.type);
              return (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.gridChip,
                    isSelected && styles.gridChipActive,
                  ]}
                  onPress={() => togglePainType(item.type)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={14}
                    color={isSelected ? "#DC2626" : "#64748B"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.gridChipText,
                      isSelected && styles.gridChipTextActive,
                    ]}
                  >
                    {item.type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Symptom Duration */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>3. Duration of Pain</Text>
          <View style={styles.durationGridWrap}>
            {DURATIONS.map((dur) => {
              const isSelected = duration === dur.value;
              return (
                <TouchableOpacity
                  key={dur.value}
                  style={[
                    styles.durationCard,
                    isSelected && styles.durationCardActive,
                  ]}
                  onPress={() => setDuration(dur.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={isSelected ? "#DC2626" : "#64748B"}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.durationCardText,
                      isSelected && styles.durationCardTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {dur.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. Aggravating Activities */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>4. Aggravating Activities</Text>
          <View style={styles.durationGridWrap}>
            {AGGRAVATING_FACTORS.map((f) => {
              const isSelected = selectedFactors.includes(f.value);
              return (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.durationCard,
                    isSelected && styles.durationCardActive,
                  ]}
                  onPress={() => toggleFactor(f.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={f.icon}
                    size={13}
                    color={isSelected ? "#DC2626" : "#64748B"}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.durationCardText,
                      isSelected && styles.durationCardTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5. Additional Notes */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>5. Patient Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe specific pain triggers or details..."
          />
        </View>
      </View>

      {/* Action Footer Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.primarySaveBtn}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Ionicons name="save" size={16} color="#FFFFFF" />
          <Text style={styles.primarySaveBtnText}>Submit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.aiInsightsBtn}
          onPress={handleAISummary}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={16} color="#7C3AED" />
          <Text style={styles.aiInsightsBtnText}>AI Assessment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 6,
    marginTop: -18,
  },
  targetAreasBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    marginBottom: 14,
  },
  targetAreasHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  targetAreasTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#991B1B",
    letterSpacing: 0.5,
  },
  targetAreasChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  targetAreaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  targetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  targetAreaChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7F1D1D",
  },
  tabContent: {
    gap: 16,
  },
  sectionGroup: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.1,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  rangeContainer: {
    marginVertical: 4,
    gap: 10,
  },
  rangeTrackWrapper: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  rangeTrackBg: {
    height: 10,
    backgroundColor: "#E2E8F0",
    borderRadius: 5,
    overflow: "hidden",
    width: "100%",
  },
  rangeTrackFill: {
    height: "100%",
    borderRadius: 5,
  },
  rangeThumb: {
    position: "absolute",
    top: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    marginLeft: -2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rangeThumbDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rangeTicksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  tickText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  gridChipActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#DC2626",
  },
  gridChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  gridChipTextActive: {
    color: "#DC2626",
    fontWeight: "800",
  },
  durationGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationCard: {
    width: "31.3%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  durationCardActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#DC2626",
  },
  durationCardText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  durationCardTextActive: {
    color: "#DC2626",
    fontWeight: "800",
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  primarySaveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primarySaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  aiInsightsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#C084FC",
    paddingVertical: 12,
    borderRadius: 12,
  },
  aiInsightsBtnText: {
    color: "#7C3AED",
    fontWeight: "800",
    fontSize: 13,
  },
});
