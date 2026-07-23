import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface BodyMeasurementsWidgetProps {
  waist: string;
  setWaist: (v: string) => void;
  hips: string;
  setHips: (v: string) => void;
  chest: string;
  setChest: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onOpenHistory?: () => void;
}

export const BodyMeasurementsWidget: React.FC<BodyMeasurementsWidgetProps> = ({
  waist,
  setWaist,
  hips,
  setHips,
  chest,
  setChest,
  saving,
  onSave,
  onOpenHistory,
}) => {
  return (
    <View style={styles.trackerCardWidget}>
      <View style={styles.trackerWidgetHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="body-outline" size={18} color="#059669" />
          <Text style={styles.cardHeaderTitle}>Body Measurements (in)</Text>
        </View>
      </View>

      <View style={styles.measureFieldsRow}>
        <View style={styles.measureCol}>
          <Text style={styles.measureFieldLabel}>Waist</Text>
          <TextInput
            style={styles.measureInput}
            value={waist}
            onChangeText={setWaist}
            placeholder="32"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.measureCol}>
          <Text style={styles.measureFieldLabel}>Hips</Text>
          <TextInput
            style={styles.measureInput}
            value={hips}
            onChangeText={setHips}
            placeholder="38"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.measureCol}>
          <Text style={styles.measureFieldLabel}>Chest</Text>
          <TextInput
            style={styles.measureInput}
            value={chest}
            onChangeText={setChest}
            placeholder="40"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.actionsRow}>
        {onOpenHistory && (
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={onOpenHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={15} color="#059669" />
            <Text style={styles.historyBtnText}>History</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.widgetGreenBtn}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={16} color="#FFFFFF" />
              <Text style={styles.widgetGreenBtnText}>Save Inches</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  trackerCardWidget: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  trackerWidgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  measureFieldsRow: {
    flexDirection: "row",
    gap: 8,
  },
  measureCol: {
    flex: 1,
    gap: 2,
  },
  measureFieldLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  measureInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  historyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
  },
  widgetGreenBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingVertical: 8,
    borderRadius: 8,
  },
  widgetGreenBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default BodyMeasurementsWidget;
