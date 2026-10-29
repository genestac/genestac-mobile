// components/skinLaser/PostLaserHealingCard.tsx
// Post-Laser Healing & Recovery Tracker: 7-Day Timeline & Clinical Do's & Don'ts Checklist

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  LaserSession,
  ChecklistItem,
  HEALING_TIMELINE_DAYS,
  HealingDayInfo,
  LaserTreatmentType,
} from "@/lib/skinLaser";

interface PostLaserHealingCardProps {
  session: LaserSession;
  checklists: ChecklistItem[];
  onUpdateSession: (updated: Partial<LaserSession>) => void;
  onToggleChecklist: (id: string) => void;
  onResetSession: (laserType: LaserTreatmentType, sessionDate: string) => void;
}

const AVAILABLE_LASER_TYPES: LaserTreatmentType[] = [
  "CO2 Fractional Resurfacing",
  "Q-Switched Nd:YAG",
  "Pico Genesis Laser",
  "IPL Photofacial",
  "Microneedling RF",
  "Erbium Glass Laser",
];

export const PostLaserHealingCard: React.FC<PostLaserHealingCardProps> = ({
  session,
  checklists,
  onUpdateSession,
  onToggleChecklist,
  onResetSession,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(
    session.currentDay || 3
  );
  const [checklistTab, setChecklistTab] = useState<"do" | "dont">("do");
  const [showNewSessionModal, setShowNewSessionModal] = useState<boolean>(false);
  const [selectedLaserType, setSelectedLaserType] = useState<LaserTreatmentType>(
    session.laserType || "CO2 Fractional Resurfacing"
  );
  const [treatmentNotes, setTreatmentNotes] = useState<string>(session.notes || "");

  // Find info for selected day
  const currentDayInfo: HealingDayInfo =
    HEALING_TIMELINE_DAYS.find((d) => d.day === selectedDayNumber) ||
    HEALING_TIMELINE_DAYS[2];

  const filteredChecklists = checklists.filter((c) => c.type === checklistTab);
  const doCount = checklists.filter((c) => c.type === "do" && c.completed).length;
  const doTotal = checklists.filter((c) => c.type === "do").length;
  const dontCount = checklists.filter((c) => c.type === "dont" && c.completed).length;
  const dontTotal = checklists.filter((c) => c.type === "dont").length;

  const handleStartSession = () => {
    onResetSession(selectedLaserType, new Date().toISOString());
    onUpdateSession({ notes: treatmentNotes, currentDay: 1 });
    setSelectedDayNumber(1);
    setShowNewSessionModal(false);
    Alert.alert(
      "Laser Session Initiated",
      `Active protocol started for ${selectedLaserType}. Day 1 cooling protocol is now active.`
    );
  };

  return (
    <View style={styles.cardContainer}>
      {/* ── CARD HEADER ── */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={17} color="#E11D48" />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.cardSuperTitle} numberOfLines={1}>
              AESTHETIC DERMATOLOGY
            </Text>
            <Text style={styles.cardTitle} numberOfLines={1}>
              Post-Laser Healing & Recovery
            </Text>
          </View>
        </View>
      </View>

      {/* ── ACTION BUTTON ROW (BELOW HEADER) ── */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity
          style={styles.newSessionBtn}
          onPress={() => setShowNewSessionModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={13} color="#E11D48" />
          <Text style={styles.newSessionBtnText}>New Session</Text>
        </TouchableOpacity>
      </View>

      {/* ── ACTIVE SESSION BANNER ── */}
      <View style={styles.sessionBanner}>
        <View style={styles.sessionBannerLeft}>
          <View style={styles.pulseDot} />
          <View>
            <Text style={styles.sessionTypeLabel}>{session.laserType}</Text>
            <Text style={styles.sessionSub}>
              Day {session.currentDay} of 7 Post-Treatment
            </Text>
          </View>
        </View>
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>DAY {session.currentDay}</Text>
        </View>
      </View>

      {/* ── 7-DAY HEALING TIMELINE STEPPER ── */}
      <Text style={styles.sectionMiniLabel}>7-DAY HEALING PROGRESSION</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineScroller}
      >
        {HEALING_TIMELINE_DAYS.map((dayItem) => {
          const isSelected = selectedDayNumber === dayItem.day;
          const isPast = dayItem.day < session.currentDay;
          const isCurrent = dayItem.day === session.currentDay;

          return (
            <TouchableOpacity
              key={`day-${dayItem.day}`}
              style={[
                styles.dayPill,
                isSelected && styles.dayPillSelected,
                isCurrent && !isSelected && styles.dayPillCurrent,
              ]}
              onPress={() => {
                setSelectedDayNumber(dayItem.day);
                onUpdateSession({ currentDay: dayItem.day });
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dayIconCircle,
                  { backgroundColor: isSelected ? "#FFFFFF" : dayItem.bgTint },
                ]}
              >
                <Ionicons
                  name={dayItem.icon as any}
                  size={14}
                  color={isSelected ? dayItem.themeColor : dayItem.themeColor}
                />
              </View>
              <Text
                style={[
                  styles.dayPillDayText,
                  isSelected && styles.dayPillTextSelected,
                ]}
              >
                Day {dayItem.day}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.dayPillStageText,
                  isSelected && styles.dayPillStageTextSelected,
                ]}
              >
                {dayItem.day === 1
                  ? "Redness"
                  : dayItem.day === 3
                  ? "Peeling"
                  : dayItem.day === 7
                  ? "Glowing"
                  : dayItem.stageName.split(":")[1]?.trim() || `Stage ${dayItem.day}`}
              </Text>

              {isCurrent && (
                <View style={styles.activePillDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── SELECTED DAY CLINICAL DETAIL CARD ── */}
      <View
        style={[
          styles.stageDetailCard,
          { backgroundColor: currentDayInfo.bgTint, borderColor: currentDayInfo.themeColor + "35" },
        ]}
      >
        <View style={styles.stageDetailHeader}>
          <View style={styles.stageTagWrap}>
            <View
              style={[
                styles.stageNumberPill,
                { backgroundColor: currentDayInfo.themeColor },
              ]}
            >
              <Text style={styles.stageNumberText}>DAY {currentDayInfo.day}</Text>
            </View>
            <Text style={[styles.stageHeading, { color: currentDayInfo.themeColor }]}>
              {currentDayInfo.headline}
            </Text>
          </View>
        </View>

        {/* Expected Symptoms */}
        <Text style={styles.bulletCategoryTitle}>Expected Skin Sensations:</Text>
        {currentDayInfo.expectedSymptoms.map((symptom, idx) => (
          <View key={`sym-${idx}`} style={styles.bulletRow}>
            <Ionicons name="alert-circle-outline" size={14} color={currentDayInfo.themeColor} />
            <Text style={styles.bulletText}>{symptom}</Text>
          </View>
        ))}

        {/* Care Instructions */}
        <Text style={[styles.bulletCategoryTitle, { marginTop: 10 }]}>
          Dermatology Care Protocol:
        </Text>
        {currentDayInfo.careInstructions.map((instruction, idx) => (
          <View key={`care-${idx}`} style={styles.bulletRow}>
            <Ionicons name="checkmark-done" size={14} color="#059669" />
            <Text style={styles.bulletText}>{instruction}</Text>
          </View>
        ))}

        {/* Comfort Stepper */}
        <View style={styles.comfortRow}>
          <View style={styles.comfortLabelWrap}>
            <Text
              style={styles.comfortLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Comfort Level:{" "}
              <Text style={{ fontWeight: "800", color: "#0F172A" }}>
                {session.comfortLevel}/10
              </Text>{" "}
              ({session.comfortLevel <= 3
                ? "Mild Heat"
                : session.comfortLevel <= 6
                ? "Moderate Tingling"
                : "High Sensitivity"})
            </Text>
          </View>
          <View style={styles.stepperWrap}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() =>
                onUpdateSession({ comfortLevel: Math.max(1, session.comfortLevel - 1) })
              }
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={14} color="#334155" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() =>
                onUpdateSession({ comfortLevel: Math.min(10, session.comfortLevel + 1) })
              }
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color="#334155" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── DO'S & DON'TS CLINICAL CHECKLIST ── */}
      <View style={styles.checklistSection}>
        <View style={styles.checklistHeader}>
          <Text style={styles.sectionMiniLabel}>COMPLIANCE CHECKLIST</Text>
          <Text style={styles.checklistTitle}>Laser Healing Guidance</Text>

          {/* Toggle Do's vs Don'ts on next line */}
          <View style={styles.checklistTabContainer}>
            <TouchableOpacity
              style={[
                styles.checklistTab,
                checklistTab === "do" && styles.checklistTabActiveDo,
              ]}
              onPress={() => setChecklistTab("do")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={checklistTab === "do" ? "#FFFFFF" : "#059669"}
              />
              <Text
                style={[
                  styles.checklistTabText,
                  checklistTab === "do" && styles.checklistTabTextActive,
                ]}
              >
                Do's ({doCount}/{doTotal})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.checklistTab,
                checklistTab === "dont" && styles.checklistTabActiveDont,
              ]}
              onPress={() => setChecklistTab("dont")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="close-circle"
                size={14}
                color={checklistTab === "dont" ? "#FFFFFF" : "#E11D48"}
              />
              <Text
                style={[
                  styles.checklistTabText,
                  checklistTab === "dont" && styles.checklistTabTextActive,
                ]}
              >
                Don'ts ({dontCount}/{dontTotal})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Checklist Items */}
        <View style={styles.checklistItemsList}>
          {filteredChecklists.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.checkItemCard,
                item.completed && styles.checkItemCardCompleted,
              ]}
              onPress={() => onToggleChecklist(item.id)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.checkboxCircle,
                  item.completed &&
                    (item.type === "do"
                      ? styles.checkboxCircleDone
                      : styles.checkboxCircleDontDone),
                ]}
              >
                {item.completed && (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                )}
              </View>

              <View style={styles.checkTextWrap}>
                <View style={styles.checkTopRow}>
                  <Text
                    style={[
                      styles.checkItemTitle,
                      item.completed && styles.checkItemTitleDone,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                </View>
                <Text style={styles.checkItemDesc}>{item.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── NEW SESSION MODAL ── */}
      <Modal
        visible={showNewSessionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewSessionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowNewSessionModal(false)}
          />
          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(insets.bottom + 16, 28) },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="sparkles" size={18} color="#E11D48" />
                <Text style={styles.modalTitle}>Start New Laser Session</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNewSessionModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 240 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.modalFieldLabel}>Select Laser Treatment Type</Text>
              {AVAILABLE_LASER_TYPES.map((type) => {
                const isSelected = selectedLaserType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeSelectorRow,
                      isSelected && styles.typeSelectorRowSelected,
                    ]}
                    onPress={() => setSelectedLaserType(type)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={16}
                      color={isSelected ? "#E11D48" : "#94A3B8"}
                    />
                    <Text
                      style={[
                        styles.typeSelectorText,
                        isSelected && styles.typeSelectorTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>
                Clinical Treatment Notes (Optional)
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Full face resurfacing for acne scars & fine lines"
                placeholderTextColor="#94A3B8"
                value={treatmentNotes}
                onChangeText={setTreatmentNotes}
              />
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowNewSessionModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleStartSession}
                activeOpacity={0.8}
              >
                <Ionicons name="flash" size={15} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Start Protocol</Text>
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
    marginBottom: 8,
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
    backgroundColor: "#FFE4E6",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
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
  actionButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  newSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  newSessionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E11D48",
  },
  sessionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  sessionBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  sessionTypeLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  sessionSub: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 1,
  },
  dayBadge: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  sectionMiniLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  timelineScroller: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 6,
    marginBottom: 10,
  },
  dayPill: {
    width: 72,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillSelected: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  dayPillCurrent: {
    borderColor: "#E11D48",
    borderWidth: 1.5,
  },
  dayIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  dayPillDayText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },
  dayPillTextSelected: {
    color: "#FFFFFF",
  },
  dayPillStageText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  dayPillStageTextSelected: {
    color: "#E2E8F0",
  },
  activePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E11D48",
    marginTop: 3,
  },
  stageDetailCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  stageDetailHeader: {
    marginBottom: 10,
  },
  stageTagWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageNumberPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  stageNumberText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  stageHeading: {
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  bulletCategoryTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#475569",
    flex: 1,
    lineHeight: 16,
  },
  comfortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    marginHorizontal: -8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  comfortLabelWrap: {
    flex: 1,
    marginRight: 8,
  },
  comfortLabel: {
    fontSize: 11.5,
    color: "#334155",
  },
  stepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  checklistSection: {
    marginTop: 4,
  },
  checklistHeader: {
    marginBottom: 10,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  checklistTabContainer: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  checklistTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  checklistTabActiveDo: {
    backgroundColor: "#059669",
  },
  checklistTabActiveDont: {
    backgroundColor: "#E11D48",
  },
  checklistTabText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  checklistTabTextActive: {
    color: "#FFFFFF",
  },
  checklistItemsList: {
    gap: 8,
  },
  checkItemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F8FAFC",
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  checkItemCardCompleted: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxCircleDone: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  checkboxCircleDontDone: {
    backgroundColor: "#E11D48",
    borderColor: "#E11D48",
  },
  checkTextWrap: {
    flex: 1,
  },
  checkTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  checkItemTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  checkItemTitleDone: {
    color: "#64748B",
  },
  categoryBadge: {
    backgroundColor: "#EEF2F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#475569",
  },
  checkItemDesc: {
    fontSize: 11,
    fontWeight: "400",
    color: "#64748B",
    lineHeight: 15,
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
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
  },
  typeSelectorRowSelected: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FDA4AF",
  },
  typeSelectorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  typeSelectorTextSelected: {
    color: "#E11D48",
    fontWeight: "800",
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#E11D48",
    paddingVertical: 12,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
