// components/skinLaser/PostLaserHealingCard.tsx
// Post-Laser Healing & Recovery Tracker: 7-Day Timeline & Clinical Do's & Don'ts Checklist

import React, { useState, useEffect, useMemo } from "react";
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
  LayoutAnimation,
  UIManager,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  LaserSession,
  ChecklistItem,
  HealingDayInfo,
  LaserTreatmentType,
  LaserProtocolMeta,
  getHealingTimelineForLaser,
  getLaserProtocolMeta,
} from "@/lib/skinLaser";

interface PostLaserHealingCardProps {
  session: LaserSession;
  checklists: ChecklistItem[];
  onUpdateSession: (updated: Partial<LaserSession>) => void;
  onToggleChecklist: (id: string) => void;
  onResetSession: (
    laserType: LaserTreatmentType,
    sessionDate?: string,
    notes?: string,
  ) => void;
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
    session.currentDay || 1,
  );
  const [checklistTab, setChecklistTab] = useState<"do" | "dont">("do");
  const [showNewSessionModal, setShowNewSessionModal] =
    useState<boolean>(false);
  const [selectedLaserType, setSelectedLaserType] =
    useState<LaserTreatmentType>(
      session.laserType || "CO2 Fractional Resurfacing",
    );
  const [isProtocolDropdownOpen, setIsProtocolDropdownOpen] =
    useState<boolean>(false);

  // Dynamic protocol timelines & metadata
  const timelineDays = getHealingTimelineForLaser(session.laserType);
  const protocolMeta = getLaserProtocolMeta(session.laserType);
  const selectedProtocolMeta = getLaserProtocolMeta(selectedLaserType);

  // Protocols to display: Show 2 by default, or all when dropdown is open.
  // When collapsed, always ensure the currently selected protocol is visible in the top 2.
  const displayedProtocols = useMemo(() => {
    if (isProtocolDropdownOpen) {
      return AVAILABLE_LASER_TYPES;
    }
    const isSelectedInTopTwo =
      AVAILABLE_LASER_TYPES.indexOf(selectedLaserType) < 2;
    if (isSelectedInTopTwo) {
      return AVAILABLE_LASER_TYPES.slice(0, 2);
    }
    return [
      selectedLaserType,
      AVAILABLE_LASER_TYPES[0],
    ];
  }, [isProtocolDropdownOpen, selectedLaserType]);

  const [treatmentNotes, setTreatmentNotes] = useState<string>(
    session.notes || protocolMeta.defaultNote,
  );

  // Find info for selected day from current session's timeline
  const currentDayInfo: HealingDayInfo =
    timelineDays.find((d) => d.day === selectedDayNumber) || timelineDays[0];

  const filteredChecklists = checklists.filter((c) => c.type === checklistTab);
  const doCount = checklists.filter(
    (c) => c.type === "do" && c.completed,
  ).length;
  const doTotal = checklists.filter((c) => c.type === "do").length;
  const dontCount = checklists.filter(
    (c) => c.type === "dont" && c.completed,
  ).length;
  const dontTotal = checklists.filter((c) => c.type === "dont").length;

  // Sync state whenever session prop changes
  useEffect(() => {
    if (session.laserType) {
      setSelectedLaserType(session.laserType);
    }
    if (session.currentDay) {
      setSelectedDayNumber(session.currentDay);
    }
    if (session.notes) {
      setTreatmentNotes(session.notes);
    }
  }, [session.laserType, session.currentDay, session.notes]);

  const handleOpenNewSessionModal = () => {
    setSelectedLaserType(session.laserType || "CO2 Fractional Resurfacing");
    const currentMeta = getLaserProtocolMeta(session.laserType);
    setTreatmentNotes(session.notes || currentMeta.defaultNote);
    setIsProtocolDropdownOpen(false);
    setShowNewSessionModal(true);
  };

  const handleStartSession = () => {
    const newNotes = treatmentNotes.trim() || selectedProtocolMeta.defaultNote;
    // Single atomic call to switch protocol, reset timeline to day 1, and load tailored checklist
    onResetSession(selectedLaserType, new Date().toISOString(), newNotes);
    setSelectedDayNumber(1);
    setIsProtocolDropdownOpen(false);
    setShowNewSessionModal(false);
    const newTimeline = getHealingTimelineForLaser(selectedLaserType);
    Alert.alert(
      "Laser Protocol Initiated",
      `Active protocol started for ${selectedLaserType}. Day 1 (${newTimeline[0]?.shortLabel || "Care"}) protocol is now active.`,
    );
  };

  return (
    <View style={styles.cardContainer}>
      {/* ── CARD HEADER ── */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: protocolMeta.bgTint },
            ]}
          >
            <Ionicons
              name="sparkles"
              size={17}
              color={protocolMeta.themeColor}
            />
          </View>
          <View style={styles.titleWrap}>
            <Text
              style={[
                styles.cardSuperTitle,
                { color: protocolMeta.themeColor },
              ]}
              numberOfLines={1}
            >
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
          onPress={handleOpenNewSessionModal}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={13} color="#E11D48" />
          <Text style={styles.newSessionBtnText}>New Session</Text>
        </TouchableOpacity>
      </View>

      {/* ── ACTIVE SESSION BANNER ── */}
      <View style={styles.sessionBanner}>
        <View style={styles.sessionBannerLeft}>
          <View
            style={[
              styles.pulseDot,
              { backgroundColor: protocolMeta.themeColor },
            ]}
          />
          <View>
            <Text style={styles.sessionTypeLabel}>{session.laserType}</Text>
            
          </View>
        </View>
        <View
          style={[
            styles.dayBadge,
            { backgroundColor: protocolMeta.themeColor },
          ]}
        >
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
        {timelineDays.map((dayItem) => {
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
                  color={dayItem.themeColor}
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
                {dayItem.shortLabel ||
                  dayItem.stageName.split(":")[1]?.trim() ||
                  `Day ${dayItem.day}`}
              </Text>

              {isCurrent && <View style={styles.activePillDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── SELECTED DAY CLINICAL DETAIL CARD ── */}
      <View
        style={[
          styles.stageDetailCard,
          {
            backgroundColor: currentDayInfo.bgTint,
            borderColor: currentDayInfo.themeColor + "35",
          },
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
              <Text style={styles.stageNumberText}>
                DAY {currentDayInfo.day}
              </Text>
            </View>
            <Text
              style={[
                styles.stageHeading,
                { color: currentDayInfo.themeColor },
              ]}
            >
              {currentDayInfo.headline}
            </Text>
          </View>
        </View>

        {/* Expected Symptoms */}
        <Text style={styles.bulletCategoryTitle}>
          Expected Skin Sensations:
        </Text>
        {currentDayInfo.expectedSymptoms.map((symptom, idx) => (
          <View key={`sym-${idx}`} style={styles.bulletRow}>
            <Ionicons
              name="alert-circle-outline"
              size={14}
              color={currentDayInfo.themeColor}
            />
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
                    <Text style={styles.categoryBadgeText}>
                      {item.category}
                    </Text>
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
            onPress={() => {
              setShowNewSessionModal(false);
              setIsProtocolDropdownOpen(false);
            }}
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
                <View>
                  <Text style={styles.modalTitle}>Select Laser Protocol</Text>
                  <Text style={styles.modalSubHeader}>
                    Currently Active:{" "}
                    <Text
                      style={{
                        fontWeight: "800",
                        color: protocolMeta.themeColor,
                      }}
                    >
                      {session.laserType}
                    </Text>
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowNewSessionModal(false);
                  setIsProtocolDropdownOpen(false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.protocolSectionHeader}>
                <Text style={styles.modalFieldLabel}>
                  Select Clinical Treatment Protocol
                </Text>
                <Text style={styles.protocolCountTag}>
                  {isProtocolDropdownOpen
                    ? `All (${AVAILABLE_LASER_TYPES.length})`
                    : `Showing 2 of ${AVAILABLE_LASER_TYPES.length}`}
                </Text>
              </View>

              {displayedProtocols.map((type) => {
                const isSelected = selectedLaserType === type;
                const meta = getLaserProtocolMeta(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeSelectorRow,
                      isSelected && {
                        backgroundColor: meta.bgTint,
                        borderColor: meta.themeColor,
                      },
                    ]}
                    onPress={() => {
                      setSelectedLaserType(type);
                      setTreatmentNotes(meta.defaultNote);
                      if (isProtocolDropdownOpen) {
                        try {
                          LayoutAnimation.configureNext(
                            LayoutAnimation.Presets.easeInEaseOut,
                          );
                        } catch (e) {}
                        setIsProtocolDropdownOpen(false);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={isSelected ? meta.themeColor : "#94A3B8"}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={[
                            styles.typeSelectorText,
                            isSelected && {
                              color: meta.themeColor,
                              fontWeight: "800",
                            },
                          ]}
                        >
                          {type}
                        </Text>
                        <View
                          style={[
                            styles.modalDowntimeTag,
                            {
                              backgroundColor: isSelected
                                ? meta.themeColor + "18"
                                : "#F1F5F9",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalDowntimeText,
                              {
                                color: isSelected ? meta.themeColor : "#64748B",
                              },
                            ]}
                          >
                            {meta.downtime.split(" ")[0]}{" "}
                            {meta.downtime.split(" ")[1]}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={styles.typeSelectorSubtitle}
                        numberOfLines={1}
                      >
                        {meta.indication}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* DROPDOWN EXPAND/COLLAPSE TOGGLE */}
              <TouchableOpacity
                style={[
                  styles.dropdownToggleBtn,
                  isProtocolDropdownOpen && styles.dropdownToggleBtnOpen,
                ]}
                onPress={() => {
                  try {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut,
                    );
                  } catch (e) {}
                  setIsProtocolDropdownOpen((prev) => !prev);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dropdownToggleText,
                    isProtocolDropdownOpen && { color: "#64748B" },
                  ]}
                >
                  {isProtocolDropdownOpen
                    ? "Show less protocols"
                    : `Click to see more (${AVAILABLE_LASER_TYPES.length - 2} more protocols)`}
                </Text>
                <Ionicons
                  name={isProtocolDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={isProtocolDropdownOpen ? "#64748B" : "#0284C7"}
                />
              </TouchableOpacity>

              {/* Protocol Highlights Preview Card */}
              {selectedProtocolMeta && (
                <View
                  style={[
                    styles.protocolPreviewCard,
                    {
                      backgroundColor: selectedProtocolMeta.bgTint,
                      borderColor: selectedProtocolMeta.themeColor + "35",
                    },
                  ]}
                >
                  <View style={styles.protocolPreviewHeader}>
                    <Ionicons
                      name="shield-checkmark"
                      size={14}
                      color={selectedProtocolMeta.themeColor}
                    />
                    <Text
                      style={[
                        styles.protocolPreviewTitle,
                        { color: selectedProtocolMeta.themeColor },
                      ]}
                    >
                      {selectedProtocolMeta.type} Protocol
                    </Text>
                  </View>
                  <Text style={styles.protocolPreviewFocus}>
                    <Text style={{ fontWeight: "700" }}>Core Care Focus: </Text>
                    {selectedProtocolMeta.primaryFocus}
                  </Text>
                  <Text style={styles.protocolPreviewDowntime}>
                    <Text style={{ fontWeight: "700" }}>
                      Expected Downtime:{" "}
                    </Text>
                    {selectedProtocolMeta.downtime}
                  </Text>
                </View>
              )}

              <Text style={[styles.modalFieldLabel, { marginTop: 14 }]}>
                Clinical Treatment Notes
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Protocol session notes and specific target areas"
                placeholderTextColor="#94A3B8"
                value={treatmentNotes}
                onChangeText={setTreatmentNotes}
                multiline
                numberOfLines={2}
              />
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowNewSessionModal(false);
                  setIsProtocolDropdownOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  { backgroundColor: selectedProtocolMeta.themeColor },
                ]}
                onPress={handleStartSession}
                activeOpacity={0.8}
              >
                <Ionicons name="flash" size={15} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>
                  Activate
                </Text>
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
  protocolBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  protocolBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  modalDowntimeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalDowntimeText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  typeSelectorSubtitle: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 2,
  },
  protocolPreviewCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 8,
  },
  protocolPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  protocolPreviewTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  protocolPreviewFocus: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16,
    marginTop: 2,
  },
  protocolPreviewDowntime: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16,
    marginTop: 2,
  },
  switchLinkText: {
    fontSize: 9.5,
    fontWeight: "700",
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
  modalSubHeader: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  protocolSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  protocolCountTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dropdownToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 10,
  },
  dropdownToggleBtnOpen: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  dropdownToggleText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0284C7",
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
