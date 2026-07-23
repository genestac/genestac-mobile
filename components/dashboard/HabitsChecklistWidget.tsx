import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface HabitsChecklistWidgetProps {
  habits: Record<string, boolean>;
  onToggleHabit: (key: string) => void;
  onOpenHistory?: () => void;
}

export const HabitsChecklistWidget: React.FC<HabitsChecklistWidgetProps> = ({
  habits,
  onToggleHabit,
  onOpenHistory,
}) => {
  const list = [
    { key: "water", label: "2.5L Water Intake", icon: "water-outline" },
    { key: "workout", label: "30 Mins Workout", icon: "barbell-outline" },
    { key: "sleep", label: "7.5 Hrs Sleep", icon: "moon-outline" },
    { key: "clean_eating", label: "No Sugar / Fasting", icon: "leaf-outline" },
  ];

  return (
    <View style={styles.trackerCardWidget}>
      <View style={styles.trackerWidgetHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="checkbox-outline" size={18} color="#2563EB" />
          <Text style={styles.cardHeaderTitle}>Daily Habit Checklist</Text>
        </View>

        {onOpenHistory && (
          <TouchableOpacity
            style={styles.historyPillBtn}
            onPress={onOpenHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={14} color="#D97706" />
            <Text style={styles.historyPillText}>History</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.habitsCheckList}>
        {list.map((item) => {
          const checked = !!habits[item.key];
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.habitCheckRow}
              onPress={() => onToggleHabit(item.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={checked ? "checkbox" : "square-outline"}
                size={20}
                color={checked ? "#2563EB" : "#94A3B8"}
              />
              <Text
                style={[
                  styles.habitCheckText,
                  checked && styles.habitCheckTextDone,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  historyPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  historyPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  habitsCheckList: {
    gap: 6,
    marginTop: 2,
  },
  habitCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  habitCheckText: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "500",
  },
  habitCheckTextDone: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
});

export default HabitsChecklistWidget;
