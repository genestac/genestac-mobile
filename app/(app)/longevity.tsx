import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { LONGEVITY_SECTIONS } from "@/constants/longevityPlans";
import { VerticalGoalBottomNav } from "@/components/dashboard/VerticalGoalBottomNav";
import { getPrimaryGoalInfo, fetchUserPrimaryGoal } from "@/lib/primaryGoal";
import { supabase } from "@/lib/supabase";
import { SafeLinearGradient as LinearGradient } from "@/components/ui/SafeLinearGradient";
import { LongevityAgeMeter } from "@/components/dashboard/LongevityAgeMeter";
import { BiomarkerAgeUnlockCard } from "@/components/longevity/BiomarkerAgeUnlockCard";
import { BookBiomarkerTestModal } from "@/components/longevity/BookBiomarkerTestModal";
import { UploadBiomarkerReportModal } from "@/components/longevity/UploadBiomarkerReportModal";
import { DEMO_HEALTHY_BIOMARKERS } from "@/constants/longevityBiomarkers";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  saveStoredSupplementSchedules,
  SupplementScheduleItem,
} from "@/lib/notificationStorage";
import {
  syncAllNotifications,
  requestNotificationPermissions,
} from "@/lib/notifications";

const { width } = Dimensions.get("window");

// Longevity Color Palette (Cosmic Indigo, Electric Cyan, Emerald, Violet)
const PALETTE = {
  primary: "#4F46E5",
  primaryDark: "#312E81",
  cyan: "#06B6D4",
  cyanLight: "#ECFEFF",
  emerald: "#10B981",
  emeraldLight: "#ECFDF5",
  amber: "#F59E0B",
  amberLight: "#FFFBEB",
  violet: "#8B5CF6",
  violetLight: "#F5F3FF",
  darkBg: "#0F172A",
  cardBg: "#FFFFFF",
  textPrimary: "#0F172A",
  textMuted: "#64748B",
  borderLight: "#E2E8F0",
};

export interface LongevitySupplement {
  id: string;
  name: string;
  dose: string;
  role: string;
  timing: "morning" | "afternoon" | "evening" | "bedtime";
  timeHour: number; // 0-23
  timeMinute: number; // 0-59
  reminderEnabled: boolean;
  color?: string;
  isCustom?: boolean;
}

export const DEFAULT_SUPPLEMENTS: LongevitySupplement[] = [
  {
    id: "nmn",
    name: "NMN (Nicotinamide Mononucleotide)",
    dose: "500 mg",
    role: "NAD+ booster & SIRT1 DNA repair",
    timing: "morning",
    timeHour: 8,
    timeMinute: 0,
    reminderEnabled: true,
    color: "#0891B2",
  },
  {
    id: "resveratrol",
    name: "Trans-Resveratrol (Micronized)",
    dose: "500 mg",
    role: "Sirtuin activator & vascular defense",
    timing: "morning",
    timeHour: 8,
    timeMinute: 0,
    reminderEnabled: true,
    color: "#9333EA",
  },
  {
    id: "coq10",
    name: "CoQ10 (Ubiquinol Active Form)",
    dose: "100 mg",
    role: "Mitochondrial ATP electron transport",
    timing: "morning",
    timeHour: 8,
    timeMinute: 30,
    reminderEnabled: true,
    color: "#EA580C",
  },
  {
    id: "spermidine",
    name: "Wheat Germ Spermidine",
    dose: "5 mg",
    role: "Autophagy inducer & cell renewal",
    timing: "morning",
    timeHour: 8,
    timeMinute: 30,
    reminderEnabled: true,
    color: "#16A34A",
  },
  {
    id: "apigenin",
    name: "Chamomile Apigenin (98%)",
    dose: "50 mg",
    role: "CD38 inhibitor (protects NAD+ depletion)",
    timing: "evening",
    timeHour: 20,
    timeMinute: 0,
    reminderEnabled: true,
    color: "#059669",
  },
  {
    id: "magnesium",
    name: "Magnesium L-Threonate",
    dose: "400 mg",
    role: "Blood-brain barrier crossing, deep REM sleep",
    timing: "bedtime",
    timeHour: 21,
    timeMinute: 30,
    reminderEnabled: true,
    color: "#4F46E5",
  },
  {
    id: "ashwagandha",
    name: "KSM-66 Organic Ashwagandha",
    dose: "300 mg",
    role: "Nocturnal cortisol & stress dampening",
    timing: "bedtime",
    timeHour: 21,
    timeMinute: 30,
    reminderEnabled: true,
    color: "#D97706",
  },
];

export const SUPPLEMENT_PRESETS = [
  {
    name: "NMN",
    dose: "500 mg",
    role: "NAD+ booster & SIRT1 DNA repair",
    timing: "morning" as const,
    hour: 8,
    minute: 0,
    color: "#0891B2",
  },
  {
    name: "Trans-Resveratrol",
    dose: "500 mg",
    role: "Sirtuin activator & vascular defense",
    timing: "morning" as const,
    hour: 8,
    minute: 0,
    color: "#9333EA",
  },
  {
    name: "CoQ10 Ubiquinol",
    dose: "100 mg",
    role: "Mitochondrial ATP electron transport",
    timing: "morning" as const,
    hour: 8,
    minute: 30,
    color: "#EA580C",
  },
  {
    name: "Spermidine",
    dose: "5 mg",
    role: "Autophagy inducer & cell renewal",
    timing: "morning" as const,
    hour: 8,
    minute: 30,
    color: "#16A34A",
  },
  {
    name: "Vitamin D3 + K2",
    dose: "5000 IU",
    role: "Bone density & arterial calcium defense",
    timing: "morning" as const,
    hour: 9,
    minute: 0,
    color: "#F59E0B",
  },
  {
    name: "Omega-3 (EPA/DHA)",
    dose: "1000 mg",
    role: "Cardiovascular defense & neuroprotection",
    timing: "afternoon" as const,
    hour: 13,
    minute: 0,
    color: "#0284C7",
  },
  {
    name: "Creatine Monohydrate",
    dose: "5 g",
    role: "Cellular energy buffer & cognition",
    timing: "afternoon" as const,
    hour: 14,
    minute: 0,
    color: "#6366F1",
  },
  {
    name: "Berberine HCL",
    dose: "500 mg",
    role: "AMPK activation & glucose metabolism",
    timing: "evening" as const,
    hour: 19,
    minute: 30,
    color: "#10B981",
  },
  {
    name: "Apigenin",
    dose: "50 mg",
    role: "CD38 inhibitor (NAD+ protection) & calm",
    timing: "evening" as const,
    hour: 20,
    minute: 0,
    color: "#059669",
  },
  {
    name: "Magnesium L-Threonate",
    dose: "400 mg",
    role: "Brain bioavailability & deep REM sleep",
    timing: "bedtime" as const,
    hour: 21,
    minute: 30,
    color: "#4F46E5",
  },
  {
    name: "KSM-66 Ashwagandha",
    dose: "300 mg",
    role: "Nocturnal cortisol & stress dampening",
    timing: "bedtime" as const,
    hour: 21,
    minute: 30,
    color: "#D97706",
  },
  {
    name: "Glycine",
    dose: "3 g",
    role: "Core temp reduction & sleep architecture",
    timing: "bedtime" as const,
    hour: 22,
    minute: 0,
    color: "#8B5CF6",
  },
];

interface LongevityProfile {
  chronoAge: number;
  bioAge: number;
  paceOfAging: number; // e.g., 0.84 (years aged per chronological year)
  vo2Max: number; // e.g. 48.5
  nadIndex: number; // e.g. 88
  restingHeartRate: number; // e.g. 54
  hrv: number; // e.g. 68
  fastingProtocol: "16:8" | "18:6" | "20:4" | "OMAD";
  fastingActive: boolean;
  fastingStartTime: string | null; // ISO date string
  eatingStartHour?: number; // e.g. 12 (12 PM)
  eatingEndHour?: number; // e.g. 20 (8 PM)
  fastingRemindersEnabled?: boolean;
  supplements?: LongevitySupplement[];
  supplementsDone: Record<string, boolean>;
  supplementStreak: number;
  lastUpdatedDate: string;
  hasBookedTest?: boolean;
  hasUploadedReport?: boolean;
  biomarkersData?: Record<string, number>;
  lastTestBookedDate?: string;
  reportUploadedDate?: string;
  // Assessment fields
  sleepHours?: "<6" | "6-7" | "7-8" | "8-9" | ">9";
  fitnessLevel?: number;
  fastingDays?: number;
  smokingStatus?: "never" | "former" | "occasional" | "daily";
  strengthDaysPerWeek?: number;
  dailyStepsRange?: "<4k" | "4k-7k" | "8k-10k" | "10k+";
  alcoholPerWeek?: "none" | "1-3" | "4-7" | "8-14" | "15+";
  profileHeight?: number | null;
  profileWeight?: number | null;
}

const DEFAULT_PROFILE: LongevityProfile = {
  chronoAge: 38,
  bioAge: 33.4,
  paceOfAging: 0.84,
  vo2Max: 48.5,
  nadIndex: 88,
  restingHeartRate: 54,
  hrv: 68,
  fastingProtocol: "16:8",
  fastingActive: true,
  fastingStartTime: new Date(Date.now() - 14.5 * 3600 * 1000).toISOString(), // 14.5 hours ago
  eatingStartHour: 12,
  eatingEndHour: 20,
  fastingRemindersEnabled: true,
  supplements: DEFAULT_SUPPLEMENTS,
  supplementsDone: {
    nmn: true,
    resveratrol: true,
    coq10: true,
    spermidine: false,
    magnesium: false,
    apigenin: false,
    ashwagandha: false,
  },
  supplementStreak: 14,
  lastUpdatedDate: new Date().toISOString().split("T")[0],
  hasBookedTest: false,
  hasUploadedReport: false,
  biomarkersData: DEMO_HEALTHY_BIOMARKERS,
  sleepHours: "7-8",
  fitnessLevel: 3,
  fastingDays: 5,
  smokingStatus: "never",
  strengthDaysPerWeek: 2,
  dailyStepsRange: "8k-10k",
  alcoholPerWeek: "none",
};

const PROTOCOL_HOURS: Record<string, number> = {
  "16:8": 16,
  "18:6": 18,
  "20:4": 20,
  OMAD: 23,
};

