// components/hairTreatment/DailyRegrowthProtocolCard.tsx
// Daily Regrowth Protocol Tracker: Check-ins for Topical Serums, Scalp Massage, LLLT Laser Cap (with 10-min Timer) & Oral Meds

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DailyProtocolItem,
  DailyProtocolKey,
} from "@/lib/hairTreatment";

interface DailyRegrowthProtocolCardProps {
  items: DailyProtocolItem[];
  streak: number;
  onToggleItem: (id: string) => void;
  onResetAllToday?: () => void;
}

export function DailyRegrowthProtocolCard({
  items,
  streak,
  onToggleItem,
  onResetAllToday,
}: DailyRegrowthProtocolCardProps) {
  // 10-Minute Laser Cap Timer State (600 seconds)
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(600);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [activeExpandedId, setActiveExpandedId] = useState<string | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const completedCount = items.filter((i) => i.completed).length;
  const progressPercent = Math.round((completedCount / (items.length || 1)) * 100);

  // Timer Effect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsTimerRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  const handleTimerComplete = () => {
    Vibration.vibrate([0, 400, 200, 400]);
    Alert.alert(
      "🎉 LLLT Session Complete!",
      "Great job! Your 10-minute Red Light Photobiomodulation session is finished. Cellular ATP has been stimulated in hair follicles."
    );
    // Find laser cap item and check it off if not already checked
    const laserItem = items.find((i) => i.key === "laser_cap");
    if (laserItem && !laserItem.completed) {
      onToggleItem(laserItem.id);
    }
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSecondsLeft(600);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  const getItemColor = (key: DailyProtocolKey) => {
    switch (key) {
      case "topical_serum":
        return "#0284C7"; // Sky / Blue
      case "scalp_massage":
        return "#8B5CF6"; // Purple
      case "laser_cap":
        return "#EF4444"; // Laser Red
      case "oral_medication":
        return "#10B981"; // Emerald
      default:
        return "#EC4899";
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="checkbox-outline" size={18} color="#EC4899" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Daily Regrowth Protocol</Text>
            <Text style={styles.cardSubtitle}>
              Multi-modality follicular stimulation regimen
            </Text>
          </View>
        </View>

        {/* Streak Badge */}
        <View style={styles.streakBadge}>
          <Text style={styles.streakFire}>🔥</Text>
          <Text style={styles.streakText}>{streak}d Streak</Text>
        </View>
      </View>

      {/* Daily Compliance Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            Today's Adherence:{" "}
            <Text style={styles.progressCount}>
              {completedCount}/{items.length} Completed
            </Text>
          </Text>
          <Text style={styles.progressPercentText}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
              progressPercent === 100 && { backgroundColor: "#10B981" },
            ]}
          />
        </View>
      </View>

      {/* Protocol Checklist Items */}
      <View style={styles.itemsList}>
        {items.map((item) => {
          const color = getItemColor(item.key);
          const isExpanded = activeExpandedId === item.id;
          const isLaserCap = item.key === "laser_cap";

          return (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                item.completed && styles.itemCardCompleted,
              ]}
            >
              <View style={styles.itemMainRow}>
                {/* Checkbox Button */}
                <TouchableOpacity
                  style={[
                    styles.checkboxBtn,
                    item.completed && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => onToggleItem(item.id)}
                  activeOpacity={0.8}
                >
                  {item.completed && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                {/* Item Text & Badge */}
                <TouchableOpacity
                  style={styles.itemTextContainer}
                  onPress={() =>
                    setActiveExpandedId(isExpanded ? null : item.id)
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.itemTitleRow}>
                    <Text
                      style={[
                        styles.itemTitle,
                        item.completed && styles.itemTitleCompleted,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <View
                      style={[
                        styles.itemBadge,
                        { backgroundColor: `${color}15`, borderColor: `${color}40` },
                      ]}
                    >
                      <Text style={[styles.itemBadgeText, { color }]}>
                        {item.badge}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.itemSubtitle}>{item.subtitle}</Text>

                  {item.completed && item.time && (
                    <Text style={styles.itemCheckedTime}>
                      Checked in at {item.time}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Info / Expand Button */}
                <TouchableOpacity
                  style={styles.expandChevron}
                  onPress={() =>
                    setActiveExpandedId(isExpanded ? null : item.id)
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>

              {/* Special Embedded 10-Minute LLLT Laser Cap Timer Widget */}
              {isLaserCap && (
                <View style={styles.laserTimerBox}>
                  <View style={styles.laserTimerHeader}>
                    <View style={styles.laserRedDotRow}>
                      <View
                        style={[
                          styles.pulsingRedDot,
                          isTimerRunning && styles.pulsingRedDotActive,
                        ]}
                      />
                      <Text style={styles.laserTimerTitle}>
                        LLLT Photobiomodulation Session
                      </Text>
                    </View>
                    <Text style={styles.laserDiodesText}>650nm Red Diodes</Text>
                  </View>

                  <View style={styles.timerDisplayRow}>
                    <Text style={styles.timerDigits}>
                      {formatTime(timerSecondsLeft)}
                    </Text>

                    <View style={styles.timerControlsRow}>
                      <TouchableOpacity
                        style={[
                          styles.timerActionBtn,
                          isTimerRunning
                            ? styles.timerPauseBtn
                            : styles.timerStartBtn,
                        ]}
                        onPress={toggleTimer}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isTimerRunning ? "pause" : "play"}
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.timerActionBtnText}>
                          {isTimerRunning ? "Pause" : "Start 10 Min"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.timerResetBtn}
                        onPress={resetTimer}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="refresh" size={16} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Expanded Clinical Instructions */}
              {isExpanded && (
                <View style={styles.expandedDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="flask-outline" size={14} color="#64748B" />
                    <Text style={styles.detailLabel}>Dosage / Frequency:</Text>
                    <Text style={styles.detailValue}>{item.dosage}</Text>
                  </View>
                  <View style={styles.instructionsBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color="#EC4899"
                    />
                    <Text style={styles.instructionsText}>
                      {item.instructions}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Bottom Adherence Note */}
      <View style={styles.adherenceFooter}>
        <Ionicons name="bulb-outline" size={14} color="#EC4899" />
        <Text style={styles.adherenceFooterText}>
          Consistency is clinical key: DHT inhibition and vascular blood flow
          require daily sustained application to transition hair into the anagen
          growth phase.
        </Text>
      </View>
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
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  streakFire: {
    fontSize: 13,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EA580C",
  },
  progressContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
  },
  progressCount: {
    fontWeight: "800",
    color: "#0F172A",
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EC4899",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#EC4899",
    borderRadius: 4,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  itemCardCompleted: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FBCFE8",
  },
  itemMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#FFFFFF",
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
    marginRight: 6,
  },
  itemTitleCompleted: {
    color: "#64748B",
  },
  itemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  itemBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  itemSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  itemCheckedTime: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 3,
  },
  expandChevron: {
    padding: 4,
    marginLeft: 6,
  },
  laserTimerBox: {
    marginTop: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECDD3",
    padding: 10,
  },
  laserTimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  laserRedDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulsingRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  pulsingRedDotActive: {
    backgroundColor: "#DC2626",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  laserTimerTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#991B1B",
  },
  laserDiodesText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  timerDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timerDigits: {
    fontSize: 22,
    fontWeight: "900",
    color: "#991B1B",
    fontVariant: ["tabular-nums"],
  },
  timerControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  timerStartBtn: {
    backgroundColor: "#EF4444",
  },
  timerPauseBtn: {
    backgroundColor: "#D97706",
  },
  timerActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  timerResetBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  expandedDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  detailValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  instructionsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FDF2F8",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  instructionsText: {
    flex: 1,
    fontSize: 10.5,
    color: "#831843",
    lineHeight: 15,
  },
  adherenceFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: "#FDF2F8",
    padding: 10,
    borderRadius: 12,
  },
  adherenceFooterText: {
    flex: 1,
    fontSize: 10.5,
    color: "#9D174D",
    lineHeight: 15,
  },
});

