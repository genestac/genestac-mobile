// components/hairTreatment/HairSheddingDensityLogCard.tsx
// Hair Shedding & Density Log: Weekly Self-Assessment, Shedding Trend & Dread-Shed Education

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  HairSheddingLevel,
  SheddingLog,
} from "@/lib/hairTreatment";

interface HairSheddingDensityLogCardProps {
  logs: SheddingLog[];
  onAddLog: (newLog: SheddingLog) => void;
}

export function HairSheddingDensityLogCard({
  logs,
  onAddLog,
}: HairSheddingDensityLogCardProps) {
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);
  const [selectedLevel, setSelectedLevel] = useState<HairSheddingLevel>("low");
  const [densityRating, setDensityRating] = useState<number>(4);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(["Healthy"]);
  const [userNotes, setUserNotes] = useState<string>("");

  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;

  const sheddingLevelMeta: Record<
    HairSheddingLevel,
    {
      title: string;
      range: string;
      color: string;
      bgColor: string;
      borderColor: string;
      desc: string;
      icon: string;
    }
  > = {
    low: {
      title: "Low / Minimal",
      range: "< 50 hairs/day",
      color: "#10B981",
      bgColor: "#ECFDF5",
      borderColor: "#A7F3D0",
      desc: "Optimal follicular retention. Shedding is well below standard physiological turnover.",
      icon: "checkmark-circle",
    },
    normal: {
      title: "Normal / Physiological",
      range: "50–100 hairs/day",
      color: "#F59E0B",
      bgColor: "#FFFBEB",
      borderColor: "#FDE68A",
      desc: "Healthy natural hair turnover. Telogen club hairs naturally giving way to new cycle.",
      icon: "swap-horizontal",
    },
    heavy: {
      title: "Heavy / Increased",
      range: "> 100 hairs/day",
      color: "#EF4444",
      bgColor: "#FEF2F2",
      borderColor: "#FECDD3",
      desc: "Elevated shedding noticed on pillow or in shower. May indicate early Minoxidil shed phase.",
      icon: "alert-circle",
    },
  };

  const symptomOptions = [
    "Healthy / Calm",
    "Mild Itchiness",
    "Dry Flakes / Dandruff",
    "Scalp Redness",
    "Tension / Trichodynia",
  ];

  const toggleSymptom = (symptom: string) => {
    if (symptom === "Healthy / Calm") {
      setSelectedSymptoms(["Healthy / Calm"]);
      return;
    }

    const filtered = selectedSymptoms.filter((s) => s !== "Healthy / Calm");
    if (filtered.includes(symptom)) {
      const remaining = filtered.filter((s) => s !== symptom);
      setSelectedSymptoms(remaining.length === 0 ? ["Healthy / Calm"] : remaining);
    } else {
      setSelectedSymptoms([...filtered, symptom]);
    }
  };

  const handleSaveLog = () => {
    const nextWeek = logs.length > 0 ? (logs[logs.length - 1].weekNumber || 1) + 1 : 1;
    const isMinoxPhase = selectedLevel === "heavy" && nextWeek <= 6;

    const newEntry: SheddingLog = {
      id: `shed_${Date.now()}`,
      date: new Date().toISOString(),
      weekNumber: nextWeek,
      sheddingLevel: selectedLevel,
      estimatedHairsLost: sheddingLevelMeta[selectedLevel].range,
      densityRating,
      scalpSymptoms: selectedSymptoms,
      minoxidilPhaseNotice: isMinoxPhase,
      notes:
        userNotes.trim() ||
        `Week ${nextWeek} assessment: ${sheddingLevelMeta[selectedLevel].title} hair fall recorded.`,
    };

    onAddLog(newEntry);
    setIsLogModalVisible(false);
    setUserNotes("");

    if (isMinoxPhase) {
      Alert.alert(
        "💡 Don't Panic: Dread Shed Detected",
        "It's completely normal to experience increased shedding during weeks 2 to 6 of starting Minoxidil. This signals that dormant telogen hairs are being pushed out by thick new anagen follicles!"
      );
    } else {
      Alert.alert(
        "Logged Successfully",
        `Recorded Week ${nextWeek} hair shedding as ${sheddingLevelMeta[selectedLevel].title}.`
      );
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="analytics-outline" size={18} color="#EC4899" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Hair Shedding & Density Log</Text>
            <Text style={styles.cardSubtitle}>
              Weekly self-assessment tracking hair fall reduction
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logNewBtn}
          onPress={() => setIsLogModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.logNewBtnText}>Log Week</Text>
        </TouchableOpacity>
      </View>

      {/* Latest Shedding Level Card */}
      {latestLog ? (
        <View
          style={[
            styles.latestStatusCard,
            {
              backgroundColor: sheddingLevelMeta[latestLog.sheddingLevel].bgColor,
              borderColor: sheddingLevelMeta[latestLog.sheddingLevel].borderColor,
            },
          ]}
        >
          <View style={styles.latestStatusHeader}>
            <View style={styles.latestLevelTag}>
              <Ionicons
                name={sheddingLevelMeta[latestLog.sheddingLevel].icon as any}
                size={16}
                color={sheddingLevelMeta[latestLog.sheddingLevel].color}
              />
              <Text
                style={[
                  styles.latestLevelText,
                  { color: sheddingLevelMeta[latestLog.sheddingLevel].color },
                ]}
              >
                {sheddingLevelMeta[latestLog.sheddingLevel].title}
              </Text>
            </View>
            <Text style={styles.latestWeekText}>Week {latestLog.weekNumber}</Text>
          </View>

          <Text style={styles.latestRangeText}>
            Estimated Loss:{" "}
            <Text style={{ fontWeight: "800" }}>{latestLog.estimatedHairsLost}</Text>
          </Text>

          {/* Scalp Density Rating Stars */}
          <View style={styles.densityRatingRow}>
            <Text style={styles.densityRatingLabel}>Felt Scalp Density:</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= latestLog.densityRating ? "star" : "star-outline"}
                  size={15}
                  color="#EC4899"
                />
              ))}
            </View>
            <Text style={styles.densityRatingScore}>
              {latestLog.densityRating}/5
            </Text>
          </View>

          {/* Clinical note */}
          <Text style={styles.latestDescText}>
            {sheddingLevelMeta[latestLog.sheddingLevel].desc}
          </Text>

          {/* Dread Shed educational notice if flagged */}
          {latestLog.minoxidilPhaseNotice && (
            <View style={styles.dreadShedNoticeBox}>
              <Ionicons name="sparkles" size={14} color="#EA580C" />
              <Text style={styles.dreadShedNoticeText}>
                Active Anagen Remodeling: Early shedding is expected during weeks 2–6.
                Do not pause treatment!
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyLogBox}>
          <Text style={styles.emptyLogText}>
            No hair shedding logs recorded yet. Tap "Log Week" to start your weekly assessment.
          </Text>
        </View>
      )}

      {/* Historical Shedding Timeline Trend */}
      <View style={styles.timelineSection}>
        <Text style={styles.timelineTitle}>Shedding Reduction History</Text>
        <View style={styles.timelineList}>
          {logs.slice(-4).reverse().map((entry) => {
            const meta = sheddingLevelMeta[entry.sheddingLevel];
            return (
              <View key={entry.id} style={styles.timelineRow}>
                <View style={styles.timelineDotBox}>
                  <View
                    style={[styles.timelineDot, { backgroundColor: meta.color }]}
                  />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineEntryHeader}>
                    <Text style={styles.timelineWeekLabel}>
                      Week {entry.weekNumber}
                    </Text>
                    <View
                      style={[
                        styles.timelinePill,
                        { backgroundColor: meta.bgColor, borderColor: meta.borderColor },
                      ]}
                    >
                      <Text style={[styles.timelinePillText, { color: meta.color }]}>
                        {meta.title}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.timelineDateText}>
                    {new Date(entry.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    • {entry.estimatedHairsLost} • Density: {entry.densityRating}/5
                  </Text>
                  {entry.notes && (
                    <Text style={styles.timelineNoteText}>{entry.notes}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Modal: New Weekly Shedding Assessment */}
      <Modal
        visible={isLogModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsLogModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Weekly Shedding Check-In</Text>
                <Text style={styles.modalSubtitle}>
                  Evaluate this week's hair fall rate and scalp feel
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsLogModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Shedding Level Selector */}
              <Text style={styles.modalSectionLabel}>1. Hair Fall Rate:</Text>
              <View style={styles.levelSelectorGrid}>
                {(["low", "normal", "heavy"] as HairSheddingLevel[]).map((lvl) => {
                  const m = sheddingLevelMeta[lvl];
                  const isSelected = selectedLevel === lvl;
                  return (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.levelSelectCard,
                        isSelected && {
                          backgroundColor: m.bgColor,
                          borderColor: m.color,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => setSelectedLevel(lvl)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.levelCardTop}>
                        <Ionicons name={m.icon as any} size={18} color={m.color} />
                        <Text style={[styles.levelCardTitle, { color: m.color }]}>
                          {m.title}
                        </Text>
                      </View>
                      <Text style={styles.levelCardRange}>{m.range}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Scalp Density Rating */}
              <Text style={styles.modalSectionLabel}>
                2. Scalp Density Feel ({densityRating}/5):
              </Text>
              <View style={styles.starPickerRow}>
                {[1, 2, 3, 4, 5].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={styles.starTouchBtn}
                    onPress={() => setDensityRating(st)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={st <= densityRating ? "star" : "star-outline"}
                      size={28}
                      color="#EC4899"
                    />
                    <Text style={styles.starRatingDesc}>
                      {st === 1
                        ? "Thinning"
                        : st === 3
                        ? "Average"
                        : st === 5
                        ? "Thick"
                        : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Scalp Symptoms Check */}
              <Text style={styles.modalSectionLabel}>3. Scalp Sensation:</Text>
              <View style={styles.symptomsWrap}>
                {symptomOptions.map((sym) => {
                  const isChecked = selectedSymptoms.includes(sym);
                  return (
                    <TouchableOpacity
                      key={sym}
                      style={[
                        styles.symptomChip,
                        isChecked && styles.symptomChipActive,
                      ]}
                      onPress={() => toggleSymptom(sym)}
                      activeOpacity={0.8}
                    >
                      {isChecked && (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      )}
                      <Text
                        style={[
                          styles.symptomChipText,
                          isChecked && styles.symptomChipTextActive,
                        ]}
                      >
                        {sym}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional Notes */}
              <Text style={styles.modalSectionLabel}>4. Notes (Optional):</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Less hairs in shower drain, started derma-rolling..."
                placeholderTextColor="#94A3B8"
                value={userNotes}
                onChangeText={setUserNotes}
                multiline
                numberOfLines={2}
              />

              {/* Action Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsLogModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleSaveLog}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.modalConfirmText}>Save Weekly Log</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  logNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EC4899",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logNewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  latestStatusCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  latestStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  latestLevelTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  latestLevelText: {
    fontSize: 14,
    fontWeight: "800",
  },
  latestWeekText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  latestRangeText: {
    fontSize: 12,
    color: "#334155",
    marginBottom: 8,
  },
  densityRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  densityRatingLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  densityRatingScore: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#EC4899",
    marginLeft: 4,
  },
  latestDescText: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
  dreadShedNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFEDD5",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  dreadShedNoticeText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: "600",
    color: "#C2410C",
    lineHeight: 14,
  },
  emptyLogBox: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  emptyLogText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  timelineSection: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  timelineTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  timelineList: {
    gap: 12,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  timelineDotBox: {
    paddingTop: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  timelineWeekLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  timelinePill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  timelinePillText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  timelineDateText: {
    fontSize: 10.5,
    color: "#64748B",
  },
  timelineNoteText: {
    fontSize: 10.5,
    color: "#475569",
    marginTop: 2,
    fontStyle: "italic",
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
    maxHeight: "85%",
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
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 10,
  },
  levelSelectorGrid: {
    gap: 8,
  },
  levelSelectCard: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  levelCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  levelCardTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  levelCardRange: {
    fontSize: 11,
    color: "#64748B",
    marginLeft: 24,
  },
  starPickerRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  starTouchBtn: {
    alignItems: "center",
  },
  starRatingDesc: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 2,
  },
  symptomsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  symptomChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  symptomChipActive: {
    backgroundColor: "#EC4899",
  },
  symptomChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  symptomChipTextActive: {
    color: "#FFFFFF",
  },
  modalTextInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    fontSize: 12,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 50,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    marginBottom: 24,
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

