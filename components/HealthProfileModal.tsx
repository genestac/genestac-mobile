import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HealthProfile } from "@/lib/types";
import { Colors, Fonts, Spacing, Radius } from "@/constants/colors";

interface HealthProfileModalProps {
  visible: boolean;
  onClose?: () => void;
  onSubmit: (profile: HealthProfile) => Promise<void>;
  loading?: boolean;
}

const GOALS = [
  "Weight Loss",
  "Muscle Gain",
  "Maintain Weight",
  "Diabetes & Metabolic Health",
] as const;

const ACTIVITY_LEVELS = [
  "Sedentary",
  "Lightly Active",
  "Moderately Active",
  "Very Active",
] as const;

const DIET_PREFS = [
  "Vegetarian",
  "Non-Vegetarian",
  "Vegan",
  "Eggetarian",
] as const;

export const HealthProfileModal: React.FC<HealthProfileModalProps> = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [age, setAge] = useState("28");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [heightCm, setHeightCm] = useState("170");
  const [weightKg, setWeightKg] = useState("72");
  const [targetWeightKg, setTargetWeightKg] = useState("65");
  const [primaryGoal, setPrimaryGoal] = useState<
    "Weight Loss" | "Muscle Gain" | "Maintain Weight" | "Diabetes & Metabolic Health"
  >("Weight Loss");
  const [activityLevel, setActivityLevel] = useState<
    "Sedentary" | "Lightly Active" | "Moderately Active" | "Very Active"
  >("Moderately Active");
  const [dietaryPreference, setDietaryPreference] = useState<
    "Vegetarian" | "Non-Vegetarian" | "Vegan" | "Eggetarian"
  >("Vegetarian");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [allergies, setAllergies] = useState("");

  const handleSubmit = async () => {
    if (!age || !heightCm || !weightKg) {
      Alert.alert("Missing Details", "Please enter your age, height, and current weight.");
      return;
    }

    const profile: HealthProfile = {
      age: parseInt(age, 10) || 30,
      gender,
      heightCm: parseFloat(heightCm) || 170,
      weightKg: parseFloat(weightKg) || 70,
      targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) : undefined,
      primaryGoal,
      activityLevel,
      dietaryPreference,
      medicalConditions: medicalConditions.trim() || "None",
      allergies: allergies.trim() || "None",
    };

    await onSubmit(profile);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.iconCircle}>
                <Ionicons name="medical-outline" size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Health Profile Intake</Text>
                <Text style={styles.headerSub}>Required for AI Diet & Workout Plan</Text>
              </View>
            </View>
            {onClose && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={{ maxHeight: 480, marginVertical: 12 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 14 }}
          >
            {/* Age, Gender */}
            <View style={styles.rowTwoCols}>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Age (years)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g. 28"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderChipGroup}>
                  {(["Male", "Female"] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.chipBtn,
                        gender === g && styles.chipBtnActive,
                      ]}
                      onPress={() => setGender(g)}
                    >
                      <Text
                        style={[
                          styles.chipBtnText,
                          gender === g && styles.chipBtnTextActive,
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Height & Weights */}
            <View style={styles.rowThreeCols}>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="170"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="72"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Target (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={targetWeightKg}
                  onChangeText={setTargetWeightKg}
                  placeholder="65"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Primary Goal */}
            <View>
              <Text style={styles.inputLabel}>Primary Goal</Text>
              <View style={styles.chipGrid}>
                {GOALS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.goalChip,
                      primaryGoal === g && styles.goalChipActive,
                    ]}
                    onPress={() => setPrimaryGoal(g)}
                  >
                    <Text
                      style={[
                        styles.goalChipText,
                        primaryGoal === g && styles.goalChipTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dietary Preference */}
            <View>
              <Text style={styles.inputLabel}>Dietary Preference</Text>
              <View style={styles.chipGrid}>
                {DIET_PREFS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.goalChip,
                      dietaryPreference === d && styles.goalChipActive,
                    ]}
                    onPress={() => setDietaryPreference(d)}
                  >
                    <Text
                      style={[
                        styles.goalChipText,
                        dietaryPreference === d && styles.goalChipTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Activity Level */}
            <View>
              <Text style={styles.inputLabel}>Activity Level</Text>
              <View style={styles.chipGrid}>
                {ACTIVITY_LEVELS.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[
                      styles.goalChip,
                      activityLevel === a && styles.goalChipActive,
                    ]}
                    onPress={() => setActivityLevel(a)}
                  >
                    <Text
                      style={[
                        styles.goalChipText,
                        activityLevel === a && styles.goalChipTextActive,
                      ]}
                    >
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Medical Conditions / Allergies */}
            <View>
              <Text style={styles.inputLabel}>Medical Conditions & Allergies (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={medicalConditions}
                onChangeText={setMedicalConditions}
                placeholder="e.g. Thyroid, Type 2 Diabetes, Lactose Intolerant, None"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Generate My AI Custom Plan</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContentCard: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  headerSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  rowTwoCols: {
    flexDirection: "row",
    gap: 12,
  },
  rowThreeCols: {
    flexDirection: "row",
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  genderChipGroup: {
    flexDirection: "row",
    gap: 6,
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  chipBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  chipBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  chipBtnTextActive: {
    color: "#FFFFFF",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  goalChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  goalChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  goalChipTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default HealthProfileModal;
