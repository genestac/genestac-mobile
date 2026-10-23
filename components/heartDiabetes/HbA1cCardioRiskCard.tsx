// components/heartDiabetes/HbA1cCardioRiskCard.tsx
// HbA1c 90-Day Target Goal Progress Bar & Cardiovascular Risk Score (ASCVD) Estimator

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  HbA1cGoalData,
  CardioRiskFactors,
  calculateASCVD,
} from "@/lib/heartDiabetes";

interface HbA1cCardioRiskCardProps {
  goalData: HbA1cGoalData;
  cardioFactors: CardioRiskFactors;
  onUpdateGoal: (updated: Partial<HbA1cGoalData>) => void;
  onUpdateFactors: (factors: CardioRiskFactors) => void;
}

export const HbA1cCardioRiskCard: React.FC<HbA1cCardioRiskCardProps> = ({
  goalData,
  cardioFactors,
  onUpdateGoal,
  onUpdateFactors,
}) => {
  const [hba1cModalVisible, setHba1cModalVisible] = useState(false);
  const [riskModalVisible, setRiskModalVisible] = useState(false);

  // HbA1c form state
  const [inputCurrent, setInputCurrent] = useState(
    goalData.currentHbA1c.toString()
  );
  const [inputTarget, setInputTarget] = useState(
    goalData.targetHbA1c.toString()
  );

  // Cardio factors form state
  const [factorsDraft, setFactorsDraft] = useState<CardioRiskFactors>({
    ...cardioFactors,
  });

  const ascvd = calculateASCVD(cardioFactors);

  // Calculate HbA1c progress:
  // Baseline (e.g. 7.4) -> Target (e.g. 5.7). Current (e.g. 6.8).
  // Achieved reduction = 7.4 - 6.8 = 0.6. Total needed = 7.4 - 5.7 = 1.7.
  const baseline = Math.max(goalData.baselineHbA1c, goalData.currentHbA1c);
  const totalReductionNeeded = Math.max(0.1, baseline - goalData.targetHbA1c);
  const achievedReduction = Math.max(0, baseline - goalData.currentHbA1c);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((achievedReduction / totalReductionNeeded) * 100))
  );

  const deltaToGoal = Math.round(
    (goalData.currentHbA1c - goalData.targetHbA1c) * 10
  ) / 10;

  const getHbA1cZoneInfo = (val: number) => {
    if (val < 5.7) {
      return {
        label: "Normal (<5.7%)",
        color: "#10B981",
        bg: "#ECFDF5",
      };
    }
    if (val <= 6.4) {
      return {
        label: "Pre-Diabetes (5.7–6.4%)",
        color: "#F59E0B",
        bg: "#FFFBEB",
      };
    }
    return {
      label: "Diabetes Zone (≥6.5%)",
      color: "#EF4444",
      bg: "#FEF2F2",
    };
  };

  const currentZone = getHbA1cZoneInfo(goalData.currentHbA1c);

  const handleSaveHbA1c = () => {
    const cur = parseFloat(inputCurrent);
    const tar = parseFloat(inputTarget);
    if (isNaN(cur) || cur < 4.0 || cur > 15.0) {
      Alert.alert("Invalid Value", "Please enter current HbA1c between 4.0% and 15.0%.");
      return;
    }
    if (isNaN(tar) || tar < 4.5 || tar > 8.0) {
      Alert.alert("Invalid Goal", "Please enter target HbA1c between 4.5% and 8.0%.");
      return;
    }

    onUpdateGoal({
      currentHbA1c: cur,
      targetHbA1c: tar,
      lastTestedDate: new Date().toISOString().split("T")[0],
    });

    setHba1cModalVisible(false);
  };

  const handleSaveRisk = () => {
    onUpdateFactors(factorsDraft);
    setRiskModalVisible(false);
  };

  return (
    <View style={styles.cardContainer}>
      {/* SECTION 1: 90-DAY HbA1c GOAL TARGET */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="ribbon" size={17} color="#7C3AED" />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.cardSuperTitle}>LONG-TERM GLYCEMIC CONTROL</Text>
            <Text style={styles.cardTitle}>90-Day HbA1c Goal Tracker</Text>
          </View>
        </View>
      </View>

      {/* Action Button on Next Line */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity
          style={styles.hba1cBtn}
          onPress={() => {
            setInputCurrent(goalData.currentHbA1c.toString());
            setInputTarget(goalData.targetHbA1c.toString());
            setHba1cModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={15} color="#7C3AED" />
          <Text style={styles.hba1cBtnText}>Update Glycemic</Text>
        </TouchableOpacity>
      </View>

      {/* HbA1c Hero Box */}
      <View style={styles.hba1cHeroBox}>
        <View style={styles.hba1cValuesRow}>
          <View>
            <Text style={styles.valSubLabel}>Latest Test Result</Text>
            <View style={styles.numRow}>
              <Text style={[styles.valBig, { color: currentZone.color }]}>
                {goalData.currentHbA1c}%
              </Text>
              <View
                style={[styles.zoneBadgeMini, { backgroundColor: currentZone.color }]}
              >
                <Text style={styles.zoneBadgeMiniText}>{currentZone.label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.targetCol}>
            <Text style={styles.valSubLabel}>90-Day Goal</Text>
            <View style={styles.targetBadge}>
              <Ionicons name="flag" size={13} color="#059669" />
              <Text style={styles.targetText}>{goalData.targetHbA1c}%</Text>
            </View>
          </View>
        </View>

        {/* PROGRESS BAR */}
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressLabel}>
              {deltaToGoal > 0 ? (
                <Text style={{ color: "#7C3AED", fontWeight: "800" }}>
                  -{deltaToGoal}% to reach {goalData.targetHbA1c}% target
                </Text>
              ) : (
                <Text style={{ color: "#10B981", fontWeight: "800" }}>
                  🎉 Goal Achieved! ({goalData.currentHbA1c}%)
                </Text>
              )}
            </Text>
            <Text style={styles.progressPercentText}>{progressPercent}% Progress</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(8, progressPercent)}%`,
                  backgroundColor: currentZone.color,
                },
              ]}
            />
          </View>

          <View style={styles.progressFootRow}>
            <Text style={styles.progressFoot}>Baseline: {goalData.baselineHbA1c}%</Text>
            <Text style={styles.progressFoot}>
              📅 {goalData.daysRemaining} days remaining in cycle
            </Text>
          </View>
        </View>
      </View>

      {/* SECTION 2: CARDIOVASCULAR 10-YEAR RISK SCORE */}
      <View style={[styles.headerRow, { marginTop: 16, marginBottom: 8 }]}>
        <View style={styles.badgeRow}>
          <View style={[styles.iconCircle, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="heart-dislike" size={17} color="#DC2626" />
          </View>
          <View style={styles.titleWrap}>
            <Text style={[styles.cardSuperTitle, { color: "#DC2626" }]}>
              AHA / ACC ASCVD MODEL
            </Text>
            <Text style={styles.cardTitle}>Cardiovascular Risk Score</Text>
          </View>
        </View>
      </View>

      {/* Action Button on Next Line */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity
          style={styles.riskBtn}
          onPress={() => {
            setFactorsDraft({ ...cardioFactors });
            setRiskModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={15} color="#DC2626" />
          <Text style={styles.riskBtnText}>Customise</Text>
        </TouchableOpacity>
      </View>

      {/* ASCVD Score Card */}
      <View style={[styles.riskCard, { borderColor: ascvd.color + "40" }]}>
        <View style={styles.riskMainRow}>
          <Text style={styles.riskSubLabel}>10-Year Atherosclerotic CVD Risk</Text>
          <View style={styles.riskScoreRow}>
            <Text style={[styles.riskScoreBig, { color: ascvd.color }]}>
              {ascvd.scorePercent}%
            </Text>
            <View
              style={[styles.riskCategoryBadge, { backgroundColor: ascvd.color }]}
            >
              <Text style={styles.riskCategoryText}>{ascvd.categoryLabel}</Text>
            </View>
          </View>
        </View>

        {/* Quick Factor Chips on Next Line */}
        <View style={styles.factorChipsRow}>
          <View style={styles.factorChip}>
            <Text style={styles.factorChipLabel}>Age:</Text>
            <Text style={styles.factorChipVal}>{cardioFactors.age}y</Text>
          </View>
          <View style={styles.factorChip}>
            <Text style={styles.factorChipLabel}>BP:</Text>
            <Text style={styles.factorChipVal}>{cardioFactors.systolicBP} mmHg</Text>
          </View>
          <View style={styles.factorChip}>
            <Text style={styles.factorChipLabel}>Cholesterol:</Text>
            <Text style={styles.factorChipVal}>{cardioFactors.totalCholesterol} mg</Text>
          </View>
        </View>

        {/* Clinical Recommendations */}
        <View style={styles.recContainer}>
          <Text style={styles.recTitle}>Physician Care Guidelines:</Text>
          {ascvd.recommendations.map((rec, idx) => (
            <View key={idx} style={styles.recItemRow}>
              <Ionicons name="checkmark-circle" size={13} color={ascvd.color} />
              <Text style={styles.recText}>{rec}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* MODAL 1: UPDATE HbA1c */}
      <Modal
        visible={hba1cModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHba1cModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="ribbon" size={18} color="#7C3AED" />
                <Text style={styles.modalTitle}>Update HbA1c Goal</Text>
              </View>
              <TouchableOpacity onPress={() => setHba1cModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalFieldLabel}>Latest Lab HbA1c (%)</Text>
            <TextInput
              style={styles.modalInput}
              value={inputCurrent}
              onChangeText={setInputCurrent}
              keyboardType="decimal-pad"
              placeholder="e.g. 6.8"
            />

            <Text style={styles.modalFieldLabel}>90-Day Target Goal (%)</Text>
            <TextInput
              style={styles.modalInput}
              value={inputTarget}
              onChangeText={setInputTarget}
              keyboardType="decimal-pad"
              placeholder="e.g. 5.7"
            />
            <Text style={styles.modalHint}>
              American Diabetes Association recommended target is &lt;7.0% for most adults, or &lt;5.7% for pre-diabetes remission.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setHba1cModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: "#7C3AED" }]}
                onPress={handleSaveHbA1c}
              >
                <Text style={styles.saveBtnText}>Save HbA1c</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CUSTOMIZE CARDIO RISK FACTORS */}
      <Modal
        visible={riskModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRiskModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="options" size={18} color="#DC2626" />
                <Text style={styles.modalTitle}>ASCVD Risk Factors</Text>
              </View>
              <TouchableOpacity onPress={() => setRiskModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.factorRowInput}>
              <Text style={styles.factorLabel}>Patient Age</Text>
              <TextInput
                style={styles.factorInput}
                value={factorsDraft.age.toString()}
                onChangeText={(t) =>
                  setFactorsDraft((prev) => ({
                    ...prev,
                    age: parseInt(t, 10) || 40,
                  }))
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.factorRowInput}>
              <Text style={styles.factorLabel}>Systolic BP (mmHg)</Text>
              <TextInput
                style={styles.factorInput}
                value={factorsDraft.systolicBP.toString()}
                onChangeText={(t) =>
                  setFactorsDraft((prev) => ({
                    ...prev,
                    systolicBP: parseInt(t, 10) || 120,
                  }))
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.factorRowInput}>
              <Text style={styles.factorLabel}>Total Cholesterol (mg/dL)</Text>
              <TextInput
                style={styles.factorInput}
                value={factorsDraft.totalCholesterol.toString()}
                onChangeText={(t) =>
                  setFactorsDraft((prev) => ({
                    ...prev,
                    totalCholesterol: parseInt(t, 10) || 190,
                  }))
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.factorRowInput}>
              <Text style={styles.factorLabel}>HDL Cholesterol (mg/dL)</Text>
              <TextInput
                style={styles.factorInput}
                value={factorsDraft.hdlCholesterol.toString()}
                onChangeText={(t) =>
                  setFactorsDraft((prev) => ({
                    ...prev,
                    hdlCholesterol: parseInt(t, 10) || 45,
                  }))
                }
                keyboardType="numeric"
              />
            </View>

            {/* Switches */}
            <View style={styles.switchRow}>
              <Text style={styles.factorLabel}>Current Smoker</Text>
              <Switch
                value={factorsDraft.isSmoker}
                onValueChange={(val) =>
                  setFactorsDraft((prev) => ({ ...prev, isSmoker: val }))
                }
                trackColor={{ false: "#CBD5E1", true: "#DC2626" }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.factorLabel}>Diagnosed Diabetes</Text>
              <Switch
                value={factorsDraft.hasDiabetes}
                onValueChange={(val) =>
                  setFactorsDraft((prev) => ({ ...prev, hasDiabetes: val }))
                }
                trackColor={{ false: "#CBD5E1", true: "#DC2626" }}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRiskModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleSaveRisk}
              >
                <Text style={styles.saveBtnText}>Update Risk Score</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  titleWrap: {
    flex: 1,
  },
  actionButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardSuperTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C3AED",
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  hba1cBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#C084FC",
  },
  hba1cBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
  },
  riskBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#F87171",
  },
  riskBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  hba1cHeroBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hba1cValuesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  valSubLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
  numRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  valBig: {
    fontSize: 28,
    fontWeight: "900",
  },
  zoneBadgeMini: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  zoneBadgeMiniText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  targetCol: {
    alignItems: "flex-end",
  },
  targetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  targetText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#059669",
  },
  progressBarWrapper: {
    marginTop: 6,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  progressTrack: {
    height: 9,
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressFootRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  progressFoot: {
    fontSize: 10,
    color: "#64748B",
  },
  riskCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  riskMainRow: {
    marginBottom: 8,
  },
  riskSubLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
  riskScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  riskScoreBig: {
    fontSize: 30,
    fontWeight: "900",
  },
  riskCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  riskCategoryText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  factorChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  factorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  factorChipLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  factorChipVal: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0F172A",
  },
  recContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(220, 38, 38, 0.15)",
    paddingTop: 8,
    marginTop: 4,
  },
  recTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  recItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginVertical: 2,
  },
  recText: {
    fontSize: 11,
    color: "#334155",
    flex: 1,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalHint: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 14,
  },
  factorRowInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  factorLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  factorInput: {
    width: 80,
    height: 38,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
