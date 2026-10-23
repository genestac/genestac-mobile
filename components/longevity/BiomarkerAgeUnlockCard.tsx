// components/longevity/BiomarkerAgeUnlockCard.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeLinearGradient as LinearGradient } from "@/components/ui/SafeLinearGradient";
import { LongevityAgeMeter } from "@/components/dashboard/LongevityAgeMeter";
import {
  LONGEVITY_9_BIOMARKERS,
  getBiomarkerStatus,
} from "@/constants/longevityBiomarkers";

interface BiomarkerAgeUnlockCardProps {
  chronoAge: number;
  bioAge: number;
  paceOfAging: number;
  hasBookedTest?: boolean;
  hasUploadedReport?: boolean;
  biomarkersData?: Record<string, number>;
  onBookTest: () => void;
  onUploadReport: () => void;
  onRecalculateLifestyle: () => void;
  onResetDemoFlow?: () => void;
}

export const BiomarkerAgeUnlockCard: React.FC<BiomarkerAgeUnlockCardProps> = ({
  chronoAge = 38,
  bioAge = 33.4,
  paceOfAging = 0.84,
  hasBookedTest = false,
  hasUploadedReport = false,
  biomarkersData,
  onBookTest,
  onUploadReport,
  onRecalculateLifestyle,
  onResetDemoFlow,
}) => {
  const [showAllBiomarkers, setShowAllBiomarkers] = useState(false);
  const [showBiomarkerBreakdown, setShowBiomarkerBreakdown] = useState(false);

  // =========================================================================
  // STATE 1: PRE-TEST (NOT BOOKED, NOT UPLOADED)
  // "dont direclty show biological age clock
  //  show a card saying get you rbiomarker checked to know yor biological age
  //  below that show a button => book test"
  // =========================================================================
  if (!hasUploadedReport && !hasBookedTest) {
    return (
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={["#EEF2FF", "#E0E7FF", "#C7D2FE"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Top Tag & Step Indicator */}
          <View style={styles.topHeaderRow}>
            <View style={styles.clinicalBadge}>
              <Ionicons name="flask" size={13} color="#4F46E5" />
              <Text style={styles.clinicalBadgeText}>CLINICAL PHENOAGE PROTOCOL</Text>
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
            </View>
          </View>

          {/* Headline & Body */}
          <Text style={styles.mainTitle}>
            Get your biomarkers checked to know your biological age
          </Text>
          <Text style={styles.mainDescription}>
            Your biological age cannot be estimated from questions alone. An
            evidence-based blood test measuring 9 specific cellular biomarkers provides
            an exact epigenetic measurement of your rate of aging.
          </Text>

          {/* 9 Biomarkers & Required Tests List */}
          <View style={styles.biomarkersBox}>
            <TouchableOpacity
              style={styles.biomarkersBoxHeader}
              onPress={() => setShowAllBiomarkers(!showAllBiomarkers)}
              activeOpacity={0.8}
            >
              <View style={styles.biomarkersBoxTitleGroup}>
                <Ionicons name="medical" size={16} color="#4F46E5" />
                <Text style={styles.biomarkersBoxTitle}>
                  9 Biomarkers to be checked:
                </Text>
              </View>
              <View style={styles.expandPill}>
                <Text style={styles.expandPillText}>
                  {showAllBiomarkers ? "Collapse" : "View All 9"}
                </Text>
                <Ionicons
                  name={showAllBiomarkers ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="#4F46E5"
                />
              </View>
            </TouchableOpacity>

            {/* List of 9 Biomarkers and their Tests */}
            <View style={styles.biomarkersList}>
              {(showAllBiomarkers
                ? LONGEVITY_9_BIOMARKERS
                : LONGEVITY_9_BIOMARKERS.slice(0, 4)
              ).map((bm) => (
                <View key={bm.id} style={styles.biomarkerRow}>
                  <View style={styles.numberCircle}>
                    <Text style={styles.numberCircleText}>{bm.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.biomarkerNameText}>{bm.name}</Text>
                    <Text style={styles.testNameText}>
                      Test: <Text style={styles.testNameBold}>{bm.testName}</Text>
                    </Text>
                  </View>
                  <View style={styles.unitTag}>
                    <Text style={styles.unitTagText}>{bm.standardUnit}</Text>
                  </View>
                </View>
              ))}

              {!showAllBiomarkers && (
                <TouchableOpacity
                  style={styles.moreCountBtn}
                  onPress={() => setShowAllBiomarkers(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreCountText}>
                    + 5 more
                  </Text>
                  <Ionicons name="arrow-forward" size={13} color="#4F46E5" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Primary Action Button => "Book Test" */}
          <TouchableOpacity
            style={styles.bookTestButton}
            onPress={onBookTest}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#4F46E5", "#3730A3"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bookTestGradient}
            >
              <Ionicons name="calendar" size={18} color="#FFFFFF" />
              <Text style={styles.bookTestButtonText}>Book Test</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary Shortcut: Already have report */}
          <TouchableOpacity
            style={styles.alreadyHaveReportBtn}
            onPress={onUploadReport}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-upload-outline" size={15} color="#4338CA" />
            <Text style={styles.alreadyHaveReportText}>
              Already have your lab test? Upload report directly
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  // =========================================================================
  // STATE 2: TEST BOOKED (AWAITING LAB RESULTS / REPORT)
  // "and after he book test 
  //  upload your report to know your biological age"
  // =========================================================================
  if (!hasUploadedReport && hasBookedTest) {
    return (
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={["#ECFDF5", "#D1FAE5", "#A7F3D0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Top Tag & Status */}
          <View style={styles.topHeaderRow}>
            <View
              style={[
                styles.clinicalBadge,
                { backgroundColor: "#D1FAE5", borderColor: "#A7F3D0" },
              ]}
            >
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={[styles.clinicalBadgeText, { color: "#065F46" }]}>
                TEST BOOKED • SAMPLE COLLECTION SCHEDULED
              </Text>
            </View>
            <View style={[styles.stepBadge, { backgroundColor: "#ECFDF5" }]}>
              <Text style={[styles.stepBadgeText, { color: "#059669" }]}>
                Step 2 of 2
              </Text>
            </View>
          </View>

          {/* Headline & Body */}
          <Text style={styles.mainTitle}>
            Upload your report to know your biological age
          </Text>
          <Text style={styles.mainDescription}>
            Your blood sample collection has been booked. Once your laboratory
            report is ready with the 9 biomarkers, upload it to calculate your
            precise biological age clock.
          </Text>

          {/* Checklist of 9 biomarkers to look for in the report */}
          <View style={styles.bookedChecklistBox}>
            <View style={styles.checklistHeader}>
              <Ionicons name="document-text" size={16} color="#059669" />
              <Text style={styles.checklistTitle}>
                9 Required Biomarkers in Your Report:
              </Text>
            </View>

            <View style={styles.biomarkerChipsGrid}>
              {LONGEVITY_9_BIOMARKERS.map((bm) => (
                <View key={bm.id} style={styles.biomarkerChip}>
                  <View style={styles.chipCheckCircle}>
                    <Ionicons name="checkmark" size={11} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chipName} numberOfLines={1}>
                      {bm.number}. {bm.name}
                    </Text>
                    <Text style={styles.chipTest} numberOfLines={1}>
                      {bm.testName}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Primary Action Button => "Upload Report" */}
          <TouchableOpacity
            style={styles.bookTestButton}
            onPress={onUploadReport}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#059669", "#047857"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bookTestGradient}
            >
              <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
              <Text style={styles.bookTestButtonText}>Upload Your Report</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary Options */}
          <View style={styles.bookedFooterActions}>
            <TouchableOpacity
              style={styles.bookedSecondaryBtn}
              onPress={onUploadReport}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={14} color="#065F46" />
              <Text style={styles.bookedSecondaryText}>
                Enter Biomarkers Manually
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bookedSecondaryBtn}
              onPress={onBookTest}
              activeOpacity={0.7}
            >
              <Ionicons name="repeat-outline" size={14} color="#065F46" />
              <Text style={styles.bookedSecondaryText}>
                Reschedule / Book Again
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // =========================================================================
  // STATE 3: REPORT UPLOADED (BIOLOGICAL AGE CLOCK UNLOCKED & ACTIVE)
  // =========================================================================
  const diff = parseFloat((chronoAge - bioAge).toFixed(1));
  const isYounger = bioAge < chronoAge;

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={["#E2E2FF", "#D3D3FF", "#C6C6FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Top Row: Title & DunedinPACE */}
        <View style={styles.bioCardHeader}>
          <View>
            <Text style={styles.bioCardCategory}>EPIGENETIC & PHENOAGE CLOCK</Text>
            <Text style={styles.bioCardTitle}>Biological Age</Text>
          </View>

          <View style={styles.paceBadge}>
            <Text style={styles.paceBadgeLabel}>Pace of Aging</Text>
            <Text style={styles.paceBadgeValue}>{paceOfAging}x/yr</Text>
          </View>
        </View>

        {/* Speedometer Meter Gauge */}
        <LongevityAgeMeter
          chronoAge={chronoAge}
          bioAge={bioAge}
          paceOfAging={paceOfAging}
        />

        {/* Comparison Callout */}
        <View style={styles.comparisonBanner}>
          <Ionicons
            name={isYounger ? "trending-down" : "alert-circle"}
            size={16}
            color={isYounger ? "#059669" : "#D97706"}
          />
          <Text style={styles.comparisonBannerText}>
            {isYounger
              ? `You are biologically ${Math.abs(diff)} years younger than your calendar age (${chronoAge} yrs). Outstanding longevity reserve!`
              : `Your biological age is ${Math.abs(diff)} years above calendar age (${chronoAge} yrs). Follow targeted interventions to optimize.`}
          </Text>
        </View>

        {/* Footer: Chrono vs Bio comparison & Action buttons */}
        <View style={styles.bioCardFooter}>
          <View style={styles.chronoInfoBox}>
            <Text style={styles.chronoInfoLabel}>Calendar Age</Text>
            <Text style={styles.chronoInfoValue}>{chronoAge} Years</Text>
          </View>

          <View style={styles.footerActionButtonsRow}>
            <TouchableOpacity
              style={styles.updateReportBtn}
              onPress={onUploadReport}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload-outline" size={14} color="#4F46E5" />
              <Text style={styles.updateReportBtnText}>Update Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.recalcBtn}
              onPress={onRecalculateLifestyle}
              activeOpacity={0.8}
            >
              <Ionicons name="calculator-outline" size={14} color="#4F46E5" />
              <Text style={styles.recalcBtnText}>Lifestyle Recalc</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Expandable 9 Biomarkers Breakdown */}
        <TouchableOpacity
          style={styles.breakdownToggleBtn}
          onPress={() => setShowBiomarkerBreakdown(!showBiomarkerBreakdown)}
          activeOpacity={0.8}
        >
          <View style={styles.breakdownToggleLeft}>
            <Ionicons name="list" size={15} color="#4F46E5" />
            <Text style={styles.breakdownToggleText}>
              Verified 9 Biomarkers Breakdown
            </Text>
          </View>
          <Ionicons
            name={showBiomarkerBreakdown ? "chevron-up" : "chevron-down"}
            size={16}
            color="#4F46E5"
          />
        </TouchableOpacity>

        {showBiomarkerBreakdown && (
          <View style={styles.breakdownContainer}>
            {LONGEVITY_9_BIOMARKERS.map((bm) => {
              const val = biomarkersData?.[bm.id] ?? bm.defaultValue;
              const st = getBiomarkerStatus(bm.id, val);

              return (
                <View key={bm.id} style={styles.breakdownRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.breakdownMarkerName}>
                      {bm.number}. {bm.name}
                    </Text>
                    <Text style={styles.breakdownTestName}>
                      Test: {bm.testName}
                    </Text>
                  </View>
                  <View style={styles.breakdownValueCol}>
                    <Text style={styles.breakdownValueText}>
                      {val} {bm.standardUnit}
                    </Text>
                    <View
                      style={[
                        styles.breakdownStatusPill,
                        { backgroundColor: st.bgColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.breakdownStatusPillText,
                          { color: st.color },
                        ]}
                      >
                        {st.label}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Reset Demo Flow link */}
        {onResetDemoFlow && (
          <TouchableOpacity
            style={styles.resetFlowLink}
            onPress={onResetDemoFlow}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={12} color="#6366F1" />
            <Text style={styles.resetFlowLinkText}>
              Reset Test & Report Flow (Demo)
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#BFBFFF",
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
    gap: 12,
  },
  topHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clinicalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  clinicalBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.5,
  },
  stepBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stepBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#4F46E5",
  },
  mainTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  mainDescription: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
  },
  biomarkersBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  biomarkersBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
  },
  biomarkersBoxTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  biomarkersBoxTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  expandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  expandPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  biomarkersList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  biomarkerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 3,
  },
  numberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  numberCircleText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
  },
  biomarkerNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  testNameText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  testNameBold: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  unitTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  unitTagText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  moreCountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  moreCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  bookTestButton: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  bookTestGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  bookTestButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  alreadyHaveReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  alreadyHaveReportText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
    textDecorationLine: "underline",
  },
  // STATE 2
  bookedChecklistBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 10,
  },
  checklistHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checklistTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#065F46",
  },
  biomarkerChipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  biomarkerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: "48%",
  },
  chipCheckCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  chipName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  chipTest: {
    fontSize: 9.5,
    color: "#15803D",
  },
  bookedFooterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 2,
  },
  bookedSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    paddingVertical: 7,
  },
  bookedSecondaryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  // STATE 3 (CLOCK UNLOCKED)
  bioCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  bioCardCategory: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.6,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#059669",
  },
  bioCardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1E1B4B",
    letterSpacing: -0.3,
  },
  paceBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "#BFBFFF",
  },
  paceBadgeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4F46E5",
  },
  paceBadgeValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#059669",
  },
  comparisonBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  comparisonBannerText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#1E1B4B",
    flex: 1,
    lineHeight: 16,
  },
  bioCardFooter: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(79, 70, 229, 0.15)",
    gap: 10,
  },
  chronoInfoBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chronoInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  chronoInfoValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1E1B4B",
  },
  footerActionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  updateReportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFBFFF",
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  updateReportBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4F46E5",
  },
  recalcBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFBFFF",
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  recalcBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4F46E5",
  },
  breakdownToggleBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  breakdownToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breakdownToggleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4F46E5",
  },
  breakdownContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    gap: 8,
  },
  breakdownRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  breakdownMarkerName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  breakdownTestName: {
    fontSize: 10.5,
    color: "#64748B",
  },
  breakdownValueCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  breakdownValueText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  breakdownStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  breakdownStatusPillText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  resetFlowLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  resetFlowLinkText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4F46E5",
  },
});