export default function LongevityScreen() {
  const [isUserPrimaryGoal, setIsUserPrimaryGoal] = useState(false);
  const goalInfo = getPrimaryGoalInfo("Longevity");

  // Main longevity state
  const [profile, setProfile] = useState<LongevityProfile>(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "stack" | "clinical"
  >("dashboard");

  // Modals
  const [showBioModal, setShowBioModal] = useState(false);
  const [showFastingScheduleModal, setShowFastingScheduleModal] =
    useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [treatmentTab, setTreatmentTab] = useState<string>("all");
  const [treatmentSearchQuery, setTreatmentSearchQuery] = useState("");
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [selectedPlanTitle, setSelectedPlanTitle] = useState("");
  const [consultName, setConsultName] = useState("");
  const [consultPhone, setConsultPhone] = useState("");
  const [consultAge, setConsultAge] = useState("");
  const [consultEmail, setConsultEmail] = useState("");
  const [consultNotes, setConsultNotes] = useState("");
  const [isSubmittingConsult, setIsSubmittingConsult] = useState(false);

  // Longevity Biomarker Test & Report Upload Modals
  const [showBookBiomarkerTestModal, setShowBookBiomarkerTestModal] =
    useState(false);
  const [showUploadBiomarkerReportModal, setShowUploadBiomarkerReportModal] =
    useState(false);

  // Supplement Stack Customization States
  const [showAddSupplementModal, setShowAddSupplementModal] = useState(false);
  const [editingSupplementId, setEditingSupplementId] = useState<string | null>(
    null,
  );
  const [suppFormName, setSuppFormName] = useState("");
  const [suppFormDose, setSuppFormDose] = useState("");
  const [suppFormRole, setSuppFormRole] = useState("");
  const [suppFormTiming, setSuppFormTiming] = useState<
    "morning" | "afternoon" | "evening" | "bedtime"
  >("morning");
  const [suppFormHour, setSuppFormHour] = useState(8);
  const [suppFormMinute, setSuppFormMinute] = useState(0);
  const [suppFormReminder, setSuppFormReminder] = useState(true);
  const [suppFormColor, setSuppFormColor] = useState("#0891B2");
  const [activeSuppFilter, setActiveSuppFilter] = useState<
    "all" | "morning" | "afternoon" | "evening" | "bedtime"
  >("all");

  // Fasting Schedule Customization State
  const [selectedEatingStart, setSelectedEatingStart] = useState<number>(
    profile.eatingStartHour ?? 12,
  );
  const [isSyncingNotifs, setIsSyncingNotifs] = useState(false);

  // Input states for Bio-Age Calculator Modal
  const [calcChrono, setCalcChrono] = useState(
    String(DEFAULT_PROFILE.chronoAge),
  );
  const [calcSleepHours, setCalcSleepHours] = useState<
    "<6" | "6-7" | "7-8" | "8-9" | ">9"
  >("7-8");
  const [calcFitnessLevel, setCalcFitnessLevel] = useState<number>(3); // 1: Sedentary, 2: Light, 3: Active, 4: Peak
  const [calcFastingDays, setCalcFastingDays] = useState<number>(5);
  const [calcStrengthDays, setCalcStrengthDays] = useState<number>(2); // 0: 0 days, 1: 1-2 days, 2: 3-4 days, 3: 5+ days
  const [calcDailySteps, setCalcDailySteps] = useState<
    "<4k" | "4k-7k" | "8k-10k" | "10k+"
  >("8k-10k");
  const [calcRhr, setCalcRhr] = useState<number>(
    DEFAULT_PROFILE.restingHeartRate || 62,
  );
  const [calcSmoking, setCalcSmoking] = useState<
    "never" | "former" | "occasional" | "daily"
  >("never");
  const [calcAlcohol, setCalcAlcohol] = useState<
    "none" | "1-3" | "4-7" | "8-14" | "15+"
  >("none");

  // Profile data linked from users table (height, weight, age)
  const [userHeight, setUserHeight] = useState<number | null>(null);
  const [userWeight, setUserWeight] = useState<number | null>(null);

  // Computed BMI from profile
  const userBmi = useMemo(() => {
    if (userHeight && userWeight && userHeight > 0) {
      const heightInMeters = userHeight / 100;
      return parseFloat(
        (userWeight / (heightInMeters * heightInMeters)).toFixed(1),
      );
    }
    return null;
  }, [userHeight, userWeight]);

  const bmiCategory = useMemo(() => {
    if (!userBmi) return null;
    if (userBmi < 18.5) return { label: "Underweight", color: "#F59E0B" };
    if (userBmi <= 24.9) return { label: "Normal (Optimal)", color: "#10B981" };
    if (userBmi <= 29.9) return { label: "Overweight", color: "#F59E0B" };
    return { label: "Obese", color: "#EF4444" };
  }, [userBmi]);

  // Helper functions for fasting schedule formatting
  const formatClockHour = (hour: number) => {
    const h = ((hour % 24) + 24) % 24;
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:00 ${ampm}`;
  };

  const getProtocolEatingHours = (protocol: string) => {
    if (protocol === "16:8") return 8;
    if (protocol === "18:6") return 6;
    if (protocol === "OMAD") return 1;
    return 8;
  };

  const getProtocolFastingHours = (protocol: string) => {
    if (protocol === "16:8") return 16;
    if (protocol === "18:6") return 18;
    if (protocol === "OMAD") return 23;
    return 16;
  };

  // Live clock ticker for circular timer (ticks every second when fastingActive is true)
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());

  useEffect(() => {
    if (!profile.fastingActive) return;
    const interval = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [profile.fastingActive]);

  // Dynamic window calculation for Fasting vs Eating time remaining
  const fastingWindowState = useMemo(() => {
    const startH = profile.eatingStartHour ?? 12;
    const eatingDuration = getProtocolEatingHours(profile.fastingProtocol);
    const endH = profile.eatingEndHour ?? (startH + eatingDuration) % 24;

    const nowD = new Date(currentTimeMs);
    const nowMs = nowD.getTime();

    // Generate transition boundaries for [-1, 0, 1, 2] days to handle all midnight crossing cases
    const transitions: Array<{ type: "eating" | "fasting"; time: number }> = [];
    for (const dayOffset of [-1, 0, 1, 2]) {
      const dEat = new Date(nowD);
      dEat.setDate(dEat.getDate() + dayOffset);
      dEat.setHours(startH, 0, 0, 0);
      transitions.push({ type: "eating", time: dEat.getTime() });

      const dFast = new Date(nowD);
      dFast.setDate(dFast.getDate() + dayOffset);
      dFast.setHours(endH, 0, 0, 0);
      if (endH <= startH) {
        dFast.setDate(dFast.getDate() + 1);
      }
      transitions.push({ type: "fasting", time: dFast.getTime() });
    }

    transitions.sort((a, b) => a.time - b.time);

    const currentTrans = transitions.filter((t) => t.time <= nowMs).pop();
    const nextTrans = transitions.find((t) => t.time > nowMs);

    const isEating = currentTrans?.type === "eating";
    const startTime = currentTrans?.time ?? nowMs;
    const endTime = nextTrans?.time ?? nowMs + 3600000;
    const totalDurationSec = Math.max(
      1,
      Math.floor((endTime - startTime) / 1000),
    );
    const elapsedSec = Math.max(0, Math.floor((nowMs - startTime) / 1000));
    const remainingSec = Math.max(0, Math.floor((endTime - nowMs) / 1000));
    const progress = Math.min(1, Math.max(0, elapsedSec / totalDurationSec));

    const remHours = Math.floor(remainingSec / 3600);
    const remMins = Math.floor((remainingSec % 3600) / 60);
    const remSecs = remainingSec % 60;

    const formattedTime = `${remHours.toString().padStart(2, "0")}:${remMins
      .toString()
      .padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`;

    return {
      isEating,
      progress,
      remHours,
      remMins,
      remSecs,
      formattedTime,
      startH,
      endH,
      eatingDuration,
      fastingDuration: getProtocolFastingHours(profile.fastingProtocol),
    };
  }, [
    currentTimeMs,
    profile.eatingStartHour,
    profile.eatingEndHour,
    profile.fastingProtocol,
  ]);

  const confirmStopFasting = () => {
    Alert.alert(
      "Stop Fasting?",
      "Are you sure you want to stop your current fasting session? This will pause your circular countdown timer and scheduled interval reminders.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop Fasting",
          style: "destructive",
          onPress: async () => {
            const updatedProfile: LongevityProfile = {
              ...profile,
              fastingActive: false,
              fastingRemindersEnabled: false,
            };
            await saveProfile(updatedProfile);

            try {
              const prefs = await getNotificationPreferences();
              prefs.fastingRemindersEnabled = false;
              await saveNotificationPreferences(prefs);
              await syncAllNotifications(prefs);
            } catch (e) {
              console.log("Error stopping fasting notifications:", e);
            }
          },
        },
      ],
    );
  };

  const toggleFastingActive = async () => {
    if (profile.fastingActive) {
      confirmStopFasting();
      return;
    }

    const updatedProfile: LongevityProfile = {
      ...profile,
      fastingActive: true,
      fastingRemindersEnabled: true,
    };
    await saveProfile(updatedProfile);

    try {
      const prefs = await getNotificationPreferences();
      prefs.fastingRemindersEnabled = true;
      await saveNotificationPreferences(prefs);
      await syncAllNotifications(prefs);
    } catch (e) {
      console.log("Error updating fasting active notifications:", e);
    }

    Alert.alert(
      "Fasting Window Activated! ⚡",
      `Circular countdown is now tracking your ${profile.fastingProtocol} fasting & eating windows with active interval reminders.`,
    );
  };

  // Single-select protocol handler: only one fasting protocol can be active at a time
  const handleSelectProtocol = async (proto: "16:8" | "18:6" | "OMAD") => {
    if (profile.fastingProtocol === proto && profile.fastingActive) return;

    const eatingDuration = getProtocolEatingHours(proto);
    const startH = profile.eatingStartHour ?? 12;
    const endH = (startH + eatingDuration) % 24;
    setSelectedEatingStart(startH);

    const updatedProfile: LongevityProfile = {
      ...profile,
      fastingProtocol: proto, // strictly one protocol
      fastingActive: true,
      eatingStartHour: startH,
      eatingEndHour: endH,
      fastingRemindersEnabled: true,
    };
    await saveProfile(updatedProfile);

    try {
      const prefs = await getNotificationPreferences();
      prefs.fastingProtocol = proto;
      prefs.fastingStartHour = startH;
      prefs.fastingEndHour = endH;
      prefs.fastingRemindersEnabled = true;
      await saveNotificationPreferences(prefs);
      await syncAllNotifications(prefs);
    } catch (e) {
      console.log("Error syncing notifications on protocol select:", e);
    }
  };

  const handleSaveFastingSchedule = async (newStartHour: number) => {
    setIsSyncingNotifs(true);
    const eatingDuration = getProtocolEatingHours(profile.fastingProtocol);
    const newEndHour = (newStartHour + eatingDuration) % 24;

    const updatedProfile: LongevityProfile = {
      ...profile,
      fastingActive: true,
      eatingStartHour: newStartHour,
      eatingEndHour: newEndHour,
      fastingRemindersEnabled: true,
    };
    await saveProfile(updatedProfile);

    try {
      await requestNotificationPermissions();
      const prefs = await getNotificationPreferences();
      prefs.fastingRemindersEnabled = true;
      prefs.fastingStartHour = newStartHour;
      prefs.fastingEndHour = newEndHour;
      prefs.fastingProtocol = profile.fastingProtocol as any;
      await saveNotificationPreferences(prefs);
      await syncAllNotifications(prefs);
    } catch (e) {
      console.log("Error scheduling notifications:", e);
    } finally {
      setIsSyncingNotifs(false);
      setShowFastingScheduleModal(false);
      Alert.alert(
        "Autophagy Reminders Scheduled! 🔔",
        `• Fasting Window (${getProtocolFastingHours(profile.fastingProtocol)}h): Reminders every 2 hours to keep you hydrated & track cellular autophagy.\n\n• Eating Window (${eatingDuration}h): Reminders every 1 hour to support wholesome nutrition and window countdown.`,
      );
    }
  };

  // Load from local storage & Supabase
  useEffect(() => {
    async function loadData() {
      try {
        let parsed: any = null;
        const stored = await AsyncStorage.getItem(
          "@genestac_longevity_profile",
        );
        if (stored) {
          parsed = JSON.parse(stored);
          const today = new Date().toISOString().split("T")[0];
          if (parsed.lastUpdatedDate !== today) {
            // New day: keep streak, reset daily supplement checklist
            parsed.supplementsDone = {};
            parsed.lastUpdatedDate = today;
          }
          if (parsed.eatingStartHour === undefined) {
            parsed.eatingStartHour = 12;
            parsed.eatingEndHour = 20;
            parsed.fastingRemindersEnabled = true;
          }
          if (
            !parsed.supplements ||
            !Array.isArray(parsed.supplements) ||
            parsed.supplements.length === 0
          ) {
            parsed.supplements = DEFAULT_SUPPLEMENTS;
          }
          if (parsed.hasBookedTest === undefined) {
            parsed.hasBookedTest = false;
          }
          if (parsed.hasUploadedReport === undefined) {
            parsed.hasUploadedReport = false;
          }
          if (!parsed.biomarkersData) {
            parsed.biomarkersData = DEMO_HEALTHY_BIOMARKERS;
          }
          setProfile(parsed);
          setSelectedEatingStart(parsed.eatingStartHour ?? 12);

          // Sync supplement schedules to storage
          const schedules: SupplementScheduleItem[] = parsed.supplements.map(
            (s: LongevitySupplement) => ({
              id: s.id,
              name: s.name,
              dose: s.dose,
              role: s.role,
              hour: s.timeHour,
              minute: s.timeMinute,
              enabled: s.reminderEnabled,
            }),
          );
          await saveStoredSupplementSchedules(schedules);

          // Restore previously calculated assessment values if available
          if (parsed.chronoAge) setCalcChrono(String(parsed.chronoAge));
          if (parsed.sleepHours) setCalcSleepHours(parsed.sleepHours);
          if (parsed.fitnessLevel) setCalcFitnessLevel(parsed.fitnessLevel);
          if (parsed.fastingDays) setCalcFastingDays(parsed.fastingDays);
          if (parsed.strengthDaysPerWeek !== undefined)
            setCalcStrengthDays(parsed.strengthDaysPerWeek);
          if (parsed.dailyStepsRange) setCalcDailySteps(parsed.dailyStepsRange);
          if (parsed.restingHeartRate) setCalcRhr(parsed.restingHeartRate);
          if (parsed.smokingStatus) setCalcSmoking(parsed.smokingStatus);
          if (parsed.alcoholPerWeek) setCalcAlcohol(parsed.alcoholPerWeek);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const goal = await fetchUserPrimaryGoal(session.user.id);
          const isGoal = !!goal && goal.toLowerCase().includes("longevity");
          setIsUserPrimaryGoal(isGoal);

          if (session.user.user_metadata?.full_name) {
            setConsultName(session.user.user_metadata.full_name);
          }
          if (session.user.email) {
            setConsultEmail(session.user.email);
          }
          if (session.user.phone) {
            setConsultPhone(session.user.phone);
          }

          // Fetch user metadata & weight loss journey from users table (same as Profile screen)
          const { data: userData } = await supabase
            .from("users")
            .select("metadata, weight_loss_journey")
            .eq("id", session.user.id)
            .maybeSingle();

          if (userData) {
            const meta = userData.metadata;
            const journey = userData.weight_loss_journey;

            if (meta?.full_name && !session.user.user_metadata?.full_name) {
              setConsultName(meta.full_name);
            }
            if (meta?.phone && !session.user.phone) {
              setConsultPhone(meta.phone);
            }

            let weightVal: number | null = null;
            if (Array.isArray(journey?.history) && journey.history.length > 0) {
              const sorted = [...journey.history].sort(
                (a: any, b: any) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              );
              const latest = sorted[0]?.weight;
              if (latest != null && !isNaN(Number(latest))) {
                weightVal = Number(latest);
              }
            } else if (journey?.startingWeight != null) {
              weightVal = Number(journey.startingWeight);
            } else if (meta?.weight != null) {
              weightVal = Number(meta.weight);
            }

            const heightVal = meta?.height ? Number(meta.height) : null;
            const ageVal = meta?.age ? Number(meta.age) : null;

            if (heightVal) setUserHeight(heightVal);
            if (weightVal) setUserWeight(weightVal);
            if (ageVal) {
              setConsultAge(String(ageVal));
              if (!parsed || !parsed.chronoAge) {
                setCalcChrono(String(ageVal));
              }
            } else if (parsed?.chronoAge) {
              setConsultAge(String(parsed.chronoAge));
            }
          }
        }
      } catch (e) {
        console.log("Error loading longevity profile:", e);
      }
    }
    loadData();
  }, []);

  const handleSubmitConsultation = async () => {
    if (!consultName.trim()) {
      Alert.alert("Missing Information", "Please enter your Name.");
      return;
    }
    if (!consultPhone.trim()) {
      Alert.alert("Missing Information", "Please enter your Phone Number.");
      return;
    }
    if (!consultAge.trim()) {
      Alert.alert("Missing Information", "Please enter your Age.");
      return;
    }
    if (!consultEmail.trim()) {
      Alert.alert("Missing Information", "Please enter your Email ID.");
      return;
    }

    setIsSubmittingConsult(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const patientId = sessionData?.session?.user?.id || null;

      const { data: staffData } = await supabase
        .from("staffs")
        .select("id")
        .limit(1)
        .maybeSingle();

      const doctorId = staffData?.id || null;
      const scheduledAt = new Date().toISOString();
      const bookingTitle = selectedPlanTitle
        ? `Book Plan: ${selectedPlanTitle}`
        : "Book Consultation - Longevity & Anti-Aging";

      const appointmentPayload: Record<string, any> = {
        patient_id: patientId,
        scheduled_at: scheduledAt,
        status: "pending",
        title: bookingTitle,
        type: "Longevity & Anti-Aging",
        related_to: "Longevity & Anti-Aging",
        notes: `Selected Plan: ${selectedPlanTitle || "General"}, Patient Name: ${consultName.trim()}, Phone: ${consultPhone.trim()}, Age: ${consultAge.trim()}, Email: ${consultEmail.trim()}${consultNotes.trim() ? `, Notes: ${consultNotes.trim()}` : ""}`,
        plan_details: {
          patient_name: consultName.trim(),
          phone: consultPhone.trim(),
          age: consultAge.trim(),
          email: consultEmail.trim(),
          category: "Longevity & Anti-Aging",
          selected_plan: selectedPlanTitle || null,
          notes: consultNotes.trim() || null,
        },
      };

      if (doctorId) {
        appointmentPayload.doctor_id = doctorId;
      }

      const { error } = await supabase
        .from("appointments")
        .insert([appointmentPayload]);

      if (error) {
        console.error("Error inserting into appointments table:", error);
        let errorMsg = error.message;
        if (error.code === "42501") {
          errorMsg =
            "Row-Level Security (RLS) policy restricted this insert. Please run the RLS SQL policy for table 'appointments' in Supabase SQL Editor.";
        }
        Alert.alert("Booking Error", errorMsg);
        return;
      }

      setShowConsultModal(false);
      setSelectedPlanTitle("");
      Alert.alert(
        "Consultation Booked",
        selectedPlanTitle
          ? `Your consultation request for "${selectedPlanTitle}" has been received. Our clinical coordinator will reach out shortly.`
          : "Your longevity physician consultation has been scheduled. Our clinical team will reach out to confirm your appointment time.",
        [{ text: "OK" }],
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to book consultation.");
    } finally {
      setIsSubmittingConsult(false);
    }
  };

  const saveProfile = async (updated: LongevityProfile) => {
    setProfile(updated);
    try {
      await AsyncStorage.setItem(
        "@genestac_longevity_profile",
        JSON.stringify(updated),
      );
    } catch (e) {
      console.log("Error saving longevity profile:", e);
    }
  };

  // Biomarker Test Booking & Report Upload Flow Handlers
  const handleBookingBiomarkerSuccess = () => {
    const updated: LongevityProfile = {
      ...profile,
      hasBookedTest: true,
      lastTestBookedDate: new Date().toISOString(),
    };
    saveProfile(updated);
  };

  const handleReportUploadSuccess = (data: {
    bioAge: number;
    paceOfAging: number;
    biomarkers: Record<string, number>;
    fileName?: string;
  }) => {
    const updated: LongevityProfile = {
      ...profile,
      bioAge: data.bioAge,
      paceOfAging: data.paceOfAging,
      hasBookedTest: true,
      hasUploadedReport: true,
      biomarkersData: data.biomarkers,
      reportUploadedDate: new Date().toISOString(),
    };
    saveProfile(updated);
  };

  const handleResetBiomarkerFlow = () => {
    Alert.alert(
      "Reset Biomarker Assessment Flow?",
      "This will return the Longevity screen to the initial state ('Get your biomarkers checked' -> 'Book Test'). You can test booking and uploading again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Flow",
          style: "destructive",
          onPress: () => {
            const updated: LongevityProfile = {
              ...profile,
              hasBookedTest: false,
              hasUploadedReport: false,
            };
            saveProfile(updated);
            Alert.alert(
              "Flow Reset",
              "Longevity assessment has been reset to the initial state."
            );
          },
        },
      ]
    );
  };

  // Format supplement scheduled time (e.g. 8:00 AM)
  const formatSupplementTime = (hour: number, minute: number = 0) => {
    const h = ((hour % 24) + 24) % 24;
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = minute < 10 ? `0${minute}` : minute;
    return `${displayH}:${displayM} ${ampm}`;
  };

  // Toggle Supplement check
  const toggleSupplement = (key: string) => {
    const nextDone = {
      ...profile.supplementsDone,
      [key]: !profile.supplementsDone[key],
    };
    const activeSupplements = profile.supplements || DEFAULT_SUPPLEMENTS;
    const allChecked =
      activeSupplements.length > 0 &&
      activeSupplements.every((s) => nextDone[s.id]);
    const wasAllChecked =
      activeSupplements.length > 0 &&
      activeSupplements.every((s) => profile.supplementsDone[s.id]);

    let newStreak = profile.supplementStreak;
    if (allChecked && !wasAllChecked) {
      newStreak = profile.supplementStreak + 1;
    } else if (!allChecked && wasAllChecked && newStreak > 0) {
      newStreak = Math.max(0, profile.supplementStreak - 1);
    }

    saveProfile({
      ...profile,
      supplementsDone: nextDone,
      supplementStreak: newStreak,
    });
  };

  // Toggle individual supplement reminder on/off
  const toggleSupplementReminder = async (id: string) => {
    const activeList = profile.supplements || DEFAULT_SUPPLEMENTS;
    let newStatus = false;
    const updatedList = activeList.map((s) => {
      if (s.id === id) {
        newStatus = !s.reminderEnabled;
        return { ...s, reminderEnabled: newStatus };
      }
      return s;
    });

    const updatedProfile = {
      ...profile,
      supplements: updatedList,
    };
    await saveProfile(updatedProfile);

    // Sync notification schedules
    const schedules: SupplementScheduleItem[] = updatedList.map((s) => ({
      id: s.id,
      name: s.name,
      dose: s.dose,
      role: s.role,
      hour: s.timeHour,
      minute: s.timeMinute,
      enabled: s.reminderEnabled,
    }));
    await saveStoredSupplementSchedules(schedules);

    try {
      if (newStatus) {
        const hasPerm = await requestNotificationPermissions();
        if (!hasPerm) {
          Alert.alert(
            "Notifications Disabled",
            "Please allow notification permissions in your device settings to receive supplement alerts.",
          );
        }
      }
      const prefs = await getNotificationPreferences();
      await syncAllNotifications(prefs);
    } catch (e) {
      console.log("Error syncing supplement notification:", e);
    }
  };

  // Delete supplement
  const handleDeleteSupplement = (id: string, name: string) => {
    Alert.alert(
      "Remove Supplement",
      `Are you sure you want to remove "${name}" from your daily stack?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const activeList = profile.supplements || DEFAULT_SUPPLEMENTS;
            const updatedList = activeList.filter((s) => s.id !== id);
            const nextDone = { ...profile.supplementsDone };
            delete nextDone[id];

            const updatedProfile = {
              ...profile,
              supplements: updatedList,
              supplementsDone: nextDone,
            };
            await saveProfile(updatedProfile);

            const schedules: SupplementScheduleItem[] = updatedList.map(
              (s) => ({
                id: s.id,
                name: s.name,
                dose: s.dose,
                role: s.role,
                hour: s.timeHour,
                minute: s.timeMinute,
                enabled: s.reminderEnabled,
              }),
            );
            await saveStoredSupplementSchedules(schedules);

            try {
              const prefs = await getNotificationPreferences();
              await syncAllNotifications(prefs);
            } catch (e) {
              console.log("Error syncing notifications:", e);
            }
          },
        },
      ],
    );
  };

  // Open modal for adding
  const openAddSupplementModal = (
    defaultTiming: "morning" | "afternoon" | "evening" | "bedtime" = "morning",
  ) => {
    setEditingSupplementId(null);
    setSuppFormName("");
    setSuppFormDose("");
    setSuppFormRole("");
    setSuppFormTiming(defaultTiming);
    const defaultHour =
      defaultTiming === "morning"
        ? 8
        : defaultTiming === "afternoon"
          ? 13
          : defaultTiming === "evening"
            ? 20
            : 21;
    const defaultMinute = defaultTiming === "bedtime" ? 30 : 0;
    setSuppFormHour(defaultHour);
    setSuppFormMinute(defaultMinute);
    setSuppFormReminder(true);
    setSuppFormColor("#0891B2");
    setShowAddSupplementModal(true);
  };

  // Open modal for editing
  const openEditSupplementModal = (supp: LongevitySupplement) => {
    setEditingSupplementId(supp.id);
    setSuppFormName(supp.name);
    setSuppFormDose(supp.dose);
    setSuppFormRole(supp.role);
    setSuppFormTiming(supp.timing);
    setSuppFormHour(supp.timeHour);
    setSuppFormMinute(supp.timeMinute);
    setSuppFormReminder(supp.reminderEnabled);
    setSuppFormColor(supp.color || "#0891B2");
    setShowAddSupplementModal(true);
  };

  // Apply preset template
  const applyPreset = (preset: (typeof SUPPLEMENT_PRESETS)[0]) => {
    setSuppFormName(preset.name);
    setSuppFormDose(preset.dose);
    setSuppFormRole(preset.role);
    setSuppFormTiming(preset.timing);
    setSuppFormHour(preset.hour);
    setSuppFormMinute(preset.minute);
    setSuppFormColor(preset.color);
  };

  // Save (add or edit)
  const handleSaveSupplement = async () => {
    if (!suppFormName.trim()) {
      Alert.alert("Missing Name", "Please enter a supplement name.");
      return;
    }
    if (!suppFormDose.trim()) {
      Alert.alert(
        "Missing Dosage",
        "Please enter dosage (e.g. 500 mg, 1 capsule).",
      );
      return;
    }

    const activeList = profile.supplements || DEFAULT_SUPPLEMENTS;
    let updatedList: LongevitySupplement[];

    if (editingSupplementId) {
      updatedList = activeList.map((s) => {
        if (s.id === editingSupplementId) {
          return {
            ...s,
            name: suppFormName.trim(),
            dose: suppFormDose.trim(),
            role:
              suppFormRole.trim() || "Cellular longevity & health optimization",
            timing: suppFormTiming,
            timeHour: suppFormHour,
            timeMinute: suppFormMinute,
            reminderEnabled: suppFormReminder,
            color: suppFormColor,
          };
        }
        return s;
      });
    } else {
      const newSupp: LongevitySupplement = {
        id: `supp_${Date.now()}`,
        name: suppFormName.trim(),
        dose: suppFormDose.trim(),
        role: suppFormRole.trim() || "Cellular longevity & health optimization",
        timing: suppFormTiming,
        timeHour: suppFormHour,
        timeMinute: suppFormMinute,
        reminderEnabled: suppFormReminder,
        color: suppFormColor,
        isCustom: true,
      };
      updatedList = [...activeList, newSupp];
    }

    const updatedProfile = {
      ...profile,
      supplements: updatedList,
    };
    await saveProfile(updatedProfile);

    // Sync notification schedules
    const schedules: SupplementScheduleItem[] = updatedList.map((s) => ({
      id: s.id,
      name: s.name,
      dose: s.dose,
      role: s.role,
      hour: s.timeHour,
      minute: s.timeMinute,
      enabled: s.reminderEnabled,
    }));
    await saveStoredSupplementSchedules(schedules);

    try {
      if (suppFormReminder) {
        await requestNotificationPermissions();
      }
      const prefs = await getNotificationPreferences();
      await syncAllNotifications(prefs);
    } catch (e) {
      console.log("Error syncing notifications:", e);
    }

    setShowAddSupplementModal(false);
    setEditingSupplementId(null);
    Alert.alert(
      editingSupplementId ? "Supplement Updated" : "Supplement Added",
      `"${suppFormName.trim()}" is now part of your stack.${
        suppFormReminder
          ? ` Daily reminder scheduled for ${formatSupplementTime(suppFormHour, suppFormMinute)}.`
          : ""
      }`,
    );
  };

  // Recalculate Bio-Age Algorithm with Multi-Parameter Lifestyle & Clinical Weighting
  const handleRecalculateBioAge = () => {
    const chrono = parseFloat(calcChrono) || profile.chronoAge || 38;

    // 1. Sleep Duration (Hours/Night)
    let sleepDelta = 0;
    if (calcSleepHours === "<6") sleepDelta = 1.6;
    else if (calcSleepHours === "6-7") sleepDelta = 0.4;
    else if (calcSleepHours === "7-8")
      sleepDelta = -1.5; // Optimal
    else if (calcSleepHours === "8-9") sleepDelta = -0.8;
    else if (calcSleepHours === ">9") sleepDelta = 0.5;

    // 2. Cardio & Aerobic Fitness Level
    let cardioDelta = 0;
    if (calcFitnessLevel === 1)
      cardioDelta = 1.6; // Sedentary
    else if (calcFitnessLevel === 2)
      cardioDelta = 0.4; // Light
    else if (calcFitnessLevel === 3)
      cardioDelta = -1.4; // Active / Consistent cardio
    else if (calcFitnessLevel === 4) cardioDelta = -2.6; // Peak / VO2 max

    // 3. Fasting Consistency
    let fastingDelta = 0;
    if (calcFastingDays <= 1) fastingDelta = 0.4;
    else if (calcFastingDays <= 3) fastingDelta = -0.4;
    else if (calcFastingDays <= 5) fastingDelta = -1.2;
    else fastingDelta = -1.8;

    // 4. Strength / Resistance Training Frequency (Sarcopenia / muscular reserve)
    let strengthDelta = 0;
    if (calcStrengthDays === 0) strengthDelta = 1.4;
    else if (calcStrengthDays === 1) strengthDelta = -0.4;
    else if (calcStrengthDays === 2)
      strengthDelta = -1.6; // 3-4 days (Optimal)
    else strengthDelta = -2.0; // 5+ days

    // 5. Daily Steps / Walking Activity (Endothelial & NEAT marker)
    let stepsDelta = 0;
    if (calcDailySteps === "<4k") stepsDelta = 1.6;
    else if (calcDailySteps === "4k-7k") stepsDelta = 0.2;
    else if (calcDailySteps === "8k-10k") stepsDelta = -1.4;
    else if (calcDailySteps === "10k+") stepsDelta = -2.2;

    // 6. Resting Heart Rate (Cardiovascular / Autonomic reserve)
    let rhrDelta = 0;
    if (calcRhr < 55) rhrDelta = -1.8;
    else if (calcRhr <= 65) rhrDelta = -0.8;
    else if (calcRhr <= 75) rhrDelta = 0.2;
    else if (calcRhr <= 85) rhrDelta = 1.5;
    else rhrDelta = 2.8;

    // 7. Smoking / Nicotine Status (GrimAge #1 non-lab factor)
    let smokingDelta = 0;
    if (calcSmoking === "never") smokingDelta = -1.0;
    else if (calcSmoking === "former") smokingDelta = 0.2;
    else if (calcSmoking === "occasional") smokingDelta = 2.0;
    else if (calcSmoking === "daily") smokingDelta = 4.8;

    // 8. Alcohol Consumption (Standard drinks/week)
    let alcoholDelta = 0;
    if (calcAlcohol === "none") alcoholDelta = -0.5;
    else if (calcAlcohol === "1-3") alcoholDelta = 0.0;
    else if (calcAlcohol === "4-7") alcoholDelta = 0.8;
    else if (calcAlcohol === "8-14") alcoholDelta = 2.0;
    else if (calcAlcohol === "15+") alcoholDelta = 3.8;

    // 9. BMI / Body Composition from Profile
    let bmiDelta = 0;
    if (userBmi) {
      if (userBmi < 18.5) bmiDelta = 0.4;
      else if (userBmi <= 24.9)
        bmiDelta = -1.0; // Optimal
      else if (userBmi <= 29.9) bmiDelta = 0.8;
      else bmiDelta = 2.2; // Obese
    }

    // Net biological age adjustment
    const netAdjustment =
      sleepDelta +
      cardioDelta +
      fastingDelta +
      strengthDelta +
      stepsDelta +
      rhrDelta +
      smokingDelta +
      alcoholDelta +
      bmiDelta;

    const computedBioAge = parseFloat(
      Math.max(18, chrono + netAdjustment).toFixed(1),
    );
    // Pace of aging: baseline 1.0; optimal slows down to ~0.70; accelerated goes up to ~1.35
    const pace = parseFloat(
      Math.max(
        0.68,
        Math.min(1.35, 1.0 + (netAdjustment / chrono) * 0.45),
      ).toFixed(2),
    );

    const updatedProfile: LongevityProfile = {
      ...profile,
      chronoAge: chrono,
      bioAge: computedBioAge,
      paceOfAging: pace,
      restingHeartRate: calcRhr,
      sleepHours: calcSleepHours,
      fitnessLevel: calcFitnessLevel,
      fastingDays: calcFastingDays,
      smokingStatus: calcSmoking,
      strengthDaysPerWeek: calcStrengthDays,
      dailyStepsRange: calcDailySteps,
      alcoholPerWeek: calcAlcohol,
      profileHeight: userHeight,
      profileWeight: userWeight,
    };

    saveProfile(updatedProfile);
    setShowBioModal(false);

    const diff = (chrono - computedBioAge).toFixed(1);
    const isYounger = computedBioAge < chrono;
    Alert.alert(
      "Bio-Age Recalculated! 🧬",
      `Your updated Biological Age is ${computedBioAge} years (Pace of aging: ${pace}x).\n\n${
        isYounger
          ? `You are biologically ${diff} years younger than your calendar age! Excellent longevity habits.`
          : `Your biological age is ${Math.abs(Number(diff))} years above calendar age. Targeted interventions can reverse this.`
      }\n\n* Note: This calculation is an estimate based on your self-reported inputs. Clinical blood and epigenetic laboratory tests may vary.`,
    );
  };

  return (
    <View style={styles.rootContainer}>
      <TopNavbar userName="User" />

      {/* Subheader Navigation */}
      <View style={styles.subHeaderNavRow}>
        <View style={styles.subHeaderLeft}>
          {!isUserPrimaryGoal && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(app)")}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.titleWithBadge}>
            <Text style={styles.headerCategoryTitle}>Longevity</Text>
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>BIOHACK</Text>
            </View>
          </View>
        </View>

        {isUserPrimaryGoal && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(app)/dashboard/profile")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color={PALETTE.primary} />
            <Text style={[styles.backButtonText, { color: PALETTE.primary }]}>
              Profile
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Top Tabs */}
      <View style={styles.segmentContainer}>
        {[
          { key: "dashboard", label: "Overview", icon: "pulse-outline", flex: 0.95 },
          { key: "stack", label: "Supplement Stack", icon: "flask-outline", flex: 1.3 },
          { key: "clinical", label: "Care & Panels", icon: "medical-outline", flex: 1.05 },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.segmentBtn,
                { flex: tab.flex },
                active && styles.segmentBtnActive,
              ]}
              onPress={() => setActiveTab(tab.key as any)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={active ? "#FFFFFF" : PALETTE.textMuted}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  active && styles.segmentBtnTextActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.scrollPadding}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "dashboard" && (
          <>
            {/* HERO BIOLOGICAL AGE & 9-BIOMARKER ASSESSMENT CARD */}
            <BiomarkerAgeUnlockCard
              chronoAge={profile.chronoAge}
              bioAge={profile.bioAge}
              paceOfAging={profile.paceOfAging}
              hasBookedTest={profile.hasBookedTest}
              hasUploadedReport={profile.hasUploadedReport}
              biomarkersData={profile.biomarkersData}
              onBookTest={() => setShowBookBiomarkerTestModal(true)}
              onUploadReport={() => setShowUploadBiomarkerReportModal(true)}
              onRecalculateLifestyle={() => setShowBioModal(true)}
              onResetDemoFlow={handleResetBiomarkerFlow}
            />

            {/* CELLULAR FASTING & AUTOPHAGY TIMER */}
            <View style={styles.fastingCard}>
              <View style={styles.fastingHeaderCol}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.cardHeaderIconBg,
                      { backgroundColor: PALETTE.emeraldLight },
                    ]}
                  >
                    <Ionicons name="flame" size={20} color={PALETTE.emerald} />
                  </View>
                  <View style={styles.cardHeaderTextCol}>
                    <Text
                      style={styles.sectionHeaderTitle}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      Autophagy Fasting Tracker
                    </Text>
                    <Text
                      style={styles.sectionHeaderSubtitle}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      Cellular Senescence & Mitochondrial Reset
                    </Text>
                  </View>
                </View>

                {/* Single-Select Protocol Segmented Control (Only ONE active at a time) */}
                <View style={styles.fastingProtocolSegment}>
                  {(["16:8", "18:6", "OMAD"] as const).map((proto) => {
                    const isSelected = profile.fastingProtocol === proto;
                    return (
                      <TouchableOpacity
                        key={proto}
                        style={[
                          styles.protocolSegmentBtn,
                          isSelected && styles.protocolSegmentBtnActive,
                        ]}
                        onPress={() => handleSelectProtocol(proto)}
                        activeOpacity={0.8}
                      >
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={13}
                            color="#FFFFFF"
                            style={{ marginRight: 4 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.protocolSegmentText,
                            isSelected && styles.protocolSegmentTextActive,
                          ]}
                        >
                          {proto}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Dynamic Content: Circular Timer if Fasting Active, or Inactive Activation Card */}
                {profile.fastingActive ? (
                  <View style={styles.circularTimerCard}>
                    {/* Top Status & Controls Bar */}
                    <View style={styles.circularTopControlsRow}>
                      <View style={styles.fastingLiveIndicator}>
                        <View style={styles.livePulseDot} />
                        <Text style={styles.fastingLiveIndicatorText}>
                          Protocol Active
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.adjustScheduleLink}
                        onPress={() => {
                          setSelectedEatingStart(profile.eatingStartHour ?? 12);
                          setShowFastingScheduleModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="options-outline"
                          size={13}
                          color="#4F46E5"
                        />
                        <Text style={styles.adjustScheduleLinkText}>
                          Set Times
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Circular SVG Timer */}
                    <View style={styles.circularSvgWrapper}>
                      <Svg width={210} height={210} viewBox="0 0 210 210">
                        <Defs>
                          <SvgGradient
                            id="fastingTimerGrad"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <Stop offset="0%" stopColor="#6366F1" />
                            <Stop offset="100%" stopColor="#06B6D4" />
                          </SvgGradient>
                          <SvgGradient
                            id="eatingTimerGrad"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <Stop offset="0%" stopColor="#10B981" />
                            <Stop offset="100%" stopColor="#059669" />
                          </SvgGradient>
                        </Defs>

                        {/* Background Ring */}
                        <Circle
                          cx={105}
                          cy={105}
                          r={86}
                          stroke={
                            fastingWindowState.isEating ? "#E6F7F0" : "#EEF2FF"
                          }
                          strokeWidth={8}
                          fill="transparent"
                        />

                        {/* Progress Fill Ring */}
                        <Circle
                          cx={105}
                          cy={105}
                          r={86}
                          stroke={
                            fastingWindowState.isEating
                              ? "url(#eatingTimerGrad)"
                              : "url(#fastingTimerGrad)"
                          }
                          strokeWidth={11}
                          strokeDasharray={540.35}
                          strokeDashoffset={
                            540.35 * (1 - fastingWindowState.progress)
                          }
                          strokeLinecap="round"
                          fill="transparent"
                          transform="rotate(-90 105 105)"
                        />
                      </Svg>

                      {/* Inside Ring Center Content */}
                      <View style={styles.circularCenterContent}>
                        <View
                          style={[
                            styles.windowStatusBadge,
                            fastingWindowState.isEating
                              ? styles.windowStatusBadgeEating
                              : styles.windowStatusBadgeFasting,
                          ]}
                        >
                          <Ionicons
                            name={
                              fastingWindowState.isEating
                                ? "restaurant"
                                : "flame"
                            }
                            size={11}
                            color={
                              fastingWindowState.isEating
                                ? "#059669"
                                : "#4F46E5"
                            }
                          />
                          <Text
                            style={[
                              styles.windowStatusBadgeText,
                              fastingWindowState.isEating
                                ? { color: "#059669" }
                                : { color: "#4F46E5" },
                            ]}
                          >
                            {fastingWindowState.isEating
                              ? "EATING WINDOW"
                              : "FASTING WINDOW"}
                          </Text>
                        </View>

                        <Text style={styles.circularTimerTime}>
                          {fastingWindowState.formattedTime}
                        </Text>
                        <Text style={styles.circularTimerLabel}>
                          {fastingWindowState.isEating
                            ? "REMAINING TO EAT"
                            : "REMAINING TO FAST"}
                        </Text>

                        <View style={styles.circularNextTransitionRow}>
                          <Ionicons
                            name="time-outline"
                            size={11}
                            color={PALETTE.textMuted}
                          />
                          <Text
                            style={styles.circularNextTransitionText}
                            numberOfLines={1}
                          >
                            {fastingWindowState.isEating
                              ? `Fast resumes ${formatClockHour(fastingWindowState.endH)}`
                              : `Eat opens ${formatClockHour(fastingWindowState.startH)}`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Window Status Indicators (Full-width breakdown cards with time & sub in one single line) */}
                    <View style={styles.windowCardsCol}>
                      {/* Fasting Indicator Card */}
                      <TouchableOpacity
                        style={[
                          styles.windowDetailCard,
                          !fastingWindowState.isEating &&
                            styles.windowDetailCardActiveFasting,
                        ]}
                        onPress={() => {
                          setSelectedEatingStart(profile.eatingStartHour ?? 12);
                          setShowFastingScheduleModal(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.windowDetailCardHeader}>
                          <View style={styles.windowDetailTitleGroup}>
                            <View
                              style={[
                                styles.windowIconBg,
                                !fastingWindowState.isEating
                                  ? styles.windowIconBgFasting
                                  : styles.windowIconBgMuted,
                              ]}
                            >
                              <Ionicons
                                name="flame"
                                size={14}
                                color={
                                  !fastingWindowState.isEating
                                    ? "#4F46E5"
                                    : PALETTE.textMuted
                                }
                              />
                            </View>
                            <Text
                              style={[
                                styles.windowDetailTitle,
                                !fastingWindowState.isEating &&
                                  styles.windowDetailTitleActiveFasting,
                              ]}
                            >
                              Fasting Window
                            </Text>
                          </View>
                          {!fastingWindowState.isEating ? (
                            <View style={styles.activePillFasting}>
                              <View style={styles.livePulseDot} />
                              <Text style={styles.activePillTextFasting}>
                                ACTIVE NOW
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.inactivePill}>
                              <Text style={styles.inactivePillText}>
                                Next: {formatClockHour(fastingWindowState.endH)}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Timing */}
                        <Text style={styles.windowDetailTime}>
                          {formatClockHour(fastingWindowState.endH)} –{" "}
                          {formatClockHour(fastingWindowState.startH)}{" "}
                          <Text style={styles.windowDetailDurationText}>
                            ({fastingWindowState.fastingDuration}h)
                          </Text>
                        </Text>

                        {/* Reminder text below timing */}
                        <View style={styles.windowDetailReminderRow}>
                          <Ionicons
                            name="notifications-outline"
                            size={12}
                            color={
                              !fastingWindowState.isEating
                                ? "#4F46E5"
                                : PALETTE.textMuted
                            }
                          />
                          <Text style={styles.reminderHighlightFasting}>
                            Reminders every 2h
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Eating Indicator Card */}
                      <TouchableOpacity
                        style={[
                          styles.windowDetailCard,
                          fastingWindowState.isEating &&
                            styles.windowDetailCardActiveEating,
                        ]}
                        onPress={() => {
                          setSelectedEatingStart(profile.eatingStartHour ?? 12);
                          setShowFastingScheduleModal(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.windowDetailCardHeader}>
                          <View style={styles.windowDetailTitleGroup}>
                            <View
                              style={[
                                styles.windowIconBg,
                                fastingWindowState.isEating
                                  ? styles.windowIconBgEating
                                  : styles.windowIconBgMuted,
                              ]}
                            >
                              <Ionicons
                                name="restaurant"
                                size={14}
                                color={
                                  fastingWindowState.isEating
                                    ? "#059669"
                                    : PALETTE.textMuted
                                }
                              />
                            </View>
                            <Text
                              style={[
                                styles.windowDetailTitle,
                                fastingWindowState.isEating &&
                                  styles.windowDetailTitleActiveEating,
                              ]}
                            >
                              Eating Window
                            </Text>
                          </View>
                          {fastingWindowState.isEating ? (
                            <View style={styles.activePillEating}>
                              <View
                                style={[
                                  styles.livePulseDot,
                                  { backgroundColor: "#10B981" },
                                ]}
                              />
                              <Text style={styles.activePillTextEating}>
                                ACTIVE NOW
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.inactivePill}>
                              <Text style={styles.inactivePillText}>
                                Next:{" "}
                                {formatClockHour(fastingWindowState.startH)}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Timing */}
                        <Text style={styles.windowDetailTime}>
                          {formatClockHour(fastingWindowState.startH)} –{" "}
                          {formatClockHour(fastingWindowState.endH)}{" "}
                          <Text style={styles.windowDetailDurationText}>
                            ({fastingWindowState.eatingDuration}h)
                          </Text>
                        </Text>

                        {/* Reminder text below timing */}
                        <View style={styles.windowDetailReminderRow}>
                          <Ionicons
                            name="notifications-outline"
                            size={12}
                            color={
                              fastingWindowState.isEating
                                ? "#059669"
                                : PALETTE.textMuted
                            }
                          />
                          <Text style={styles.reminderHighlightEating}>
                            Reminders every 1h
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Explicit Stop Fasting Action */}
                    <TouchableOpacity
                      style={styles.stopFastingFooterBtn}
                      onPress={confirmStopFasting}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name="stop-circle-outline"
                        size={15}
                        color="#DC2626"
                      />
                      <Text style={styles.stopFastingFooterBtnText}>
                        Stop Fasting
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Fasting Inactive Banner */
                  <View style={styles.fastingInactiveCard}>
                    <View style={styles.inactiveIconCircle}>
                      <Ionicons
                        name="timer-outline"
                        size={26}
                        color="#6366F1"
                      />
                    </View>
                    <Text style={styles.fastingInactiveTitle}>
                      Fasting Window Paused
                    </Text>
                    <Text style={styles.fastingInactiveSubtitle}>
                      Activate your {profile.fastingProtocol} protocol to start
                      your live circular autophagy countdown and smart interval
                      reminders.
                    </Text>
                    <TouchableOpacity
                      style={styles.activateFastingButton}
                      onPress={toggleFastingActive}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={15} color="#FFFFFF" />
                      <Text style={styles.activateFastingButtonText}>
                        Activate Fasting Window ({profile.fastingProtocol})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {/* TAB 2: SUPPLEMENT PROTOCOL STACK */}
        {activeTab === "stack" &&
          (() => {
            const activeSupplements =
              profile.supplements || DEFAULT_SUPPLEMENTS;
            const totalSuppCount = activeSupplements.length;
            const completedSuppCount = activeSupplements.filter(
              (s) => !!profile.supplementsDone[s.id],
            ).length;
            const completionPercentage =
              totalSuppCount > 0
                ? Math.round((completedSuppCount / totalSuppCount) * 100)
                : 0;
            const activeRemindersCount = activeSupplements.filter(
              (s) => s.reminderEnabled,
            ).length;

            const TIMING_GROUPS = [
              {
                key: "morning" as const,
                title: "Morning Cellular Stack",
                subtitle: "Take with breakfast & healthy fats",
                icon: "sunny" as const,
                iconColor: "#F59E0B",
                bgLight: "#FFFBEB",
              },
              {
                key: "afternoon" as const,
                title: "Afternoon Energy Stack",
                subtitle: "Midday cellular sustain & cognition",
                icon: "partly-sunny" as const,
                iconColor: "#0284C7",
                bgLight: "#F0F9FF",
              },
              {
                key: "evening" as const,
                title: "Evening Metabolic Stack",
                subtitle: "Take with dinner or post-workout",
                icon: "fitness" as const,
                iconColor: "#059669",
                bgLight: "#ECFDF5",
              },
              {
                key: "bedtime" as const,
                title: "Bedtime Deep Repair Stack",
                subtitle: "Take 30-45 mins before sleep",
                icon: "moon" as const,
                iconColor: "#6366F1",
                bgLight: "#EEF2FF",
              },
            ];

            return (
              <View style={styles.stackContainer}>
                {/* Streak & Adherence Header */}
                <View style={styles.streakHeaderCard}>
                  <View style={styles.streakTopRow}>
                    <View style={styles.streakBadge}>
                      <Text style={styles.streakFire}>🔥</Text>
                      <Text style={styles.streakNumber}>
                        {profile.supplementStreak} Days Streak
                      </Text>
                    </View>
                    <View style={styles.adherenceBadge}>
                      <Text style={styles.adherenceText}>
                        {completionPercentage}% Today ({completedSuppCount}/
                        {totalSuppCount})
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.streakTitle}>Daily Longevity Stack</Text>
                  <Text style={styles.streakSub}>
                    Clinically formulated cellular activators, sirtuins &
                    personalized longevity supplements.
                  </Text>

                  {/* Adherence Progress Bar */}
                  <View style={styles.suppProgressBarTrack}>
                    <View
                      style={[
                        styles.suppProgressBarFill,
                        { width: `${Math.max(5, completionPercentage)}%` },
                        completionPercentage === 100 && {
                          backgroundColor: "#10B981",
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.suppHeaderActionRow}>
                    <View style={styles.suppActiveNotifBadge}>
                      <Ionicons
                        name={
                          activeRemindersCount > 0
                            ? "notifications"
                            : "notifications-off"
                        }
                        size={13}
                        color={activeRemindersCount > 0 ? "#4F46E5" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.suppActiveNotifText,
                          activeRemindersCount > 0 && { color: "#4F46E5" },
                        ]}
                      >
                        {activeRemindersCount} Reminders Active
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.addSuppHeaderBtn}
                      onPress={() => openAddSupplementModal("morning")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.addSuppHeaderBtnText}>
                        Add Supplement
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Timing Filter Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suppFilterScroll}
                >
                  {(
                    [
                      { key: "all", label: `All (${totalSuppCount})` },
                      {
                        key: "morning",
                        label: `Morning (${activeSupplements.filter((s) => s.timing === "morning").length})`,
                      },
                      {
                        key: "afternoon",
                        label: `Afternoon (${activeSupplements.filter((s) => s.timing === "afternoon").length})`,
                      },
                      {
                        key: "evening",
                        label: `Evening (${activeSupplements.filter((s) => s.timing === "evening").length})`,
                      },
                      {
                        key: "bedtime",
                        label: `Bedtime (${activeSupplements.filter((s) => s.timing === "bedtime").length})`,
                      },
                    ] as const
                  ).map((tab) => {
                    const isActive = activeSuppFilter === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[
                          styles.suppFilterChip,
                          isActive && styles.suppFilterChipActive,
                        ]}
                        onPress={() => setActiveSuppFilter(tab.key)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.suppFilterChipText,
                            isActive && styles.suppFilterChipTextActive,
                          ]}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* SECTIONS BY TIMING */}
                {TIMING_GROUPS.map((group) => {
                  if (
                    activeSuppFilter !== "all" &&
                    activeSuppFilter !== group.key
                  ) {
                    return null;
                  }

                  const groupItems = activeSupplements.filter(
                    (s) => s.timing === group.key,
                  );

                  return (
                    <View key={group.key} style={styles.stackSection}>
                      <View style={styles.stackTimeRow}>
                        <View
                          style={[
                            styles.stackTimeIconCircle,
                            { backgroundColor: group.bgLight },
                          ]}
                        >
                          <Ionicons
                            name={group.icon as any}
                            size={16}
                            color={group.iconColor}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stackTimeTitle}>
                            {group.title}
                          </Text>
                          <Text style={styles.stackTimeSub}>
                            {group.subtitle}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.sectionAddMiniBtn}
                          onPress={() => openAddSupplementModal(group.key)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add" size={14} color="#4F46E5" />
                          <Text style={styles.sectionAddMiniText}>Add</Text>
                        </TouchableOpacity>
                      </View>

                      {groupItems.length === 0 ? (
                        <TouchableOpacity
                          style={styles.emptyGroupCard}
                          onPress={() => openAddSupplementModal(group.key)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color="#94A3B8"
                          />
                          <Text style={styles.emptyGroupText}>
                            No supplements scheduled for{" "}
                            {group.title.toLowerCase()}.
                          </Text>
                          <Text style={styles.emptyGroupActionText}>
                            Tap to set timing & notification
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        groupItems.map((item) => {
                          const checked = !!profile.supplementsDone[item.id];
                          return (
                            <View
                              key={item.id}
                              style={[
                                styles.suppItemCard,
                                checked && styles.suppItemCardChecked,
                              ]}
                            >
                              <TouchableOpacity
                                style={[
                                  styles.suppCheckbox,
                                  checked && styles.suppCheckboxActive,
                                ]}
                                onPress={() => toggleSupplement(item.id)}
                                activeOpacity={0.7}
                              >
                                {checked && (
                                  <Ionicons
                                    name="checkmark"
                                    size={16}
                                    color="#FFFFFF"
                                  />
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{ flex: 1 }}
                                onPress={() => toggleSupplement(item.id)}
                                activeOpacity={0.7}
                              >
                                <View
                                  style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 6,
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.suppName,
                                      checked && styles.suppTextChecked,
                                    ]}
                                  >
                                    {item.name}
                                  </Text>
                                  <View style={styles.suppDoseBadge}>
                                    <Text style={styles.suppDoseText}>
                                      {item.dose}
                                    </Text>
                                  </View>
                                </View>

                                {item.role ? (
                                  <Text
                                    style={[
                                      styles.suppRole,
                                      checked && { color: "#065F46" },
                                    ]}
                                  >
                                    {item.role}
                                  </Text>
                                ) : null}

                                {/* Timing & Notification Reminder Badge */}
                                <View style={styles.suppMetaBar}>
                                  <TouchableOpacity
                                    style={[
                                      styles.suppReminderPill,
                                      item.reminderEnabled
                                        ? styles.suppReminderPillActive
                                        : styles.suppReminderPillInactive,
                                    ]}
                                    onPress={() =>
                                      toggleSupplementReminder(item.id)
                                    }
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons
                                      name={
                                        item.reminderEnabled
                                          ? "notifications"
                                          : "notifications-off"
                                      }
                                      size={12}
                                      color={
                                        item.reminderEnabled
                                          ? "#4F46E5"
                                          : "#94A3B8"
                                      }
                                    />
                                    <Text
                                      style={[
                                        styles.suppReminderPillText,
                                        item.reminderEnabled
                                          ? styles.suppReminderPillTextActive
                                          : styles.suppReminderPillTextInactive,
                                      ]}
                                    >
                                      {formatSupplementTime(
                                        item.timeHour,
                                        item.timeMinute,
                                      )}
                                      {item.reminderEnabled
                                        ? " • Alert On"
                                        : " • Off"}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </TouchableOpacity>

                              {/* Actions: Edit & Delete */}
                              <View style={styles.suppActionsColumn}>
                                <TouchableOpacity
                                  style={styles.suppActionIconButton}
                                  onPress={() => openEditSupplementModal(item)}
                                  hitSlop={{
                                    top: 8,
                                    bottom: 8,
                                    left: 8,
                                    right: 8,
                                  }}
                                >
                                  <Ionicons
                                    name="pencil"
                                    size={15}
                                    color="#64748B"
                                  />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.suppActionIconButton}
                                  onPress={() =>
                                    handleDeleteSupplement(item.id, item.name)
                                  }
                                  hitSlop={{
                                    top: 8,
                                    bottom: 8,
                                    left: 8,
                                    right: 8,
                                  }}
                                >
                                  <Ionicons
                                    name="trash-outline"
                                    size={15}
                                    color="#EF4444"
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })()}

        {/* TAB 3: CLINICAL PANELS & DOCTOR CARE */}
        {activeTab === "clinical" && (
          <View style={styles.clinicalContainer}>
            {/* Card 1: Book Doctor Appointment */}
            <View style={styles.clinicalActionCard}>
              <View style={styles.clinicalIconCircle}>
                <Ionicons name="calendar" size={24} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clinicalCardTitle}>
                  Book Doctor Appointment
                </Text>
                <Text style={styles.clinicalCardSub}>
                  Schedule a 1-on-1 virtual consultation with certified
                  longevity physicians for comprehensive biological age analysis
                  & cellular health optimization.
                </Text>
                <TouchableOpacity
                  style={styles.clinicalActionBtn}
                  onPress={() => {
                    setSelectedPlanTitle("");
                    setShowConsultModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clinicalActionBtnText}>
                    Book Appointment
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Card 2: View Treatment Plan */}
            <View style={styles.clinicalActionCard}>
              <View
                style={[
                  styles.clinicalIconCircle,
                  { backgroundColor: "#EEF2FF" },
                ]}
              >
                <Ionicons name="document-text" size={24} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clinicalCardTitle}>
                  View Treatment Plan
                </Text>
                <Text style={styles.clinicalCardSub}>
                  Clinician-designed longevity programs, annual memberships,
                  advanced biomarker testing & personalized therapy plans.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.clinicalActionBtn,
                    { backgroundColor: "#4F46E5" },
                  ]}
                  onPress={() => setShowTreatmentModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clinicalActionBtnText}>
                    View Treatment Plan
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL 1: RECALCULATE BIO-AGE */}
      <Modal
        visible={showBioModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBioModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { maxHeight: "90%", paddingBottom: 16 },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Biological Age Assessment</Text>
                <Text style={styles.modalSub}>
                  DunedinPACE & PhenoAge algorithmic lifestyle model
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowBioModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 14, paddingBottom: 10 }}
            >
              {/* Linked Profile Vitals Card (Height, Weight, BMI) */}
              <View style={styles.modalProfileCard}>
                <View style={styles.modalProfileHeader}>
                  <Ionicons
                    name="person-circle-outline"
                    size={16}
                    color={PALETTE.primary}
                  />
                  <Text style={styles.modalProfileTitle}>
                    Linked Profile Vitals
                  </Text>
                </View>
                {userHeight && userWeight ? (
                  <View>
                    <Text style={styles.modalProfileStats}>
                      Height:{" "}
                      <Text
                        style={{
                          fontWeight: "700",
                          color: PALETTE.textPrimary,
                        }}
                      >
                        {userHeight} cm
                      </Text>{" "}
                      • Weight:{" "}
                      <Text
                        style={{
                          fontWeight: "700",
                          color: PALETTE.textPrimary,
                        }}
                      >
                        {userWeight} kg
                      </Text>
                    </Text>
                    {userBmi && bmiCategory && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <Text style={styles.modalProfileStats}>
                          BMI:{" "}
                          <Text
                            style={{
                              fontWeight: "700",
                              color: PALETTE.textPrimary,
                            }}
                          >
                            {userBmi}
                          </Text>
                        </Text>
                        <View
                          style={[
                            styles.modalProfileBadge,
                            { backgroundColor: `${bmiCategory.color}20` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalProfileBadgeText,
                              { color: bmiCategory.color },
                            ]}
                          >
                            {bmiCategory.label}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.modalProfileStats,
                      { fontStyle: "italic", fontSize: 11.5 },
                    ]}
                  >
                    Height & weight from your Profile section will automatically
                    tune metabolic age.
                  </Text>
                )}
              </View>

              {/* Input 1: Chronological Age */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>
                  Your Current Chronological Age
                </Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={calcChrono}
                  onChangeText={setCalcChrono}
                  keyboardType="numeric"
                  placeholder="e.g. 38"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Input 2: Daily Sleep Duration (Hours) */}
              <View style={styles.modalInputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.modalInputLabel}>
                    Daily Sleep Duration (Hours/Night)
                  </Text>
                  <Text style={styles.modalSliderValue}>
                    {calcSleepHours} hrs
                  </Text>
                </View>
                <View style={styles.pillSelectorRow}>
                  {[
                    { key: "<6", label: "< 6h" },
                    { key: "6-7", label: "6–7h" },
                    { key: "7-8", label: "7–8h" },
                    { key: "8-9", label: "8–9h" },
                    { key: ">9", label: "> 9h" },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.scorePillSmall,
                        calcSleepHours === item.key && styles.scorePillActive,
                      ]}
                      onPress={() => setCalcSleepHours(item.key as any)}
                    >
                      <Text
                        style={[
                          styles.scorePillSmallText,
                          calcSleepHours === item.key &&
                            styles.scorePillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Input 3: Resting Heart Rate (bpm) */}
              <View style={styles.modalInputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.modalInputLabel}>
                    Resting Heart Rate (Watch / Pulse)
                  </Text>
                  <Text style={styles.modalSliderValue}>{calcRhr} bpm</Text>
                </View>
                <View style={styles.pillSelectorRow}>
                  {[
                    { val: 52, label: "< 55" },
                    { val: 60, label: "55–65" },
                    { val: 70, label: "66–75" },
                    { val: 80, label: "76–85" },
                    { val: 88, label: "> 85" },
                  ].map((item) => {
                    const isSelected =
                      (item.val === 52 && calcRhr < 55) ||
                      (item.val === 60 && calcRhr >= 55 && calcRhr <= 65) ||
                      (item.val === 70 && calcRhr >= 66 && calcRhr <= 75) ||
                      (item.val === 80 && calcRhr >= 76 && calcRhr <= 85) ||
                      (item.val === 88 && calcRhr > 85);
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[
                          styles.scorePillSmall,
                          isSelected && styles.scorePillActive,
                        ]}
                        onPress={() => setCalcRhr(item.val)}
                      >
                        <Text
                          style={[
                            styles.scorePillSmallText,
                            isSelected && styles.scorePillTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Input 4: Strength / Resistance Training */}
              <View style={styles.modalInputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.modalInputLabel}>
                    Strength / Resistance Training
                  </Text>
                  <Text style={styles.modalSliderValue}>
                    {calcStrengthDays === 0
                      ? "0 days"
                      : calcStrengthDays === 1
                        ? "1–2 days"
                        : calcStrengthDays === 2
                          ? "3–4 days"
                          : "5+ days"}
                  </Text>
                </View>
                <View style={styles.pillSelectorRow}>
                  {[
                    { key: 0, label: "0 days" },
                    { key: 1, label: "1–2 days" },
                    { key: 2, label: "3–4 days" },
                    { key: 3, label: "5+ days" },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.scorePillSmall,
                        calcStrengthDays === item.key && styles.scorePillActive,
                      ]}
                      onPress={() => setCalcStrengthDays(item.key)}
                    >
                      <Text
                        style={[
                          styles.scorePillSmallText,
                          calcStrengthDays === item.key &&
                            styles.scorePillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Input 5: Daily Step Count / Walking */}
              <View style={styles.modalInputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.modalInputLabel}>
                    Average Daily Step Count
                  </Text>
                  <Text style={styles.modalSliderValue}>
                    {calcDailySteps === "<4k"
                      ? "< 4,000"
                      : calcDailySteps === "4k-7k"
                        ? "4,000–7,000"
                        : calcDailySteps === "8k-10k"
                          ? "8,000–10,000"
                          : "10,000+"}
                  </Text>
                </View>
                <View style={styles.pillSelectorRow}>
                  {[
                    { key: "<4k", label: "< 4k" },
                    { key: "4k-7k", label: "4k–7k" },
                    { key: "8k-10k", label: "8k–10k" },
                    { key: "10k+", label: "10k+" },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.scorePillSmall,
                        calcDailySteps === item.key && styles.scorePillActive,
                      ]}
                      onPress={() => setCalcDailySteps(item.key as any)}
                    >
                      <Text
                        style={[
                          styles.scorePillSmallText,
                          calcDailySteps === item.key &&
                            styles.scorePillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Input 6: Cardio / Aerobic Fitness */}
              <View style={styles.modalInputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.modalInputLabel}>
                    Cardio & Aerobic Fitness Level
                  </Text>
                  <Text style={styles.modalSliderValue}>
                    {calcFitnessLevel === 1
                      ? "Sedentary"
                      : calcFitnessLevel === 2
                        ? "Light"
                        : calcFitnessLevel === 3
                          ? "Active"
                          : "Peak VO2"}
                  </Text>
                </View>
                <View style={styles.pillSelectorRow}>
                  {[
                    { key: 1, label: "Sedentary" },
                    { key: 2, label: "Light" },
                    { key: 3, label: "Active" },
                    { key: 4, label: "Peak VO2" },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.scorePillSmall,
                        calcFitnessLevel === item.key && styles.scorePillActive,
                      ]}
                      onPress={() => setCalcFitnessLevel(item.key)}
                    >
                      <Text
                        style={[
                          styles.scorePillSmallText,
                          calcFitnessLevel === item.key &&
                            styles.scorePillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Input 7: Intermittent Fasting Frequency */}
              <View style={styles.modalInputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.modalInputLabel}>
                    Intermittent Fasting Days / Week
                  </Text>
                  <Text style={styles.modalSliderValue}>
                    {calcFastingDays} days
                  </Text>
                </View>
                <View style={styles.pillSelectorRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.scorePill,
                        calcFastingDays === num && styles.scorePillActive,
                      ]}
                      onPress={() => setCalcFastingDays(num)}
                    >
                      <Text
                        style={[
                          styles.scorePillText,
                          calcFastingDays === num && styles.scorePillTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Input 8: Smoking / Nicotine Status */}
              <View style={styles.modalInputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.modalInputLabel}>
                    Smoking & Tobacco Status
                  </Text>
                  <Text style={styles.modalSliderValue}>
                    {calcSmoking === "never"
                      ? "Never"
                      : calcSmoking === "former"
                        ? "Former"
                        : calcSmoking === "occasional"
                          ? "Vape/Occas"
                          : "Daily Smoker"}
                  </Text>
                </View>
                <View style={styles.pillSelectorRow}>
                  {[
                    { key: "never", label: "Never" },
                    { key: "former", label: "Former" },
                    { key: "occasional", label: "Vape/Occas" },
                    { key: "daily", label: "Daily" },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.scorePillSmall,
                        calcSmoking === item.key && styles.scorePillActive,
                      ]}
                      onPress={() => setCalcSmoking(item.key as any)}
                    >
                      <Text
                        style={[
                          styles.scorePillSmallText,
                          calcSmoking === item.key &&
                            styles.scorePillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Input 9: Alcohol Consumption */}
              <View style={styles.modalInputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.modalInputLabel}>
                    Alcohol Intake (Drinks / Week)
                  </Text>
                  <Text style={styles.modalSliderValue}>
                    {calcAlcohol === "none"
                      ? "0 (None)"
                      : calcAlcohol === "1-3"
                        ? "1–3 drinks"
                        : calcAlcohol === "4-7"
                          ? "4–7 drinks"
                          : calcAlcohol === "8-14"
                            ? "8–14 drinks"
                            : "15+ drinks"}
                  </Text>
                </View>
                <View style={styles.pillSelectorRow}>
                  {[
                    { key: "none", label: "0 (None)" },
                    { key: "1-3", label: "1–3" },
                    { key: "4-7", label: "4–7" },
                    { key: "8-14", label: "8–14" },
                    { key: "15+", label: "15+" },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.scorePillSmall,
                        calcAlcohol === item.key && styles.scorePillActive,
                      ]}
                      onPress={() => setCalcAlcohol(item.key as any)}
                    >
                      <Text
                        style={[
                          styles.scorePillSmallText,
                          calcAlcohol === item.key &&
                            styles.scorePillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Accuracy & Clinical Disclaimer Notice */}
              <View style={styles.modalDisclaimerBox}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color="#D97706"
                  style={{ marginTop: 1 }}
                />
                <Text style={styles.modalDisclaimerText}>
                  <Text style={{ fontWeight: "700" }}>Please Note: </Text>
                  This biological age is an educational estimate calculated
                  entirely from your self-reported inputs. It should not replace
                  medical advice, and actual clinical results (e.g. DNA
                  methylation or blood biomarker tests) may vary.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleRecalculateBioAge}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveBtnText}>
                  Compute New Biological Age
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: FASTING & EATING WINDOW SCHEDULE */}
      <Modal
        visible={showFastingScheduleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFastingScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View
                  style={[
                    styles.cardHeaderIconBg,
                    {
                      backgroundColor: PALETTE.emeraldLight,
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                    },
                  ]}
                >
                  <Ionicons name="flame" size={16} color={PALETTE.emerald} />
                </View>
                <Text style={styles.modalTitle}>Fasting & Eating Times</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFastingScheduleModal(false)}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Select your fasting and eating times. Automated reminders will
              help you continue your fast with confidence.
            </Text>

            {/* Protocol Selector in Modal (Single Select) */}
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>
                Select Protocol (Choose One)
              </Text>
              <View style={styles.modalProtocolRow}>
                {(["16:8", "18:6", "OMAD"] as const).map((proto) => {
                  const isSelected = profile.fastingProtocol === proto;
                  return (
                    <TouchableOpacity
                      key={proto}
                      style={[
                        styles.modalProtocolBtn,
                        isSelected && styles.modalProtocolBtnActive,
                      ]}
                      onPress={() => {
                        const dur = getProtocolEatingHours(proto);
                        const endH = (selectedEatingStart + dur) % 24;
                        saveProfile({
                          ...profile,
                          fastingProtocol: proto,
                          eatingStartHour: selectedEatingStart,
                          eatingEndHour: endH,
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={12}
                            color={PALETTE.emerald}
                          />
                        )}
                        <Text
                          style={[
                            styles.modalProtocolBtnText,
                            isSelected && styles.modalProtocolBtnTextActive,
                          ]}
                        >
                          {proto}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.modalProtocolSubText,
                          isSelected && styles.modalProtocolSubTextActive,
                        ]}
                      >
                        {proto === "OMAD"
                          ? "23h / 1h"
                          : `${getProtocolFastingHours(proto)}h / ${getProtocolEatingHours(proto)}h`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Eating Window Start Selector */}
            <View style={styles.modalInputGroup}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <Text style={styles.modalInputLabel}>
                  Eating Window Starts At
                </Text>
                <Text style={styles.modalTimeHighlight}>
                  {formatClockHour(selectedEatingStart)}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeChipsScroll}
              >
                {[9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20].map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.timeChip,
                      selectedEatingStart === hour && styles.timeChipActive,
                    ]}
                    onPress={() => setSelectedEatingStart(hour)}
                  >
                    <Text
                      style={[
                        styles.timeChipText,
                        selectedEatingStart === hour &&
                          styles.timeChipTextActive,
                      ]}
                    >
                      {formatClockHour(hour)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Calculated Schedule Summary Box */}
            <View style={styles.modalScheduleSummaryBox}>
              <View style={styles.modalScheduleSummaryRow}>
                <Ionicons
                  name="restaurant-outline"
                  size={16}
                  color={PALETTE.emerald}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalScheduleSummaryTitle}>
                    Eating Window (
                    {getProtocolEatingHours(profile.fastingProtocol)}h)
                  </Text>
                  <Text style={styles.modalScheduleSummaryVal}>
                    {formatClockHour(selectedEatingStart)} –{" "}
                    {formatClockHour(
                      (selectedEatingStart +
                        getProtocolEatingHours(profile.fastingProtocol)) %
                        24,
                    )}
                  </Text>
                </View>
                <View style={styles.modalReminderFreqBadge}>
                  <Text style={styles.modalReminderFreqText}>
                    Every 1 hr 🔔
                  </Text>
                </View>
              </View>

              <View style={styles.modalSummaryDivider} />

              <View style={styles.modalScheduleSummaryRow}>
                <Ionicons name="flame-outline" size={16} color="#6366F1" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalScheduleSummaryTitle}>
                    Fasting Window (
                    {getProtocolFastingHours(profile.fastingProtocol)}h)
                  </Text>
                  <Text style={styles.modalScheduleSummaryVal}>
                    {formatClockHour(
                      (selectedEatingStart +
                        getProtocolEatingHours(profile.fastingProtocol)) %
                        24,
                    )}{" "}
                    – {formatClockHour(selectedEatingStart)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.modalReminderFreqBadge,
                    { backgroundColor: "#EEF2FF" },
                  ]}
                >
                  <Text
                    style={[styles.modalReminderFreqText, { color: "#4F46E5" }]}
                  >
                    Every 2 hrs 🔔
                  </Text>
                </View>
              </View>
            </View>

            {/* Notification explanation note */}
            <View style={styles.modalNotificationNote}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#64748B"
              />
              <Text style={styles.modalNotificationNoteText}>
                During fasting: reminder every 2 hours (cellular autophagy
                progress & hydration). During eating: reminder every 1 hour to
                stay on track.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={() => handleSaveFastingSchedule(selectedEatingStart)}
              disabled={isSyncingNotifs}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSaveBtnText}>
                {isSyncingNotifs
                  ? "Activating Reminders..."
                  : "Save & Set Reminders"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: VIEW TREATMENT PLANS (LONGEVITY_SECTIONS) */}
      <Modal
        visible={showTreatmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTreatmentModal(false)}
      >
        <View style={styles.treatmentModalOverlay}>
          <View style={styles.treatmentModalContent}>
            {/* Header */}
            <View style={styles.treatmentModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.treatmentModalTitle}>
                  Longevity Treatment Plans
                </Text>
                <Text style={styles.treatmentModalSub}>
                  Clinician-curated annual programs & diagnostic panels
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTreatmentModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.treatmentCloseBtn}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.treatmentSearchBarRow}>
              <Ionicons
                name="search"
                size={16}
                color="#64748B"
                style={{ marginLeft: 10 }}
              />
              <TextInput
                style={styles.treatmentSearchInput}
                placeholder="Search plans, biomarker panels, services..."
                placeholderTextColor="#94A3B8"
                value={treatmentSearchQuery}
                onChangeText={setTreatmentSearchQuery}
              />
              {treatmentSearchQuery ? (
                <TouchableOpacity
                  onPress={() => setTreatmentSearchQuery("")}
                  style={{ marginRight: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Category Tab Pills */}
            <View style={styles.treatmentTabPillsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.treatmentTabPillsContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.treatmentTabPill,
                    treatmentTab === "all" && styles.treatmentTabPillActive,
                  ]}
                  onPress={() => setTreatmentTab("all")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.treatmentTabPillText,
                      treatmentTab === "all" &&
                        styles.treatmentTabPillTextActive,
                    ]}
                  >
                    All (
                    {LONGEVITY_SECTIONS.reduce(
                      (acc, s) => acc + s.items.length,
                      0,
                    )}
                    )
                  </Text>
                </TouchableOpacity>

                {LONGEVITY_SECTIONS.map((sec) => {
                  const isActive = treatmentTab === sec.id;
                  return (
                    <TouchableOpacity
                      key={sec.id}
                      style={[
                        styles.treatmentTabPill,
                        isActive && styles.treatmentTabPillActive,
                      ]}
                      onPress={() => setTreatmentTab(sec.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.treatmentTabPillText,
                          isActive && styles.treatmentTabPillTextActive,
                        ]}
                      >
                        {sec.title.split(" ")[0]} ({sec.items.length})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Treatment Plans List */}
            <ScrollView
              style={styles.treatmentListScroll}
              contentContainerStyle={styles.treatmentListContent}
              showsVerticalScrollIndicator={true}
            >
              {LONGEVITY_SECTIONS.map((section) => {
                if (treatmentTab !== "all" && treatmentTab !== section.id)
                  return null;

                const matchingItems = section.items.filter((item) => {
                  if (!treatmentSearchQuery.trim()) return true;
                  const q = treatmentSearchQuery.toLowerCase();
                  return (
                    item.name.toLowerCase().includes(q) ||
                    item.details.toLowerCase().includes(q) ||
                    item.price.toLowerCase().includes(q) ||
                    (item.frequency &&
                      item.frequency.toLowerCase().includes(q)) ||
                    (item.badge && item.badge.toLowerCase().includes(q))
                  );
                });

                if (matchingItems.length === 0) return null;

                return (
                  <View key={section.id} style={styles.treatmentSectionGroup}>
                    {/* Section Header */}
                    <View style={styles.treatmentSectionTitleRow}>
                      <View style={styles.treatmentSectionIconDot} />
                      <Text style={styles.treatmentSectionTitleText}>
                        {section.title}
                      </Text>
                      <View style={styles.treatmentSectionBadge}>
                        <Text style={styles.treatmentSectionBadgeText}>
                          {matchingItems.length} items
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.treatmentSectionSubtitleText}>
                      {section.subtitle}
                    </Text>

                    {/* Section Item Cards */}
                    {matchingItems.map((item) => (
                      <View key={item.id} style={styles.treatmentCardItem}>
                        <View style={styles.treatmentItemHeaderRow}>
                          <Text style={styles.treatmentItemNameText}>
                            {item.name}
                          </Text>
                          <View style={styles.treatmentPriceTagBadge}>
                            <Ionicons
                              name="pricetag"
                              size={11}
                              color="#FFFFFF"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.treatmentPriceTagText}>
                              {item.price}
                            </Text>
                          </View>
                        </View>

                        {(item.frequency || item.badge || item.note) && (
                          <View style={styles.treatmentMetaTagsRow}>
                            {item.frequency ? (
                              <View style={styles.treatmentFreqTag}>
                                <Ionicons
                                  name="time-outline"
                                  size={11}
                                  color="#475569"
                                />
                                <Text style={styles.treatmentFreqTagText}>
                                  {item.frequency}
                                </Text>
                              </View>
                            ) : null}
                            {item.badge ? (
                              <View style={styles.treatmentBadgeTag}>
                                <Text style={styles.treatmentBadgeTagText}>
                                  {item.badge}
                                </Text>
                              </View>
                            ) : null}
                            {item.note ? (
                              <View style={styles.treatmentNoteTag}>
                                <Text style={styles.treatmentNoteTagText}>
                                  {item.note}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        )}

                        <View style={styles.treatmentItemDetailsBox}>
                          <Text style={styles.treatmentItemDetailsText}>
                            {item.details}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.treatmentBookBtn}
                          onPress={() => {
                            setSelectedPlanTitle(item.name);
                            setShowTreatmentModal(false);
                            setShowConsultModal(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color="#4F46E5"
                          />
                          <Text style={styles.treatmentBookBtnText}>
                            Book This Plan
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color="#4F46E5"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: BOOK APPOINTMENT / CONSULTATION */}
      <Modal
        visible={showConsultModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConsultModal(false)}
      >
        <View style={styles.bookingModalOverlay}>
          <View style={styles.bookingModalContent}>
            {/* Header */}
            <View style={styles.bookingModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingModalTitle}>
                  {selectedPlanTitle
                    ? "Book Selected Plan"
                    : "Book Doctor Appointment"}
                </Text>
                <Text style={styles.bookingModalSub}>
                  {selectedPlanTitle
                    ? "Consult with longevity specialist for this protocol"
                    : "Virtual 1-on-1 consultation with certified physician"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowConsultModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.bookingScrollContent}
            >
              {/* If a plan was selected */}
              {selectedPlanTitle ? (
                <View style={styles.selectedPlanBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedPlanLabel}>
                      SELECTED PROTOCOL
                    </Text>
                    <Text style={styles.selectedPlanName}>
                      {selectedPlanTitle}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedPlanTitle("")}
                    style={styles.clearSelectedPlanBtn}
                  >
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Quick AI Doctor Chat Option */}
              <TouchableOpacity
                style={styles.aiDoctorBanner}
                onPress={() => {
                  setShowConsultModal(false);
                  router.push("/(app)/ai-doctor-chat");
                }}
                activeOpacity={0.8}
              >
                <View style={styles.aiDoctorBannerIcon}>
                  <Ionicons name="sparkles" size={18} color="#4F46E5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiDoctorBannerTitle}>
                    Instant AI Longevity Assistant
                  </Text>
                  <Text style={styles.aiDoctorBannerSub}>
                    Get immediate answers on biomarkers & lifestyle routines
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </TouchableOpacity>

              {/* Form Fields */}
              <View style={styles.bookingFieldGroup}>
                <Text style={styles.bookingFieldLabel}>Your Full Name *</Text>
                <TextInput
                  style={styles.bookingTextInput}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#94A3B8"
                  value={consultName}
                  onChangeText={setConsultName}
                />
              </View>

              <View style={styles.bookingFieldRow}>
                <View style={[styles.bookingFieldGroup, { flex: 1 }]}>
                  <Text style={styles.bookingFieldLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.bookingTextInput}
                    placeholder="e.g. +91 98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={consultPhone}
                    onChangeText={setConsultPhone}
                  />
                </View>

                <View style={[styles.bookingFieldGroup, { width: 90 }]}>
                  <Text style={styles.bookingFieldLabel}>Age *</Text>
                  <TextInput
                    style={styles.bookingTextInput}
                    placeholder="Age"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={consultAge}
                    onChangeText={setConsultAge}
                    maxLength={3}
                  />
                </View>
              </View>

              <View style={styles.bookingFieldGroup}>
                <Text style={styles.bookingFieldLabel}>Email Address *</Text>
                <TextInput
                  style={styles.bookingTextInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={consultEmail}
                  onChangeText={setConsultEmail}
                />
              </View>

              <View style={styles.bookingFieldGroup}>
                <Text style={styles.bookingFieldLabel}>
                  Notes / Primary Health Goals (Optional)
                </Text>
                <TextInput
                  style={[styles.bookingTextInput, styles.bookingTextArea]}
                  placeholder="e.g. Looking to improve VO2 max, reduce visceral fat, discuss NAD+ supplementation..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={consultNotes}
                  onChangeText={setConsultNotes}
                  textAlignVertical="top"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.bookingSubmitBtn,
                  isSubmittingConsult && { opacity: 0.7 },
                ]}
                onPress={handleSubmitConsultation}
                disabled={isSubmittingConsult}
                activeOpacity={0.8}
              >
                {isSubmittingConsult ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.bookingSubmitBtnText}>
                      Confirm & Schedule Appointment
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: ADD / EDIT SUPPLEMENT & SET TIMING */}
      <Modal
        visible={showAddSupplementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSupplementModal(false)}
      >
        <View style={styles.suppModalOverlay}>
          <View style={styles.suppModalContent}>
            {/* Header */}
            <View style={styles.suppModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.suppModalTitle}>
                  {editingSupplementId
                    ? "Edit Supplement"
                    : "Add to Supplement Stack"}
                </Text>
                <Text style={styles.suppModalSub}>
                  Set dose, purpose, and daily reminder timing
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddSupplementModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.suppModalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.suppModalScroll}
            >
              {/* Presets suggestions (only when adding new) */}
              {!editingSupplementId && (
                <View style={styles.suppPresetsSection}>
                  <Text style={styles.suppFormSectionLabel}>
                    Quick Longevity Presets
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suppPresetsScroll}
                  >
                    {SUPPLEMENT_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset.name}
                        style={[
                          styles.presetChip,
                          suppFormName === preset.name &&
                            styles.presetChipActive,
                        ]}
                        onPress={() => applyPreset(preset)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            suppFormName === preset.name &&
                              styles.presetChipTextActive,
                          ]}
                        >
                          + {preset.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Form Input: Name */}
              <View style={styles.suppFormGroup}>
                <Text style={styles.suppFormLabel}>Supplement Name *</Text>
                <TextInput
                  style={styles.suppFormInput}
                  placeholder="e.g. NMN, Vitamin D3, Creatine"
                  placeholderTextColor="#94A3B8"
                  value={suppFormName}
                  onChangeText={setSuppFormName}
                />
              </View>

              {/* Form Input: Dose */}
              <View style={styles.suppFormGroup}>
                <Text style={styles.suppFormLabel}>Dosage *</Text>
                <TextInput
                  style={styles.suppFormInput}
                  placeholder="e.g. 500 mg, 1 capsule, 2 tablets"
                  placeholderTextColor="#94A3B8"
                  value={suppFormDose}
                  onChangeText={setSuppFormDose}
                />
              </View>

              {/* Form Input: Role / Purpose */}
              <View style={styles.suppFormGroup}>
                <Text style={styles.suppFormLabel}>
                  Role / Clinical Purpose (Optional)
                </Text>
                <TextInput
                  style={styles.suppFormInput}
                  placeholder="e.g. NAD+ boost & DNA repair, deep sleep"
                  placeholderTextColor="#94A3B8"
                  value={suppFormRole}
                  onChangeText={setSuppFormRole}
                />
              </View>

              {/* Timing Category Selector */}
              <View style={styles.suppFormGroup}>
                <Text style={styles.suppFormLabel}>Timing Category</Text>
                <View style={styles.timingCategoryRow}>
                  {[
                    {
                      key: "morning" as const,
                      label: "Morning",
                      icon: "sunny",
                      defH: 8,
                      defM: 0,
                    },
                    {
                      key: "afternoon" as const,
                      label: "Afternoon",
                      icon: "partly-sunny",
                      defH: 13,
                      defM: 0,
                    },
                    {
                      key: "evening" as const,
                      label: "Evening",
                      icon: "fitness",
                      defH: 20,
                      defM: 0,
                    },
                    {
                      key: "bedtime" as const,
                      label: "Bedtime",
                      icon: "moon",
                      defH: 21,
                      defM: 30,
                    },
                  ].map((t) => {
                    const isSelected = suppFormTiming === t.key;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        style={[
                          styles.timingCategoryBtn,
                          isSelected && styles.timingCategoryBtnActive,
                        ]}
                        onPress={() => {
                          setSuppFormTiming(t.key);
                          if (!editingSupplementId) {
                            setSuppFormHour(t.defH);
                            setSuppFormMinute(t.defM);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={t.icon as any}
                          size={14}
                          color={isSelected ? "#FFFFFF" : "#64748B"}
                        />
                        <Text
                          style={[
                            styles.timingCategoryText,
                            isSelected && styles.timingCategoryTextActive,
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Reminder Timing Selector */}
              <View style={styles.suppFormGroup}>
                <View style={styles.timeLabelRow}>
                  <Text style={styles.suppFormLabel}>Reminder Alert Time</Text>
                  <View style={styles.timeDisplayBadge}>
                    <Ionicons name="alarm" size={13} color="#4F46E5" />
                    <Text style={styles.timeDisplayText}>
                      {formatSupplementTime(suppFormHour, suppFormMinute)}
                    </Text>
                  </View>
                </View>

                {/* Quick hour selector chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hourChipsScroll}
                >
                  {[
                    { h: 6, m: 0 },
                    { h: 7, m: 0 },
                    { h: 8, m: 0 },
                    { h: 8, m: 30 },
                    { h: 9, m: 0 },
                    { h: 12, m: 0 },
                    { h: 13, m: 0 },
                    { h: 14, m: 0 },
                    { h: 18, m: 0 },
                    { h: 19, m: 30 },
                    { h: 20, m: 0 },
                    { h: 21, m: 0 },
                    { h: 21, m: 30 },
                    { h: 22, m: 0 },
                  ].map((chip) => {
                    const isMatch =
                      suppFormHour === chip.h && suppFormMinute === chip.m;
                    return (
                      <TouchableOpacity
                        key={`${chip.h}:${chip.m}`}
                        style={[
                          styles.timeChipButton,
                          isMatch && styles.timeChipButtonActive,
                        ]}
                        onPress={() => {
                          setSuppFormHour(chip.h);
                          setSuppFormMinute(chip.m);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.timeChipButtonText,
                            isMatch && styles.timeChipButtonTextActive,
                          ]}
                        >
                          {formatSupplementTime(chip.h, chip.m)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Push Notification Toggle Switch */}
              <View style={styles.notifSwitchRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.notifSwitchTitle}>
                    Daily Push Notification
                  </Text>
                  <Text style={styles.notifSwitchSub}>
                    Receive a prompt at{" "}
                    {formatSupplementTime(suppFormHour, suppFormMinute)} to take
                    this supplement
                  </Text>
                </View>
                <Switch
                  value={suppFormReminder}
                  onValueChange={setSuppFormReminder}
                  trackColor={{ false: "#CBD5E1", true: "#818CF8" }}
                  thumbColor={suppFormReminder ? "#4F46E5" : "#F8FAFC"}
                />
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.saveSuppSubmitBtn}
                onPress={handleSaveSupplement}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveSuppSubmitBtnText}>
                  {editingSupplementId
                    ? "Update Supplement"
                    : "Add to Stack & Set Alert"}
                </Text>
              </TouchableOpacity>

              {editingSupplementId && (
                <TouchableOpacity
                  style={styles.deleteSuppBtn}
                  onPress={() => {
                    setShowAddSupplementModal(false);
                    handleDeleteSupplement(editingSupplementId, suppFormName);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.deleteSuppBtnText}>
                    Delete this Supplement
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: BOOK BIOMARKER TEST */}
      <BookBiomarkerTestModal
        visible={showBookBiomarkerTestModal}
        onClose={() => setShowBookBiomarkerTestModal(false)}
        onBookingSuccess={handleBookingBiomarkerSuccess}
        initialName={consultName}
        initialPhone={consultPhone}
        initialAge={consultAge || String(profile.chronoAge)}
      />

      {/* MODAL 7: UPLOAD BIOMARKER REPORT & PHENOAGE CALCULATION */}
      <UploadBiomarkerReportModal
        visible={showUploadBiomarkerReportModal}
        onClose={() => setShowUploadBiomarkerReportModal(false)}
        chronoAge={profile.chronoAge}
        initialBiomarkers={profile.biomarkersData}
        onReportSuccess={handleReportUploadSuccess}
      />

      {isUserPrimaryGoal && (
        <VerticalGoalBottomNav goal={goalInfo} activeTab="goal" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  subHeaderNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  subHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  titleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerCategoryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.2,
  },
  proPill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: PALETTE.primary,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    marginHorizontal: 8,
    marginTop: 10,
    marginBottom: 6,
    padding: 4,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: PALETTE.primary,
    paddingHorizontal: 10,
    shadowColor: PALETTE.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  contentScroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
    gap: 16,
  },
  // BIO AGE CARD
  bioCard: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#D3D3FF",
    borderWidth: 1.5,
    borderColor: "#BFBFFF",
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  bioCardGradient: {
    padding: 16,
    gap: 10,
  },
  bioCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bioCardCategory: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.6,
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
  bioCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(79, 70, 229, 0.15)",
  },
  chronoInfoBox: {
    gap: 2,
  },
  chronoInfoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  chronoInfoValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1E1B4B",
  },
  recalcBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFBFFF",
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  recalcBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4F46E5",
  },
  bioCardDisclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    marginTop: 2,
  },
  bioCardDisclaimerText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#4338CA",
    flex: 1,
    lineHeight: 14,
  },
  // FASTING CARD
  fastingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  fastingHeaderCol: {
    gap: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardHeaderTextCol: {
    flex: 1,
  },
  cardHeaderIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PALETTE.textPrimary,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 2,
  },
  fastingProtocolSegment: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  protocolSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  protocolSegmentBtnActive: {
    backgroundColor: PALETTE.emerald,
    shadowColor: PALETTE.emerald,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  protocolSegmentText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  protocolSegmentTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // BIOMARKER 2x2 GRID
  biomarkerSection: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PALETTE.textPrimary,
  },
  sectionSubtitleTap: {
    fontSize: 11,
    color: PALETTE.primary,
    fontWeight: "600",
  },
  biomarkerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  biomarkerCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  biomarkerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  biomarkerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  biomarkerStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  biomarkerStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  biomarkerValue: {
    fontSize: 22,
    fontWeight: "900",
    color: PALETTE.textPrimary,
  },
  biomarkerUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: PALETTE.textMuted,
  },
  biomarkerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.textPrimary,
  },
  biomarkerSub: {
    fontSize: 10.5,
    color: PALETTE.textMuted,
  },
  // STACK TAB
  stackContainer: {
    gap: 16,
  },
  streakHeaderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    gap: 8,
  },
  streakTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  streakFire: {
    fontSize: 14,
  },
  streakNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97706",
  },
  adherenceBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adherenceText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: PALETTE.textPrimary,
  },
  streakSub: {
    fontSize: 12,
    color: PALETTE.textMuted,
  },
  suppProgressBarTrack: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 4,
  },
  suppProgressBarFill: {
    height: "100%",
    backgroundColor: PALETTE.primary,
    borderRadius: 4,
  },
  suppHeaderActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  suppActiveNotifBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  suppActiveNotifText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  addSuppHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PALETTE.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addSuppHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  suppFilterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  suppFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  suppFilterChipActive: {
    backgroundColor: PALETTE.primary,
    borderColor: PALETTE.primary,
  },
  suppFilterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  suppFilterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  stackSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    gap: 12,
  },
  stackTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  stackTimeIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stackTimeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: PALETTE.textPrimary,
  },
  stackTimeSub: {
    fontSize: 11,
    color: PALETTE.textMuted,
  },
  sectionAddMiniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sectionAddMiniText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  emptyGroupCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    gap: 4,
  },
  emptyGroupText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  emptyGroupActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#4F46E5",
  },
  suppItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  suppItemCardChecked: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  suppCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  suppCheckboxActive: {
    backgroundColor: PALETTE.emerald,
    borderColor: PALETTE.emerald,
  },
  suppName: {
    fontSize: 13,
    fontWeight: "700",
    color: PALETTE.textPrimary,
    flex: 1,
  },
  suppTextChecked: {
    color: "#065F46",
  },
  suppDoseBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  suppDoseText: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.primary,
  },
  suppRole: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  suppMetaBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  suppReminderPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  suppReminderPillActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
  },
  suppReminderPillInactive: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  suppReminderPillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  suppReminderPillTextActive: {
    color: "#4F46E5",
  },
  suppReminderPillTextInactive: {
    color: "#94A3B8",
  },
  suppActionsColumn: {
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  suppActionIconButton: {
    padding: 4,
  },

  // ADD / EDIT SUPPLEMENT MODAL STYLES
  suppModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  suppModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 28,
    maxHeight: "92%",
  },
  suppModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  suppModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  suppModalSub: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  suppModalCloseBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  suppModalScroll: {
    gap: 14,
    paddingBottom: 20,
  },
  suppPresetsSection: {
    gap: 8,
    marginBottom: 2,
  },
  suppFormSectionLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  suppPresetsScroll: {
    gap: 6,
    paddingRight: 10,
  },
  presetChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#818CF8",
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
  },
  presetChipTextActive: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  suppFormGroup: {
    gap: 6,
  },
  suppFormLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  suppFormInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#0F172A",
  },
  timingCategoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  timingCategoryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 9,
  },
  timingCategoryBtnActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  timingCategoryText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  timingCategoryTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  timeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeDisplayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeDisplayText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#4F46E5",
  },
  hourChipsScroll: {
    gap: 6,
    paddingVertical: 2,
    paddingRight: 10,
  },
  timeChipButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timeChipButtonActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  timeChipButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  timeChipButtonTextActive: {
    color: "#FFFFFF",
  },
  notifSwitchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginTop: 2,
  },
  notifSwitchTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  notifSwitchSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  saveSuppSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveSuppSubmitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  deleteSuppBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 2,
  },
  deleteSuppBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
  },
  // CLINICAL TAB
  clinicalContainer: {
    gap: 14,
  },
  clinicalActionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    flexDirection: "row",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  clinicalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  clinicalCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.textPrimary,
    marginBottom: 4,
  },
  clinicalCardSub: {
    fontSize: 12,
    color: PALETTE.textMuted,
    lineHeight: 17,
    marginBottom: 12,
  },
  clinicalActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: PALETTE.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  clinicalActionBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: PALETTE.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: PALETTE.textMuted,
    lineHeight: 17,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalInputLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
  },
  modalTextInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    height: 44,
    fontSize: 15,
    fontWeight: "600",
    color: PALETTE.textPrimary,
  },
  modalSliderValue: {
    fontSize: 12.5,
    fontWeight: "800",
    color: PALETTE.primary,
  },
  pillSelectorRow: {
    flexDirection: "row",
    gap: 6,
  },
  scorePill: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scorePillActive: {
    backgroundColor: PALETTE.primary,
  },
  scorePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  scorePillTextActive: {
    color: "#FFFFFF",
  },
  scorePillSmall: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  scorePillSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: PALETTE.textMuted,
    textAlign: "center",
  },
  modalProfileCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  modalProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalProfileTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PALETTE.primaryDark,
  },
  modalProfileStats: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 2,
  },
  modalProfileBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalProfileBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  modalDisclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginTop: 4,
  },
  modalDisclaimerText: {
    fontSize: 11.5,
    color: "#92400E",
    lineHeight: 16,
    flex: 1,
  },
  modalSaveBtn: {
    backgroundColor: PALETTE.primary,
    borderRadius: 14,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // CIRCULAR TIMER & FASTING TRACKER STYLES
  circularTimerCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
    alignItems: "center",
  },
  circularTopControlsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  fastingLiveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4F46E5",
  },
  fastingLiveIndicatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  adjustScheduleLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  adjustScheduleLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  circularSvgWrapper: {
    width: 210,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 4,
  },
  circularCenterContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 170,
    height: 170,
  },
  windowStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  windowStatusBadgeFasting: {
    backgroundColor: "#EEF2FF",
  },
  windowStatusBadgeEating: {
    backgroundColor: "#ECFDF5",
  },
  windowStatusBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  circularTimerTime: {
    fontSize: 24,
    fontWeight: "900",
    color: PALETTE.textPrimary,
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"],
  },
  circularTimerLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: PALETTE.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: "uppercase",
  },
  circularNextTransitionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 6,
  },
  circularNextTransitionText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: PALETTE.textMuted,
  },
  windowCardsCol: {
    width: "100%",
    gap: 10,
    marginTop: 10,
  },
  windowDetailCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  windowDetailCardActiveFasting: {
    borderColor: "#C7D2FE",
    backgroundColor: "#F5F3FF",
  },
  windowDetailCardActiveEating: {
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  windowDetailCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  windowDetailTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  windowIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  windowIconBgFasting: {
    backgroundColor: "#EEF2FF",
  },
  windowIconBgEating: {
    backgroundColor: "#ECFDF5",
  },
  windowIconBgMuted: {
    backgroundColor: "#F1F5F9",
  },
  windowDetailTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: PALETTE.textPrimary,
  },
  windowDetailTitleActiveFasting: {
    color: "#4F46E5",
    fontWeight: "800",
  },
  windowDetailTitleActiveEating: {
    color: "#059669",
    fontWeight: "800",
  },
  activePillFasting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillTextFasting: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.5,
  },
  activePillEating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillTextEating: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  inactivePill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inactivePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: PALETTE.textMuted,
  },
  windowDetailTime: {
    fontSize: 13.5,
    fontWeight: "800",
    color: PALETTE.textPrimary,
  },
  windowDetailDurationText: {
    fontSize: 12,
    fontWeight: "600",
    color: PALETTE.textMuted,
  },
  windowDetailReminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  reminderHighlightFasting: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  reminderHighlightEating: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  stopFastingFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  stopFastingFooterBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  fastingInactiveCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    marginTop: 4,
  },
  inactiveIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  fastingInactiveTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.textPrimary,
    marginBottom: 4,
  },
  fastingInactiveSubtitle: {
    fontSize: 12,
    color: PALETTE.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  activateFastingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  activateFastingButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  modalProtocolRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  modalProtocolBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  modalProtocolBtnActive: {
    backgroundColor: PALETTE.emeraldLight,
    borderColor: PALETTE.emerald,
  },
  modalProtocolBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: PALETTE.textPrimary,
  },
  modalProtocolBtnTextActive: {
    color: PALETTE.emerald,
  },
  modalProtocolSubText: {
    fontSize: 9.5,
    color: PALETTE.textMuted,
    marginTop: 2,
  },
  modalProtocolSubTextActive: {
    color: PALETTE.emerald,
    fontWeight: "700",
  },
  modalTimeHighlight: {
    fontSize: 13,
    fontWeight: "800",
    color: PALETTE.emerald,
  },
  timeChipsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "transparent",
  },
  timeChipActive: {
    backgroundColor: PALETTE.emerald,
    borderColor: PALETTE.emerald,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.textPrimary,
  },
  timeChipTextActive: {
    color: "#FFFFFF",
  },
  modalScheduleSummaryBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 4,
    gap: 8,
  },
  modalScheduleSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalScheduleSummaryTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: PALETTE.textMuted,
  },
  modalScheduleSummaryVal: {
    fontSize: 12.5,
    fontWeight: "800",
    color: PALETTE.textPrimary,
    marginTop: 1,
  },
  modalReminderFreqBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: PALETTE.emeraldLight,
  },
  modalReminderFreqText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: PALETTE.emerald,
  },
  modalSummaryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  modalNotificationNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 10,
  },
  modalNotificationNoteText: {
    fontSize: 11,
    color: PALETTE.textMuted,
    flex: 1,
    lineHeight: 15,
  },

  // TREATMENT PLANS MODAL
  treatmentModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  treatmentModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 24,
    maxHeight: "92%",
  },
  treatmentModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  treatmentModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  treatmentModalSub: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  treatmentCloseBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  treatmentSearchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 42,
    marginBottom: 10,
  },
  treatmentSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingHorizontal: 8,
  },
  treatmentTabPillsWrapper: {
    marginBottom: 12,
  },
  treatmentTabPillsContainer: {
    gap: 8,
    paddingRight: 10,
  },
  treatmentTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  treatmentTabPillActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  treatmentTabPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  treatmentTabPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  treatmentListScroll: {
    maxHeight: 520,
    marginBottom: 10,
  },
  treatmentListContent: {
    gap: 16,
    paddingBottom: 20,
  },
  treatmentSectionGroup: {
    gap: 10,
  },
  treatmentSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  treatmentSectionIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4F46E5",
  },
  treatmentSectionTitleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  treatmentSectionBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  treatmentSectionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  treatmentSectionSubtitleText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: -4,
    marginBottom: 2,
  },
  treatmentCardItem: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  treatmentItemHeaderRow: {
    gap: 6,
  },
  treatmentItemNameText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
  },
  treatmentPriceTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  treatmentPriceTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  treatmentMetaTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  treatmentFreqTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  treatmentFreqTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  treatmentBadgeTag: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  treatmentBadgeTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  treatmentNoteTag: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  treatmentNoteTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  treatmentItemDetailsBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 8,
    padding: 10,
  },
  treatmentItemDetailsText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 17,
  },
  treatmentBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    marginTop: 2,
    alignSelf: "flex-end",
  },
  treatmentBookBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#4F46E5",
  },

  // BOOKING MODAL
  bookingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  bookingModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 28,
    maxHeight: "90%",
  },
  bookingModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  bookingModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  bookingModalSub: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  bookingScrollContent: {
    gap: 14,
    paddingBottom: 20,
  },
  selectedPlanBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  selectedPlanLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.5,
  },
  selectedPlanName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1B4B",
    marginTop: 2,
  },
  clearSelectedPlanBtn: {
    padding: 4,
  },
  aiDoctorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
  },
  aiDoctorBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  aiDoctorBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  aiDoctorBannerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  bookingFieldGroup: {
    gap: 6,
  },
  bookingFieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  bookingFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  bookingTextInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#0F172A",
  },
  bookingTextArea: {
    minHeight: 70,
    paddingTop: 10,
  },
  bookingSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingSubmitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
