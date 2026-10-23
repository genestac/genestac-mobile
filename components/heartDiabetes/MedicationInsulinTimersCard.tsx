// components/heartDiabetes/MedicationInsulinTimersCard.tsx
// Medication & Insulin Timers with Smart Push Reminders & Single-Tap "Taken" Button

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
  MedicationReminder,
  scheduleMedicationNotification,
  cancelMedicationNotification,
} from "@/lib/heartDiabetes";

interface MedicationInsulinTimersCardProps {
  medications: MedicationReminder[];
  onToggleTaken: (id: string) => void;
  onAddMedication: (
    med: Omit<MedicationReminder, "id" | "takenToday" | "streakDays">
  ) => void;
  onToggleReminder: (id: string, enabled: boolean) => void;
  onDeleteMedication?: (id: string) => void;
}

export const MedicationInsulinTimersCard: React.FC<
  MedicationInsulinTimersCardProps
> = ({
  medications,
  onToggleTaken,
  onAddMedication,
  onToggleReminder,
  onDeleteMedication,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [dosageInput, setDosageInput] = useState("");
  const [instructionsInput, setInstructionsInput] = useState("");
  const [timeInput, setTimeInput] = useState("08:00 AM");
  const [typeInput, setTypeInput] = useState<"oral" | "insulin" | "statin">(
    "oral"
  );
  const [reminderEnabled, setReminderEnabled] = useState(true);

  // Calculate upcoming dose
  const totalCount = medications.length;
  const takenCount = medications.filter((m) => m.takenToday).length;
  const pendingMeds = medications.filter((m) => !m.takenToday);
  const nextMed = pendingMeds[0];

  const handleOpenAddModal = (presetType?: "oral" | "insulin" | "statin") => {
    if (presetType === "insulin") {
      setNameInput("Basal Insulin (Glargine)");
      setDosageInput("14 Units");
      setInstructionsInput("Inject subcutaneously at bedtime");
      setTimeInput("10:00 PM");
      setTypeInput("insulin");
    } else if (presetType === "statin") {
      setNameInput("Atorvastatin (Lipitor)");
      setDosageInput("20 mg");
      setInstructionsInput("Take at bedtime with water");
      setTimeInput("09:30 PM");
      setTypeInput("statin");
    } else {
      setNameInput("Metformin HCl");
      setDosageInput("500 mg");
      setInstructionsInput("Take with meal to avoid GI distress");
      setTimeInput("08:00 AM");
      setTypeInput("oral");
    }
    setReminderEnabled(true);
    setModalVisible(true);
  };

  const handleSaveMed = async () => {
    if (!nameInput.trim() || !dosageInput.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter medication name and dosage."
      );
      return;
    }

    // Parse hour / minute from timeInput (e.g. "08:00 AM" or "20:00")
    let hour = 8;
    let min = 0;
    const parts = timeInput.trim().split(":");
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10) || 8;
      const minPart = parts[1].split(" ")[0];
      min = parseInt(minPart, 10) || 0;
      if (
        timeInput.toLowerCase().includes("pm") &&
        h < 12
      ) {
        h += 12;
      } else if (
        timeInput.toLowerCase().includes("am") &&
        h === 12
      ) {
        h = 0;
      }
      hour = h;
    }

    onAddMedication({
      name: nameInput.trim(),
      dosage: dosageInput.trim(),
      instructions: instructionsInput.trim() || "Take as prescribed",
      time: timeInput.trim(),
      hour24: hour,
      minute: min,
      type: typeInput,
      reminderEnabled,
    });

    setModalVisible(false);
  };

  const handleToggleReminderSwitch = async (
    med: MedicationReminder,
    nextVal: boolean
  ) => {
    if (nextVal) {
      await scheduleMedicationNotification(med);
      Alert.alert(
        "Reminder Scheduled",
        `Daily push reminder activated for ${med.name} at ${med.time}.`
      );
    } else {
      await cancelMedicationNotification(med.id);
    }
    onToggleReminder(med.id, nextVal);
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="alarm" size={17} color="#059669" />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.cardSuperTitle}>PRESCRIPTION ADHERENCE</Text>
            <Text style={styles.cardTitle}>Medication & Insulin Timers</Text>
          </View>
        </View>
      </View>

      {/* Action Button on Next Line */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => handleOpenAddModal("oral")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Dose</Text>
        </TouchableOpacity>
      </View>

      {/* COMPLIANCE HERO STRIP / EMPTY STATE */}
      {totalCount > 0 ? (
        <View style={styles.heroStrip}>
          <View style={styles.heroStripLeft}>
            <Text style={styles.complianceTitle}>Today's Adherence</Text>
            <Text style={styles.complianceCount}>
              {takenCount} of {totalCount} Doses Taken
            </Text>
            {nextMed ? (
              <View style={styles.nextDoseChip}>
                <Ionicons name="time" size={11} color="#D97706" />
                <Text style={styles.nextDoseText}>
                  Next: {nextMed.name} ({nextMed.time})
                </Text>
              </View>
            ) : (
              <View style={[styles.nextDoseChip, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="checkmark-circle" size={11} color="#059669" />
                <Text style={[styles.nextDoseText, { color: "#059669" }]}>
                  All doses completed for today!
                </Text>
              </View>
            )}
          </View>

          <View style={styles.heroStripRight}>
            <View style={styles.adherenceCircle}>
              <Text style={styles.adherencePercent}>
                {Math.round((takenCount / totalCount) * 100)}%
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="medkit-outline" size={20} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>No medications added yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Add Dose" above or choose a quick preset below to track daily doses and smart reminders.
            </Text>
          </View>
        </View>
      )}

      {/* QUICK PRESET ADD CHIPS */}
      <View style={styles.quickAddRow}>
        <Text style={styles.quickAddLabel}>Quick Add:</Text>
        <TouchableOpacity
          style={styles.presetChip}
          onPress={() => handleOpenAddModal("oral")}
        >
          <Text style={styles.presetChipText}>+ Metformin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.presetChip}
          onPress={() => handleOpenAddModal("statin")}
        >
          <Text style={styles.presetChipText}>+ Statin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.presetChip}
          onPress={() => handleOpenAddModal("insulin")}
        >
          <Text style={styles.presetChipText}>+ Insulin</Text>
        </TouchableOpacity>
      </View>

      {/* MEDICATIONS LIST */}
      <View style={styles.medsList}>
        {medications.map((item) => {
          const isInsulin = item.type === "insulin";
          const isStatin = item.type === "statin";

          return (
            <View
              key={item.id}
              style={[
                styles.medCard,
                item.takenToday && styles.medCardTaken,
              ]}
            >
              <View style={styles.medCardTop}>
                <View style={styles.medInfoLeft}>
                  <View
                    style={[
                      styles.medTypeIconCircle,
                      isInsulin
                        ? styles.iconInsulin
                        : isStatin
                        ? styles.iconStatin
                        : styles.iconOral,
                    ]}
                  >
                    <Ionicons
                      name={
                        isInsulin
                          ? "fitness"
                          : isStatin
                          ? "heart"
                          : "medkit"
                      }
                      size={16}
                      color={
                        isInsulin
                          ? "#7C3AED"
                          : isStatin
                          ? "#E11D48"
                          : "#059669"
                      }
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.medTitleRow}>
                      <Text style={styles.medName}>{item.name}</Text>
                      <View style={styles.dosePill}>
                        <Text style={styles.dosePillText}>{item.dosage}</Text>
                      </View>
                    </View>
                    <Text style={styles.medInstructions} numberOfLines={1}>
                      {item.instructions}
                    </Text>
                    <View style={styles.medMetaRow}>
                      <View style={styles.medTimeTag}>
                        <Ionicons name="time-outline" size={11} color="#64748B" />
                        <Text style={styles.medTimeText}>{item.time}</Text>
                      </View>
                      <View style={styles.streakBadge}>
                        <Ionicons name="flame" size={11} color="#EA580C" />
                        <Text style={styles.streakText}>
                          {item.streakDays}d streak
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* ACTION BAR: PUSH REMINDER TOGGLE & SINGLE-TAP "TAKEN" BUTTON */}
              <View style={styles.medCardActions}>
                <View style={styles.reminderToggleWrap}>
                  <Ionicons
                    name={
                      item.reminderEnabled
                        ? "notifications"
                        : "notifications-off-outline"
                    }
                    size={14}
                    color={item.reminderEnabled ? "#059669" : "#94A3B8"}
                  />
                  <Text style={styles.reminderToggleLabel}>Reminder</Text>
                  <Switch
                    value={item.reminderEnabled}
                    onValueChange={(val) => handleToggleReminderSwitch(item, val)}
                    trackColor={{ false: "#E2E8F0", true: "#A7F3D0" }}
                    thumbColor={item.reminderEnabled ? "#059669" : "#94A3B8"}
                    style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                  />
                </View>

                {/* SINGLE-TAP "TAKEN" BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.takenBtn,
                    item.takenToday && styles.takenBtnActive,
                  ]}
                  onPress={() => onToggleTaken(item.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      item.takenToday
                        ? "checkmark-circle"
                        : "checkmark-circle-outline"
                    }
                    size={16}
                    color={item.takenToday ? "#059669" : "#475569"}
                  />
                  <Text
                    style={[
                      styles.takenBtnText,
                      item.takenToday && styles.takenBtnTextActive,
                    ]}
                  >
                    {item.takenToday ? "Taken Today" : "Tap: Mark Taken"}
                  </Text>
                </TouchableOpacity>

                {onDeleteMedication && (
                  <TouchableOpacity
                    onPress={() => onDeleteMedication(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ paddingLeft: 4 }}
                  >
                    <Ionicons name="trash-outline" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* ADD MEDICATION MODAL */}
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
                <Ionicons name="alarm" size={18} color="#059669" />
                <Text style={styles.modalTitle}>Add Medication / Dose</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <Text style={styles.fieldLabel}>Medication Type</Text>
            <View style={styles.typeSelectorRow}>
              {[
                { id: "oral", label: "💊 Oral Tablet" },
                { id: "insulin", label: "💉 Insulin" },
                { id: "statin", label: "🫀 Statin / Lipid" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeChip,
                    typeInput === t.id && styles.typeChipActive,
                  ]}
                  onPress={() => setTypeInput(t.id as any)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      typeInput === t.id && styles.typeChipTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name */}
            <Text style={styles.fieldLabel}>Drug Name</Text>
            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="e.g. Metformin, Atorvastatin, Lantus"
              placeholderTextColor="#94A3B8"
            />

            {/* Dosage */}
            <Text style={styles.fieldLabel}>Dosage & Units</Text>
            <TextInput
              style={styles.modalInput}
              value={dosageInput}
              onChangeText={setDosageInput}
              placeholder="e.g. 500 mg or 14 Units"
              placeholderTextColor="#94A3B8"
            />

            {/* Time */}
            <Text style={styles.fieldLabel}>Scheduled Daily Time</Text>
            <TextInput
              style={styles.modalInput}
              value={timeInput}
              onChangeText={setTimeInput}
              placeholder="e.g. 08:00 AM or 09:30 PM"
              placeholderTextColor="#94A3B8"
            />

            {/* Instructions */}
            <Text style={styles.fieldLabel}>Clinical Instructions</Text>
            <TextInput
              style={styles.modalInput}
              value={instructionsInput}
              onChangeText={setInstructionsInput}
              placeholder="e.g. With breakfast to prevent upset stomach"
              placeholderTextColor="#94A3B8"
            />

            {/* Push reminder toggle */}
            <View style={styles.reminderToggleRow}>
              <View>
                <Text style={styles.reminderToggleTitle}>
                  Smart Push Reminder
                </Text>
                <Text style={styles.reminderToggleSub}>
                  Send daily device notification at scheduled time
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: "#CBD5E1", true: "#059669" }}
              />
            </View>

            {/* Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveMed}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>Save Dose</Text>
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
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardSuperTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  emptyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
  heroStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  heroStripLeft: {
    flex: 1,
  },
  complianceTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  complianceCount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 2,
  },
  nextDoseChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  nextDoseText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
  },
  heroStripRight: {
    marginLeft: 10,
  },
  adherenceCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ECFDF5",
    borderWidth: 2,
    borderColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  adherencePercent: {
    fontSize: 13,
    fontWeight: "900",
    color: "#059669",
  },
  quickAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  quickAddLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  presetChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  medsList: {
    gap: 10,
  },
  medCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  medCardTaken: {
    backgroundColor: "#F8FAF8",
    borderColor: "#A7F3D0",
  },
  medCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  medInfoLeft: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
  },
  medTypeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOral: {
    backgroundColor: "#ECFDF5",
  },
  iconInsulin: {
    backgroundColor: "#F3E8FF",
  },
  iconStatin: {
    backgroundColor: "#FFE4E6",
  },
  medTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  medName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  dosePill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dosePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  medInstructions: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  medMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  medTimeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  medTimeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  streakText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#EA580C",
  },
  medCardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  reminderToggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reminderToggleLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  takenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  takenBtnActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  takenBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  takenBtnTextActive: {
    color: "#059669",
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 5,
    marginTop: 6,
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  typeChip: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  typeChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 4,
  },
  reminderToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  reminderToggleTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  reminderToggleSub: {
    fontSize: 10,
    color: "#64748B",
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
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
    backgroundColor: "#059669",
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
