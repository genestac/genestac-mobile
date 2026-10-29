// components/skinLaser/AmPmSkincareRoutineCard.tsx
// AM / PM Skincare Routine Checklist with Step-by-Step Chain & Streak Count

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SkincareRoutineData, SkincareStep } from "@/lib/skinLaser";

interface AmPmSkincareRoutineCardProps {
  routine: SkincareRoutineData;
  onToggleStep: (stepId: string, category: "AM" | "PM") => void;
  onAddStep: (step: Omit<SkincareStep, "id" | "stepNumber" | "completed">) => void;
  onResetRoutine: (category: "AM" | "PM") => void;
}

export const AmPmSkincareRoutineCard: React.FC<AmPmSkincareRoutineCardProps> = ({
  routine,
  onToggleStep,
  onAddStep,
  onResetRoutine,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<"AM" | "PM">("AM");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newStepName, setNewStepName] = useState<string>("");
  const [newStepActive, setNewStepActive] = useState<string>("");
  const [newStepPurpose, setNewStepPurpose] = useState<string>("");

  const steps = selectedCategory === "AM" ? routine.amSteps : routine.pmSteps;
  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isAllCompleted = totalCount > 0 && completedCount === totalCount;

  const handleAddNewStep = () => {
    if (!newStepName.trim()) {
      Alert.alert("Input Required", "Please enter a routine step name.");
      return;
    }
    onAddStep({
      name: newStepName.trim(),
      category: selectedCategory,
      activeIngredient: newStepActive.trim() || "Active Skincare Ingredients",
      purpose: newStepPurpose.trim() || "Daily skin health and barrier protection",
    });
    setNewStepName("");
    setNewStepActive("");
    setNewStepPurpose("");
    setShowAddModal(false);
  };

  return (
    <View style={styles.cardContainer}>
      {/* ── CARD HEADER ── */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={17} color="#0D9488" />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.cardSuperTitle} numberOfLines={1}>
              DAILY DERMATOLOGY REGIMEN
            </Text>
            <Text style={styles.cardTitle} numberOfLines={1}>
              AM / PM Skincare Checklist
            </Text>
          </View>
        </View>
      </View>

      {/* ── STREAK BADGE ROW (BELOW HEADER) ── */}
      <View style={styles.streakBadgeRow}>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={14} color="#EA580C" />
          <Text style={styles.streakText}>{routine.streakDays}d Routine Streak</Text>
        </View>
      </View>

      {/* ── AM / PM TOGGLE BAR ── */}
      <View style={styles.toggleBarContainer}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            selectedCategory === "AM" && styles.toggleBtnActiveAm,
          ]}
          onPress={() => setSelectedCategory("AM")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="sunny"
            size={14}
            color={selectedCategory === "AM" ? "#FFFFFF" : "#F59E0B"}
          />
          <Text
            style={[
              styles.toggleBtnText,
              selectedCategory === "AM" && styles.toggleBtnTextActive,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Morning Routine
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            selectedCategory === "PM" && styles.toggleBtnActivePm,
          ]}
          onPress={() => setSelectedCategory("PM")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="moon"
            size={14}
            color={selectedCategory === "PM" ? "#FFFFFF" : "#6366F1"}
          />
          <Text
            style={[
              styles.toggleBtnText,
              selectedCategory === "PM" && styles.toggleBtnTextActive,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Evening Routine
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── COMPLIANCE PROGRESS BAR ── */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressLabel}>
            {selectedCategory === "AM" ? "Morning" : "Evening"} Compliance:{" "}
            <Text style={{ fontWeight: "800", color: "#0F172A" }}>
              {completedCount} of {totalCount} completed
            </Text>
          </Text>
          <Text
            style={[
              styles.progressPercentText,
              isAllCompleted ? { color: "#059669" } : { color: "#0D9488" },
            ]}
          >
            {Math.round(progressPercent)}%
          </Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isAllCompleted ? "#059669" : "#0D9488",
              },
            ]}
          />
        </View>
      </View>

      {/* ── ALL DONE CELEBRATION BANNER ── */}
      {isAllCompleted && (
        <View style={styles.allDoneBanner}>
          <Ionicons name="checkmark-done-circle" size={18} color="#059669" />
          <Text style={styles.allDoneText}>
            All {selectedCategory} routine steps completed! Skin barrier fully protected.
          </Text>
        </View>
      )}

      {/* ── STEP-BY-STEP CHECKLIST ── */}
      <View style={styles.stepsList}>
        {steps.map((step, index) => {
          const isDone = step.completed;
          const isLast = index === steps.length - 1;

          return (
            <View key={step.id} style={styles.stepItemWrapper}>
              {/* Vertical connector line */}
              {!isLast && <View style={styles.connectorLine} />}

              <TouchableOpacity
                style={[
                  styles.stepCard,
                  isDone && styles.stepCardCompleted,
                ]}
                onPress={() => onToggleStep(step.id, selectedCategory)}
                activeOpacity={0.75}
              >
                {/* Step Number Circle */}
                <View
                  style={[
                    styles.stepNumberCircle,
                    isDone
                      ? styles.stepNumberCircleDone
                      : selectedCategory === "AM"
                      ? styles.stepNumberCircleAm
                      : styles.stepNumberCirclePm,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumberText,
                        selectedCategory === "AM"
                          ? { color: "#D97706" }
                          : { color: "#4F46E5" },
                      ]}
                    >
                      {step.stepNumber}
                    </Text>
                  )}
                </View>

                {/* Step Details */}
                <View style={styles.stepTextContent}>
                  <View style={styles.stepTitleRow}>
                    <Text
                      style={[
                        styles.stepName,
                        isDone && styles.stepNameDone,
                      ]}
                    >
                      {step.name}
                    </Text>
                    {step.name.toLowerCase().includes("spf") && (
                      <View style={styles.spfChip}>
                        <Text style={styles.spfChipText}>CRITICAL</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.activeIngredientRow}>
                    <Ionicons name="flask-outline" size={12} color="#0D9488" />
                    <Text style={styles.activeIngredientText}>
                      {step.activeIngredient}
                    </Text>
                  </View>

                  <Text style={styles.purposeText}>{step.purpose}</Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* ── BOTTOM ACTIONS: ADD STEP & RESET ── */}
      <View style={styles.cardActionsRow}>
        <TouchableOpacity
          style={styles.addStepBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={15} color="#0D9488" />
          <Text style={styles.addStepBtnText}>Add Custom Step</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetRoutineBtn}
          onPress={() => {
            Alert.alert(
              "Reset Routine",
              `Reset all ${selectedCategory} routine steps for today?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset",
                  style: "destructive",
                  onPress: () => onResetRoutine(selectedCategory),
                },
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={13} color="#94A3B8" />
          <Text style={styles.resetRoutineBtnText}>Reset Today</Text>
        </TouchableOpacity>
      </View>

      {/* ── ADD STEP MODAL ── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          />
          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(insets.bottom + 16, 28) },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="add-circle" size={18} color="#0D9488" />
                <Text style={styles.modalTitle}>
                  Add Step to {selectedCategory} Routine
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalFieldLabel}>Step Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Copper Peptide Eye Cream"
              placeholderTextColor="#94A3B8"
              value={newStepName}
              onChangeText={setNewStepName}
            />

            <Text style={styles.modalFieldLabel}>Active Ingredients</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. GHK-Cu, Matrixyl 3000, Caffeine"
              placeholderTextColor="#94A3B8"
              value={newStepActive}
              onChangeText={setNewStepActive}
            />

            <Text style={styles.modalFieldLabel}>Purpose / Clinical Action</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Stimulate microvascular repair and eye collagen"
              placeholderTextColor="#94A3B8"
              value={newStepPurpose}
              onChangeText={setNewStepPurpose}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleAddNewStep}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmBtnText}>Add to Routine</Text>
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
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
  },
  cardSuperTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D9488",
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  streakBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  streakText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C",
  },
  toggleBarContainer: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 10,
    marginBottom: 12,
    marginHorizontal: -4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  toggleBtnActiveAm: {
    backgroundColor: "#D97706",
  },
  toggleBtnActivePm: {
    backgroundColor: "#4F46E5",
  },
  toggleBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  toggleBtnTextActive: {
    color: "#FFFFFF",
  },
  progressContainer: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: "#475569",
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: "800",
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  allDoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 12,
  },
  allDoneText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#059669",
    flex: 1,
    lineHeight: 16,
  },
  stepsList: {
    marginBottom: 6,
  },
  stepItemWrapper: {
    position: "relative",
    marginBottom: 10,
  },
  connectorLine: {
    position: "absolute",
    top: 26,
    left: 20,
    width: 2,
    height: 38,
    backgroundColor: "#E2E8F0",
    zIndex: 1,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F8FAFC",
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    zIndex: 2,
  },
  stepCardCompleted: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginTop: 2,
  },
  stepNumberCircleAm: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  stepNumberCirclePm: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  stepNumberCircleDone: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: "800",
  },
  stepTextContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  stepName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  stepNameDone: {
    color: "#64748B",
    textDecorationLine: "line-through",
  },
  spfChip: {
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  spfChipText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#E11D48",
  },
  activeIngredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  activeIngredientText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0D9488",
  },
  purposeText: {
    fontSize: 11,
    fontWeight: "400",
    color: "#64748B",
    lineHeight: 15,
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  addStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  addStepBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0D9488",
  },
  resetRoutineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  resetRoutineBtnText: {
    fontSize: 11,
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
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 12,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D9488",
    paddingVertical: 12,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
