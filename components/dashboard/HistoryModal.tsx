import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WaterLog, SleepLog, MeasurementLog, HabitLog } from "@/lib/types";

export type HistoryType = "water" | "sleep" | "measurements" | "habits";

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  type: HistoryType | null;
  waterLogs?: WaterLog[];
  sleepLogs?: SleepLog[];
  measurementLogs?: MeasurementLog[];
  habitLogs?: HabitLog[];
}

const formatFullDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      const monthName = d.toLocaleDateString("en-US", { month: "long" });
      return `${monthName} ${day}, ${year}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const monthName = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${monthName} ${day}, ${year}`;
};

export const HistoryModal: React.FC<HistoryModalProps> = ({
  visible,
  onClose,
  type,
  waterLogs = [],
  sleepLogs = [],
  measurementLogs = [],
  habitLogs = [],
}) => {
  if (!visible || !type) return null;

  const getTitleAndColor = () => {
    switch (type) {
      case "water":
        return {
          title: "Hydration History",
          icon: "water-outline",
          color: "#2563EB",
          bgColor: "#EFF6FF",
        };
      case "sleep":
        return {
          title: "Sleep History",
          icon: "moon-outline",
          color: "#6366F1",
          bgColor: "#EEF2FF",
        };
      case "measurements":
        return {
          title: "Body Measurements History",
          icon: "body-outline",
          color: "#059669",
          bgColor: "#ECFDF5",
        };
      case "habits":
        return {
          title: "Daily Habits History",
          icon: "checkbox-outline",
          color: "#D97706",
          bgColor: "#FEF3C7",
        };
      default:
        return {
          title: "History Logs",
          icon: "time-outline",
          color: "#475569",
          bgColor: "#F8FAFC",
        };
    }
  };

  const config = getTitleAndColor();

  const renderContent = () => {
    switch (type) {
      case "water": {
        if (!waterLogs || waterLogs.length === 0) {
          return <Text style={styles.emptyText}>No hydration logs recorded yet.</Text>;
        }
        return waterLogs.map((item, idx) => (
          <View key={idx} style={styles.historyRowCard}>
            <View style={styles.rowLeftInfo}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <Text style={styles.dateText}>{formatFullDate(item.date)}</Text>
            </View>
            <View style={styles.valueBadgeBlue}>
              <Text style={styles.valueBadgeBlueText}>{item.amount} L</Text>
            </View>
          </View>
        ));
      }
      case "sleep": {
        if (!sleepLogs || sleepLogs.length === 0) {
          return <Text style={styles.emptyText}>No sleep logs recorded yet.</Text>;
        }
        return sleepLogs.map((item, idx) => (
          <View key={idx} style={styles.historyRowCard}>
            <View style={styles.rowLeftInfo}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <Text style={styles.dateText}>{formatFullDate(item.date)}</Text>
            </View>
            <View style={styles.valueBadgeIndigo}>
              <Text style={styles.valueBadgeIndigoText}>{item.hours} hrs</Text>
            </View>
          </View>
        ));
      }
      case "measurements": {
        if (!measurementLogs || measurementLogs.length === 0) {
          return <Text style={styles.emptyText}>No measurement logs recorded yet.</Text>;
        }
        return measurementLogs.map((item, idx) => (
          <View key={idx} style={styles.historyRowCardMulti}>
            <View style={styles.rowLeftInfo}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <Text style={styles.dateText}>{formatFullDate(item.date)}</Text>
            </View>
            <View style={styles.measureValuesFlex}>
              {item.waist ? <Text style={styles.measureItemText}>Waist: {item.waist}"</Text> : null}
              {item.hips ? <Text style={styles.measureItemText}>Hips: {item.hips}"</Text> : null}
              {item.chest ? <Text style={styles.measureItemText}>Chest: {item.chest}"</Text> : null}
            </View>
          </View>
        ));
      }
      case "habits": {
        if (!habitLogs || habitLogs.length === 0) {
          return <Text style={styles.emptyText}>No habit logs recorded yet.</Text>;
        }
        return habitLogs.map((item, idx) => {
          const completedCount = Object.values(item.habits || {}).filter(Boolean).length;
          return (
            <View key={idx} style={styles.historyRowCardMulti}>
              <View style={styles.rowLeftInfo}>
                <Ionicons name="calendar-outline" size={16} color="#64748B" />
                <Text style={styles.dateText}>{formatFullDate(item.date)}</Text>
                <View style={styles.habitScoreBadge}>
                  <Text style={styles.habitScoreText}>{completedCount} Completed</Text>
                </View>
              </View>
              <View style={{ gap: 4, marginTop: 6 }}>
                {Object.entries(item.habits || {}).map(([key, done]) => (
                  <View key={key} style={styles.habitDetailLine}>
                    <Ionicons
                      name={done ? "checkmark-circle" : "close-circle-outline"}
                      size={14}
                      color={done ? "#10B981" : "#94A3B8"}
                    />
                    <Text
                      style={[
                        styles.habitDetailText,
                        !done && { color: "#94A3B8" },
                      ]}
                    >
                      {key}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        });
      }
      default:
        return null;
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentCard}>
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: config.bgColor },
                ]}
              >
                <Ionicons
                  name={config.icon as any}
                  size={20}
                  color={config.color}
                />
              </View>
              <Text style={styles.modalTitleText}>{config.title}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeIconButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* List Scroll */}
          <ScrollView
            style={{ maxHeight: 360, marginVertical: 12 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {renderContent()}
          </ScrollView>

          {/* Bottom Button */}
          <TouchableOpacity
            style={styles.closeBottomBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBottomBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContentCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  closeIconButton: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginVertical: 24,
  },
  historyRowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  historyRowCardMulti: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  rowLeftInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  valueBadgeBlue: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  valueBadgeBlueText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  valueBadgeIndigo: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  valueBadgeIndigoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6366F1",
  },
  measureValuesFlex: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  measureItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  habitScoreBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: "auto",
  },
  habitScoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  habitDetailLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  habitDetailText: {
    fontSize: 12,
    color: "#1E293B",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  closeBottomBtn: {
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  closeBottomBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default HistoryModal;
