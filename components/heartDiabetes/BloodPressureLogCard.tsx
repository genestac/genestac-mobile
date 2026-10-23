// components/heartDiabetes/BloodPressureLogCard.tsx
// Blood Pressure (BP) & Pulse Log with Weekly Trend Line Chart

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import {
  BloodPressureLog,
  classifyBloodPressure,
} from "@/lib/heartDiabetes";

interface BloodPressureLogCardProps {
  logs: BloodPressureLog[];
  onAddLog: (
    log: Omit<BloodPressureLog, "id" | "meanArterialPressure" | "classification">
  ) => void;
  onDeleteLog?: (id: string) => void;
}

const screenWidth = Dimensions.get("window").width;

export const BloodPressureLogCard: React.FC<BloodPressureLogCardProps> = ({
  logs,
  onAddLog,
  onDeleteLog,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [systolicInput, setSystolicInput] = useState("120");
  const [diastolicInput, setDiastolicInput] = useState("80");
  const [pulseInput, setPulseInput] = useState("72");
  const [notesInput, setNotesInput] = useState("");
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const latest = logs[0] || {
    systolic: 120,
    diastolic: 80,
    pulse: 72,
    meanArterialPressure: 93.3,
    classification: "normal" as const,
  };

  const bpStatus = classifyBloodPressure(latest.systolic, latest.diastolic);

  // 7-day weekly Blood Pressure calculations & chart points (Monday through Sunday)
  const weeklyData = useMemo(() => {
    // Calculate Monday of the current week (baseline)
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
    const diffToMonday = (currentDay + 6) % 7; // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    // Build the 7 calendar days of the week starting from Monday (Mon = 0 ... Sun = 6)
    const weekDays = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + offset);
      return d;
    });

    // Helper to format date key YYYY-MM-DD
    const toDateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    // Index existing logs by date key
    const logsByDate = new Map<string, BloodPressureLog>();
    logs.forEach((log) => {
      const key = toDateKey(new Date(log.timestamp));
      if (!logsByDate.has(key)) {
        logsByDate.set(key, log);
      }
    });

    // Check if any log matches this week's dates
    const hasWeekLogs = weekDays.some((d) => logsByDate.has(toDateKey(d)));

    let chartPoints: Array<{
      systolic: number;
      diastolic: number;
      pulse: number;
      timestamp: string;
      dayLabel: string;
      dateLabel: string;
    }> = [];

    if (hasWeekLogs) {
      let fallbackSys = latest.systolic;
      let fallbackDia = latest.diastolic;
      let fallbackPulse = latest.pulse;

      chartPoints = weekDays.map((d) => {
        const key = toDateKey(d);
        const match = logsByDate.get(key);
        if (match) {
          fallbackSys = match.systolic;
          fallbackDia = match.diastolic;
          fallbackPulse = match.pulse;
          return {
            systolic: match.systolic,
            diastolic: match.diastolic,
            pulse: match.pulse,
            timestamp: match.timestamp,
            dayLabel: d.toLocaleDateString([], { weekday: "short" }), // Mon, Tue, Wed, Thu, Fri, Sat, Sun
            dateLabel: String(d.getDate()), // 19, 20, 21...
          };
        } else {
          return {
            systolic: fallbackSys,
            diastolic: fallbackDia,
            pulse: fallbackPulse,
            timestamp: d.toISOString(),
            dayLabel: d.toLocaleDateString([], { weekday: "short" }),
            dateLabel: String(d.getDate()),
          };
        }
      });
    } else {
      // Map available logs chronologically across the 7 days starting on Monday
      const sortedLogs = [...logs]
        .slice(0, 7)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      chartPoints = weekDays.map((d, idx) => {
        const item = sortedLogs[idx] || sortedLogs[sortedLogs.length - 1] || latest;
        return {
          systolic: item.systolic,
          diastolic: item.diastolic,
          pulse: item.pulse,
          timestamp: d.toISOString(),
          dayLabel: d.toLocaleDateString([], { weekday: "short" }), // Mon, Tue, Wed...
          dateLabel: String(d.getDate()), // 19, 20, 21...
        };
      });
    }

    const totalSys = chartPoints.reduce((sum, item) => sum + item.systolic, 0);
    const totalDia = chartPoints.reduce((sum, item) => sum + item.diastolic, 0);
    const avgSys = Math.round(totalSys / chartPoints.length);
    const avgDia = Math.round(totalDia / chartPoints.length);

    const startStr = weekDays[0].toLocaleDateString([], { month: "short", day: "numeric" });
    const endStr = weekDays[6].toLocaleDateString([], { month: "short", day: "numeric" });
    const weekRangeStr = `${startStr} – ${endStr}`;

    return {
      chartPoints,
      avgSys,
      avgDia,
      weekRangeStr,
    };
  }, [logs, latest]);

  // Chart layout geometry
  const chartWidth = Math.min(screenWidth - 64, 340);
  const chartHeight = 168;
  const paddingX = 26;
  const paddingY = 24;

  // Min / max scaling for BP (e.g. 50 to 170 mmHg)
  const bpMin = 50;
  const bpMax = 170;

  const points = useMemo(() => {
    const list = weeklyData.chartPoints;
    if (list.length === 0) return [];

    const stepX = (chartWidth - paddingX * 2) / Math.max(list.length - 1, 1);

    return list.map((item, idx) => {
      const x = paddingX + idx * stepX;

      const clampedSys = Math.max(bpMin, Math.min(bpMax, item.systolic));
      const ratioSys = (clampedSys - bpMin) / (bpMax - bpMin);
      const ySys = chartHeight - paddingY - ratioSys * (chartHeight - paddingY * 2);

      const clampedDia = Math.max(bpMin, Math.min(bpMax, item.diastolic));
      const ratioDia = (clampedDia - bpMin) / (bpMax - bpMin);
      const yDia = chartHeight - paddingY - ratioDia * (chartHeight - paddingY * 2);

      return {
        x,
        ySys,
        yDia,
        systolic: item.systolic,
        diastolic: item.diastolic,
        pulse: item.pulse,
        dayLabel: item.dayLabel,
        dateLabel: item.dateLabel,
      };
    });
  }, [weeklyData.chartPoints, chartWidth]);

  // Generate SVG path string for Systolic
  const sysLinePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.ySys}` : `${acc} L ${pt.x} ${pt.ySys}`;
    }, "");
  }, [points]);

  // Generate SVG path string for Diastolic
  const diaLinePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.yDia}` : `${acc} L ${pt.x} ${pt.yDia}`;
    }, "");
  }, [points]);

  // Area fill under Systolic
  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = chartHeight - paddingY;
    return `${sysLinePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [sysLinePath, points]);

  const handleSave = () => {
    const sys = parseInt(systolicInput, 10);
    const dia = parseInt(diastolicInput, 10);
    const pul = parseInt(pulseInput, 10);

    if (isNaN(sys) || sys < 70 || sys > 260) {
      Alert.alert("Invalid Systolic BP", "Enter systolic pressure between 70 and 260 mmHg.");
      return;
    }
    if (isNaN(dia) || dia < 40 || dia > 160) {
      Alert.alert("Invalid Diastolic BP", "Enter diastolic pressure between 40 and 160 mmHg.");
      return;
    }
    if (isNaN(pul) || pul < 35 || pul > 200) {
      Alert.alert("Invalid Pulse", "Enter pulse between 35 and 200 bpm.");
      return;
    }

    onAddLog({
      systolic: sys,
      diastolic: dia,
      pulse: pul,
      timestamp: new Date().toISOString(),
      notes: notesInput.trim() || "Resting seated measurement",
    });

    setModalVisible(false);
  };

  const formatLogDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="pulse" size={17} color="#0284C7" />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.cardSuperTitle}>HEMODYNAMICS & PRESSURE</Text>
            <Text style={styles.cardTitle}>Blood Pressure & Pulse</Text>
          </View>
        </View>
      </View>

      {/* Action Button on Next Line */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity
          style={styles.quickAddBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.quickAddText}>Log BP</Text>
        </TouchableOpacity>
      </View>

      {/* HERO BP DISPLAY */}
      <View
        style={[
          styles.heroZoneCard,
          { backgroundColor: bpStatus.bgTint, borderColor: bpStatus.color + "40" },
        ]}
      >
        <View style={styles.heroMainRow}>
          <View>
            <Text style={styles.readingLabel}>Latest Blood Pressure</Text>
            <View style={styles.bpNumbersRow}>
              <Text style={[styles.bpValueBig, { color: bpStatus.color }]}>
                {latest.systolic}/{latest.diastolic}
              </Text>
              <Text style={styles.bpUnit}>mmHg</Text>
            </View>
          </View>

          <View style={[styles.bpStatusBadge, { backgroundColor: bpStatus.color }]}>
            <Text style={styles.bpStatusBadgeText}>{bpStatus.label}</Text>
          </View>
        </View>

        {/* Resting Pulse Metric Chip */}
        <View style={styles.subMetricsRow}>
          <View style={styles.subMetricChip}>
            <Ionicons name="heart" size={13} color="#E11D48" />
            <Text style={styles.subMetricText}>
              Resting Pulse: <Text style={styles.subMetricVal}>{latest.pulse} bpm</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.bpAdviceText}>💡 {bpStatus.advice}</Text>
      </View>

      {/* WEEKLY TREND LINE CHART */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={styles.chartTitle}>7-Day Blood Pressure Trend</Text>
            <Text style={styles.chartSubtitle}>
              {weeklyData.weekRangeStr} • Avg: <Text style={styles.chartAvgVal}>{weeklyData.avgSys}/{weeklyData.avgDia} mmHg</Text>
            </Text>
          </View>
          <View style={styles.legendContainer}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "#0284C7" }]} />
              <Text style={styles.legendText}>Sys</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "#059669" }]} />
              <Text style={styles.legendText}>Dia</Text>
            </View>
          </View>
        </View>

        <View style={styles.svgContainer}>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="bpGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#0284C7" stopOpacity="0.20" />
                <Stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Target 120 mmHg Systolic reference line */}
            <Line
              x1={paddingX}
              y1={chartHeight - paddingY - ((120 - bpMin) / (bpMax - bpMin)) * (chartHeight - paddingY * 2)}
              x2={chartWidth - paddingX}
              y2={chartHeight - paddingY - ((120 - bpMin) / (bpMax - bpMin)) * (chartHeight - paddingY * 2)}
              stroke="#CBD5E1"
              strokeDasharray="4, 4"
              strokeWidth="1"
            />
            <SvgText
              x={chartWidth - paddingX + 2}
              y={chartHeight - paddingY - ((120 - bpMin) / (bpMax - bpMin)) * (chartHeight - paddingY * 2) + 3}
              fontSize="9"
              fill="#94A3B8"
              textAnchor="start"
            >
              120
            </SvgText>

            {/* Target 80 mmHg Diastolic reference line */}
            <Line
              x1={paddingX}
              y1={chartHeight - paddingY - ((80 - bpMin) / (bpMax - bpMin)) * (chartHeight - paddingY * 2)}
              x2={chartWidth - paddingX}
              y2={chartHeight - paddingY - ((80 - bpMin) / (bpMax - bpMin)) * (chartHeight - paddingY * 2)}
              stroke="#E2E8F0"
              strokeDasharray="4, 4"
              strokeWidth="1"
            />
            <SvgText
              x={chartWidth - paddingX + 2}
              y={chartHeight - paddingY - ((80 - bpMin) / (bpMax - bpMin)) * (chartHeight - paddingY * 2) + 3}
              fontSize="9"
              fill="#94A3B8"
              textAnchor="start"
            >
              80
            </SvgText>

            {/* Area fill under Systolic curve */}
            {areaPath ? <Path d={areaPath} fill="url(#bpGradient)" /> : null}

            {/* Systolic Line */}
            {sysLinePath ? (
              <Path
                d={sysLinePath}
                fill="none"
                stroke="#0284C7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Diastolic Line */}
            {diaLinePath ? (
              <Path
                d={diaLinePath}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Data point circles and labels */}
            {points.map((pt, idx) => (
              <React.Fragment key={idx}>
                {/* Systolic point */}
                <Circle cx={pt.x} cy={pt.ySys} r="3.5" fill="#0284C7" stroke="#FFFFFF" strokeWidth="1.5" />
                <SvgText
                  x={pt.x}
                  y={pt.ySys - 6}
                  fontSize="8"
                  fontWeight="700"
                  fill="#0284C7"
                  textAnchor="middle"
                >
                  {pt.systolic}
                </SvgText>

                {/* Diastolic point */}
                <Circle cx={pt.x} cy={pt.yDia} r="3.5" fill="#059669" stroke="#FFFFFF" strokeWidth="1.5" />
                <SvgText
                  x={pt.x}
                  y={pt.yDia + 12}
                  fontSize="8"
                  fontWeight="700"
                  fill="#059669"
                  textAnchor="middle"
                >
                  {pt.diastolic}
                </SvgText>

                {/* Day starting name (e.g. Mon, Tue) */}
                <SvgText
                  x={pt.x}
                  y={chartHeight - 16}
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#475569"
                  textAnchor="middle"
                >
                  {pt.dayLabel}
                </SvgText>

                {/* Date below day starting name (e.g. 19, 20) */}
                <SvgText
                  x={pt.x}
                  y={chartHeight - 4}
                  fontSize="8.5"
                  fontWeight="600"
                  fill="#94A3B8"
                  textAnchor="middle"
                >
                  {pt.dateLabel}
                </SvgText>
              </React.Fragment>
            ))}
          </Svg>
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
            Blood Pressure History ({logs.length})
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
            const cls = classifyBloodPressure(item.systolic, item.diastolic);
            return (
              <View key={item.id} style={styles.historyItemRow}>
                <View style={styles.historyItemLeft}>
                  <Text style={styles.historyTimestamp}>
                    {formatLogDate(item.timestamp)}
                  </Text>
                  <Text style={styles.historyPulse}>
                    Pulse: {item.pulse} bpm
                  </Text>
                </View>

                <View style={styles.historyItemRight}>
                  <Text style={[styles.historyValue, { color: cls.color }]}>
                    {item.systolic}/{item.diastolic}
                  </Text>
                  <View style={[styles.smallZoneBadge, { backgroundColor: cls.color }]}>
                    <Text style={styles.smallZoneBadgeText}>{cls.label}</Text>
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

      {/* LOG BP MODAL */}
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
                <Ionicons name="pulse" size={18} color="#0284C7" />
                <Text style={styles.modalTitle}>Record Blood Pressure</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Inputs: Systolic / Diastolic */}
            <View style={styles.dualInputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.modalFieldLabel}>Systolic (mmHg)</Text>
                <TextInput
                  style={styles.modalInputBox}
                  value={systolicInput}
                  onChangeText={setSystolicInput}
                  keyboardType="numeric"
                  maxLength={3}
                  placeholder="120"
                />
                <Text style={styles.inputSubLabel}>Upper number</Text>
              </View>

              <Text style={styles.inputSlash}>/</Text>

              <View style={styles.inputCol}>
                <Text style={styles.modalFieldLabel}>Diastolic (mmHg)</Text>
                <TextInput
                  style={styles.modalInputBox}
                  value={diastolicInput}
                  onChangeText={setDiastolicInput}
                  keyboardType="numeric"
                  maxLength={3}
                  placeholder="80"
                />
                <Text style={styles.inputSubLabel}>Lower number</Text>
              </View>
            </View>

            {/* Pulse */}
            <View style={{ marginTop: 10 }}>
              <Text style={styles.modalFieldLabel}>Resting Pulse (bpm)</Text>
              <TextInput
                style={[styles.modalInputBox, { width: 120 }]}
                value={pulseInput}
                onChangeText={setPulseInput}
                keyboardType="numeric"
                maxLength={3}
                placeholder="72"
              />
            </View>

            {/* Live classification preview */}
            {(() => {
              const sys = parseInt(systolicInput, 10);
              const dia = parseInt(diastolicInput, 10);
              if (!isNaN(sys) && !isNaN(dia)) {
                const previewCls = classifyBloodPressure(sys, dia);
                return (
                  <View
                    style={[
                      styles.livePreviewBadge,
                      {
                        backgroundColor: previewCls.bgTint,
                        borderColor: previewCls.color + "40",
                      },
                    ]}
                  >
                    <Ionicons name="shield-checkmark" size={14} color={previewCls.color} />
                    <Text style={[styles.livePreviewText, { color: previewCls.color }]}>
                      {previewCls.label} • {previewCls.description}
                    </Text>
                  </View>
                );
              }
              return null;
            })()}

            {/* Notes */}
            <Text style={styles.modalFieldLabel}>Measurement Circumstance</Text>
            <TextInput
              style={styles.notesInput}
              value={notesInput}
              onChangeText={setNotesInput}
              placeholder="e.g. Left arm, seated for 5 minutes, before coffee"
              placeholderTextColor="#94A3B8"
            />

            {/* Action buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
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
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardSuperTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0284C7",
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
    backgroundColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroZoneCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  heroMainRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 8,
  },
  readingLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
  bpNumbersRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  bpValueBig: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  bpUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  bpStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 35,
    marginLeft:-26
  },
  bpStatusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subMetricsRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
    flexWrap: "wrap",
  },
  subMetricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subMetricText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  subMetricVal: {
    color: "#0F172A",
    fontWeight: "800",
  },
  bpAdviceText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#334155",
    marginTop: 8,
    fontWeight: "500",
  },
  chartCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  chartSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  chartAvgVal: {
    fontWeight: "800",
    color: "#0284C7",
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0284C7",
  },
  legendText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  svgContainer: {
    alignItems: "center",
    justifyContent: "center",
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
    flex: 1,
  },
  historyTimestamp: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  historyPulse: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
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
  smallZoneBadge: {
    paddingHorizontal: 6,
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
  dualInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  inputCol: {
    flex: 1,
  },
  inputSlash: {
    fontSize: 28,
    fontWeight: "300",
    color: "#94A3B8",
    marginTop: 18,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  inputSubLabel: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 3,
    textAlign: "center",
  },
  modalInputBox: {
    height: 48,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  livePreviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 10,
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
    marginBottom: 10,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
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
    backgroundColor: "#0284C7",
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
