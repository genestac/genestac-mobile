// components/heartDiabetes/BloodGlucoseTrackerCard.tsx
// Blood Glucose (Sugar) Tracker with Fasting vs Post-Prandial Context Pills & Color-Coded Zones

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GlucoseLog,
  GlucoseMealContext,
  evaluateGlucose,
} from "@/lib/heartDiabetes";

interface BloodGlucoseTrackerCardProps {
  logs: GlucoseLog[];
  onAddLog: (log: Omit<GlucoseLog, "id" | "zone">) => void;
  onDeleteLog?: (id: string) => void;
}

export const BloodGlucoseTrackerCard: React.FC<BloodGlucoseTrackerCardProps> = ({
  logs,
  onAddLog,
  onDeleteLog,
}) => {
  const [selectedContext, setSelectedContext] =
    useState<GlucoseMealContext>("fasting");
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState("95");
  const [inputNotes, setInputNotes] = useState("");
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Latest log & current zone evaluation
  const latestLog = logs[0];
  const activeReading = latestLog ? latestLog.value : 95;
  const activeContext = latestLog ? latestLog.context : selectedContext;
  const zoneDetails = evaluateGlucose(activeReading, activeContext);

  // Calculate fasting vs post-prandial averages
  const fastingLogs = logs.filter((l) => l.context === "fasting");
  const postPrandialLogs = logs.filter((l) => l.context === "post_prandial");

  const avgFasting = fastingLogs.length
    ? Math.round(
        fastingLogs.reduce((acc, curr) => acc + curr.value, 0) /
          fastingLogs.length
      )
    : 94;

  const avgPostPrandial = postPrandialLogs.length
    ? Math.round(
        postPrandialLogs.reduce((acc, curr) => acc + curr.value, 0) /
          postPrandialLogs.length
      )
    : 134;

  const handleOpenLogModal = (ctx: GlucoseMealContext) => {
    setSelectedContext(ctx);
    setInputValue(ctx === "fasting" ? "95" : "135");
    setInputNotes("");
    setModalVisible(true);
  };

  const handleAdjustValue = (delta: number) => {
    const curr = parseInt(inputValue, 10) || 95;
    const next = Math.max(40, Math.min(450, curr + delta));
    setInputValue(next.toString());
  };

  const handleSaveLog = () => {
    const val = parseInt(inputValue, 10);
    if (isNaN(val) || val < 30 || val > 500) {
      Alert.alert(
        "Invalid Glucose Value",
        "Please enter a valid blood sugar reading between 30 and 500 mg/dL."
      );
      return;
    }

    onAddLog({
      value: val,
      context: selectedContext,
      timestamp: new Date().toISOString(),
      notes:
        inputNotes.trim() ||
        (selectedContext === "fasting"
          ? "Morning fasting reading"
          : "2h post-meal reading"),
    });

    setModalVisible(false);
  };

  const formatLogTime = (isoStr: string) => {
    const d = new Date(isoStr);
    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    return `${dateStr}, ${timeStr}`;
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="water" size={17} color="#E11D48" />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.cardSuperTitle}>METABOLIC BIOMARKER</Text>
            <Text style={styles.cardTitle}>Blood Glucose (Sugar)</Text>
          </View>
        </View>
      </View>

      {/* Action Button on Next Line */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity
          style={styles.quickAddBtn}
          onPress={() => handleOpenLogModal(selectedContext)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.quickAddText}>Log Sugar</Text>
        </TouchableOpacity>
      </View>

      {/* QUICK CONTEXT PILLS */}
      <View style={styles.pillsContainer}>
        <TouchableOpacity
          style={[
            styles.contextPill,
            selectedContext === "fasting" && styles.contextPillActiveFasting,
          ]}
          onPress={() => setSelectedContext("fasting")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="sunny-outline"
            size={14}
            color={selectedContext === "fasting" ? "#FFFFFF" : "#475569"}
          />
          <View style={styles.contextPillTextContainer}>
            <Text
              style={[
                styles.contextPillText,
                selectedContext === "fasting" && styles.contextPillTextActive,
              ]}
            >
              Fasting
            </Text>
            <Text
              style={[
                styles.contextPillSubText,
                selectedContext === "fasting" && styles.contextPillSubTextActive,
              ]}
            >
              (70–99 mg/dL)
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.contextPill,
            selectedContext === "post_prandial" &&
              styles.contextPillActivePostPrandial,
          ]}
          onPress={() => setSelectedContext("post_prandial")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="restaurant-outline"
            size={14}
            color={selectedContext === "post_prandial" ? "#FFFFFF" : "#475569"}
          />
          <View style={styles.contextPillTextContainer}>
            <Text
              style={[
                styles.contextPillText,
                selectedContext === "post_prandial" && styles.contextPillTextActive,
              ]}
            >
              Post-Prandial
            </Text>
            <Text
              style={[
                styles.contextPillSubText,
                selectedContext === "post_prandial" && styles.contextPillSubTextActive,
              ]}
            >
              (2h after meal)
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* HERO VALUE & ZONE INDICATOR */}
      <View
        style={[
          styles.heroZoneCard,
          { backgroundColor: zoneDetails.bgTint, borderColor: zoneDetails.color + "40" },
        ]}
      >
        <View style={styles.heroMainRow}>
          <View>
            <Text style={styles.readingLabel}>
              Latest {activeContext === "fasting" ? "Fasting" : "Post-Meal"} Reading
            </Text>
            <View style={styles.readingValueRow}>
              <Text style={[styles.readingValue, { color: zoneDetails.color }]}>
                {activeReading}
              </Text>
              <Text style={styles.readingUnit}>mg/dL</Text>
            </View>
          </View>

          {/* COLOR-CODED BADGE: Green (In Range), Amber (Elevated), Red (High) */}
          <View
            style={[
              styles.zonePillBadge,
              { backgroundColor: zoneDetails.color },
            ]}
          >
            <Ionicons
              name={
                zoneDetails.zone === "normal"
                  ? "checkmark-circle"
                  : zoneDetails.zone === "elevated"
                  ? "alert-circle"
                  : "warning"
              }
              size={13}
              color="#FFFFFF"
            />
            <Text style={styles.zonePillText}>{zoneDetails.label}</Text>
          </View>
        </View>

        {/* 3-ZONE RANGE SPECTRUM BAR */}
        <View style={styles.spectrumBarContainer}>
          <View style={styles.spectrumLabelsRow}>
            <Text style={styles.spectrumLabelLeft}>Target Range</Text>
            <Text style={styles.spectrumLabelRight}>
              {zoneDetails.targetDescription}
            </Text>
          </View>

          <View style={styles.spectrumTrack}>
            <View style={[styles.spectrumSegment, styles.segmentGreen]} />
            <View style={[styles.spectrumSegment, styles.segmentAmber]} />
            <View style={[styles.spectrumSegment, styles.segmentRed]} />
          </View>

          <View style={styles.spectrumTicksRow}>
            <Text style={styles.spectrumTick}>70</Text>
            <Text style={styles.spectrumTick}>
              {activeContext === "fasting" ? "99" : "140"}
            </Text>
            <Text style={styles.spectrumTick}>
              {activeContext === "fasting" ? "125" : "199"}
            </Text>
            <Text style={styles.spectrumTick}>200+</Text>
          </View>
        </View>

        <Text style={styles.zoneAdviceText}>💡 {zoneDetails.advice}</Text>
      </View>

      {/* AVERAGES & QUICK STATS */}
      <View style={styles.statsDualRow}>
        <View style={styles.statBox}>
          <View style={styles.statBoxHeader}>
            <Ionicons name="sunny" size={13} color="#059669" />
            <Text style={styles.statBoxTitle}>Avg Fasting</Text>
          </View>
          <View style={styles.statValRow}>
            <Text style={[styles.statValNumber, { color: "#059669" }]}>
              {avgFasting}
            </Text>
            <Text style={styles.statValUnit}>mg/dL</Text>
          </View>
          <Text style={styles.statBoxSub}>Target: 70–99</Text>
        </View>

        <View style={styles.statBox}>
          <View style={styles.statBoxHeader}>
            <Ionicons name="restaurant" size={13} color="#2563EB" />
            <Text style={styles.statBoxTitle}>Avg Post-Meal</Text>
          </View>
          <View style={styles.statValRow}>
            <Text style={[styles.statValNumber, { color: "#2563EB" }]}>
              {avgPostPrandial}
            </Text>
            <Text style={styles.statValUnit}>mg/dL</Text>
          </View>
          <Text style={styles.statBoxSub}>Target: &lt;140</Text>
        </View>
      </View>

      {/* LOG HISTORY ACCORDION */}
      <TouchableOpacity
        style={styles.historyToggleRow}
        onPress={() => setHistoryExpanded(!historyExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.historyToggleLeft}>
          <Ionicons name="time-outline" size={15} color="#64748B" />
          <Text style={styles.historyToggleTitle}>
            Recent Glucose Readings ({logs.length})
          </Text>
        </View>
        <Ionicons
          name={historyExpanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#64748B"
        />
      </TouchableOpacity>

      {historyExpanded && (
        <View style={styles.historyList}>
          {logs.slice(0, 6).map((item) => {
            const ev = evaluateGlucose(item.value, item.context);
            return (
              <View key={item.id} style={styles.historyItemRow}>
                <View style={styles.historyItemLeft}>
                  <View
                    style={[
                      styles.historyContextTag,
                      item.context === "fasting"
                        ? styles.historyTagFasting
                        : styles.historyTagPostPrandial,
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyContextTagText,
                        {
                          color:
                            item.context === "fasting" ? "#D97706" : "#2563EB",
                        },
                      ]}
                    >
                      {item.context === "fasting" ? "Fasting" : "Post-Meal"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.historyTimestamp}>
                      {formatLogTime(item.timestamp)}
                    </Text>
                    {item.notes ? (
                      <Text style={styles.historyNotes} numberOfLines={1}>
                        {item.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.historyItemRight}>
                  <Text style={[styles.historyValue, { color: ev.color }]}>
                    {item.value}{" "}
                    <Text style={styles.historyValueUnit}>mg/dL</Text>
                  </Text>
                  <View
                    style={[styles.smallZoneBadge, { backgroundColor: ev.color }]}
                  >
                    <Text style={styles.smallZoneBadgeText}>{ev.label}</Text>
                  </View>
                  {onDeleteLog && (
                    <TouchableOpacity
                      onPress={() => onDeleteLog(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 6 }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* QUICK LOG MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="water" size={18} color="#E11D48" />
                <Text style={styles.modalTitle}>Log Blood Glucose</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Context Switcher in Modal */}
            <Text style={styles.modalFieldLabel}>Measurement Context</Text>
            <View style={styles.modalPillGroup}>
              <TouchableOpacity
                style={[
                  styles.modalContextPill,
                  selectedContext === "fasting" &&
                    styles.modalContextPillActive,
                ]}
                onPress={() => {
                  setSelectedContext("fasting");
                  setInputValue("95");
                }}
              >
                <Text
                  style={[
                    styles.modalContextPillText,
                    selectedContext === "fasting" &&
                      styles.modalContextPillTextActive,
                  ]}
                >
                  🌅 Fasting
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalContextPill,
                  selectedContext === "post_prandial" &&
                    styles.modalContextPillActive,
                ]}
                onPress={() => {
                  setSelectedContext("post_prandial");
                  setInputValue("135");
                }}
              >
                <Text
                  style={[
                    styles.modalContextPillText,
                    selectedContext === "post_prandial" &&
                      styles.modalContextPillTextActive,
                  ]}
                >
                  🍽️ Post-Meal (2h)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stepper & Number Input */}
            <Text style={styles.modalFieldLabel}>Reading (mg/dL)</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => handleAdjustValue(-5)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>-5</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => handleAdjustValue(-1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>-1</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.stepperInput}
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="numeric"
                maxLength={3}
              />

              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => handleAdjustValue(1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => handleAdjustValue(5)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>+5</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Preset Buttons */}
            <View style={styles.presetRow}>
              {[85, 95, 110, 135, 155, 180].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.presetChip}
                  onPress={() => setInputValue(preset.toString())}
                >
                  <Text style={styles.presetChipText}>{preset}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Live Preview Zone */}
            {(() => {
              const numVal = parseInt(inputValue, 10);
              if (!isNaN(numVal)) {
                const previewZone = evaluateGlucose(numVal, selectedContext);
                return (
                  <View
                    style={[
                      styles.livePreviewBadge,
                      {
                        backgroundColor: previewZone.bgTint,
                        borderColor: previewZone.color + "40",
                      },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={14}
                      color={previewZone.color}
                    />
                    <Text
                      style={[
                        styles.livePreviewText,
                        { color: previewZone.color },
                      ]}
                    >
                      {previewZone.label} — {previewZone.targetDescription}
                    </Text>
                  </View>
                );
              }
              return null;
            })()}

            {/* Notes */}
            <Text style={styles.modalFieldLabel}>Clinical Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={inputNotes}
              onChangeText={setInputNotes}
              placeholder="e.g. After oats & berries breakfast, feeling energetic"
              placeholderTextColor="#94A3B8"
            />

            {/* Actions */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveLog}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>Save Reading</Text>
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
    backgroundColor: "#FFE4E6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardSuperTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#E11D48",
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  quickAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E11D48",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pillsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  contextPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contextPillActiveFasting: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  contextPillActivePostPrandial: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  contextPillTextContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  contextPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  contextPillTextActive: {
    color: "#FFFFFF",
  },
  contextPillSubText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
    textAlign: "center",
  },
  contextPillSubTextActive: {
    color: "#CBD5E1",
  },
  heroZoneCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  heroMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  readingLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
  readingValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  readingValue: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  readingUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  zonePillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  zonePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  spectrumBarContainer: {
    marginVertical: 4,
  },
  spectrumLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  spectrumLabelLeft: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  spectrumLabelRight: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0F172A",
  },
  spectrumTrack: {
    height: 8,
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  spectrumSegment: {
    height: 8,
  },
  segmentGreen: {
    flex: 3,
    backgroundColor: "#10B981",
  },
  segmentAmber: {
    flex: 2,
    backgroundColor: "#F59E0B",
  },
  segmentRed: {
    flex: 2,
    backgroundColor: "#EF4444",
  },
  spectrumTicksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  spectrumTick: {
    fontSize: 9,
    fontWeight: "600",
    color: "#94A3B8",
  },
  zoneAdviceText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#334155",
    marginTop: 8,
    fontWeight: "500",
  },
  statsDualRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  statBoxTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  statValRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statValNumber: {
    fontSize: 18,
    fontWeight: "800",
  },
  statValUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  statBoxSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  historyToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  historyToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyToggleTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  historyList: {
    marginTop: 6,
    gap: 8,
  },
  historyItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 8,
  },
  historyItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  historyContextTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyTagFasting: {
    backgroundColor: "#FEF3C7",
  },
  historyTagPostPrandial: {
    backgroundColor: "#DBEAFE",
  },
  historyContextTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  historyTimestamp: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E293B",
  },
  historyNotes: {
    fontSize: 10,
    color: "#64748B",
    maxWidth: 160,
  },
  historyItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  historyValueUnit: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  smallZoneBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smallZoneBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    marginTop: 8,
  },
  modalPillGroup: {
    flexDirection: "row",
    gap: 8,
  },
  modalContextPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalContextPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  modalContextPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  modalContextPillTextActive: {
    color: "#FFFFFF",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 4,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  stepperInput: {
    width: 80,
    height: 48,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
  },
  presetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 8,
  },
  presetChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  livePreviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 6,
  },
  livePreviewText: {
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  notesInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: "#0F172A",
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
    backgroundColor: "#E11D48",
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
