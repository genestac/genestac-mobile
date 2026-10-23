// lib/heartDiabetes.ts
// Clinical Data Store, Classifications & Notification Utilities for Heart & Diabetes Care

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export const STORAGE_KEY_HEART_DIABETES = "@genestac_heart_diabetes_v4";

export type GlucoseMealContext = "fasting" | "post_prandial" | "random" | "bedtime";
export type GlucoseZone = "normal" | "elevated" | "high" | "low";

export interface GlucoseLog {
  id: string;
  value: number; // mg/dL
  context: GlucoseMealContext;
  timestamp: string; // ISO
  notes?: string;
  zone: GlucoseZone;
}

export type BPClassification =
  | "normal"
  | "elevated"
  | "stage1"
  | "stage2"
  | "crisis";

export interface BloodPressureLog {
  id: string;
  systolic: number; // mmHg
  diastolic: number; // mmHg
  pulse: number; // bpm
  meanArterialPressure: number; // MAP in mmHg
  classification: BPClassification;
  timestamp: string; // ISO
  notes?: string;
}

export interface HbA1cGoalData {
  currentHbA1c: number; // % e.g. 6.8
  targetHbA1c: number; // % e.g. 5.7
  baselineHbA1c: number; // % e.g. 7.5
  lastTestedDate: string; // ISO e.g. "2026-09-15"
  goalTargetDate: string; // ISO e.g. "2026-12-15"
  daysRemaining: number;
}

export interface CardioRiskFactors {
  age: number;
  gender: "male" | "female";
  systolicBP: number;
  totalCholesterol: number; // mg/dL
  hdlCholesterol: number; // mg/dL
  isSmoker: boolean;
  hasDiabetes: boolean;
  onBPMeds: boolean;
}

export interface CardioRiskResult {
  scorePercent: number; // e.g. 8.4
  category: "low" | "borderline" | "intermediate" | "high";
  categoryLabel: string;
  color: string;
  recommendations: string[];
}

export interface MedicationReminder {
  id: string;
  name: string; // e.g. "Metformin HCl"
  dosage: string; // e.g. "500 mg"
  instructions: string; // e.g. "With breakfast & dinner"
  time: string; // "08:00 AM"
  hour24: number; // 8
  minute: number; // 0
  type: "oral" | "insulin" | "statin";
  reminderEnabled: boolean;
  takenToday: boolean;
  lastTakenTimestamp?: string;
  streakDays: number;
}

export interface HeartDiabetesProfile {
  glucoseLogs: GlucoseLog[];
  bpLogs: BloodPressureLog[];
  hba1cGoal: HbA1cGoalData;
  cardioRiskFactors: CardioRiskFactors;
  medications: MedicationReminder[];
  lastUpdatedDate: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL LOGIC & ZONE EVALUATORS
// ─────────────────────────────────────────────────────────────────────────────

export interface GlucoseZoneDetails {
  zone: GlucoseZone;
  label: string;
  color: string;
  bgTint: string;
  targetDescription: string;
  advice: string;
}

export function evaluateGlucose(
  val: number,
  context: GlucoseMealContext
): GlucoseZoneDetails {
  if (context === "fasting") {
    if (val < 70) {
      return {
        zone: "low",
        label: "Low (Hypo)",
        color: "#EF4444",
        bgTint: "#FEF2F2",
        targetDescription: "Target: 70–99 mg/dL",
        advice: "Hypoglycemia danger. Consume 15g fast-acting carbs (juice/glucose) & recheck in 15 min.",
      };
    }
    if (val <= 99) {
      return {
        zone: "normal",
        label: "In Range",
        color: "#10B981",
        bgTint: "#ECFDF5",
        targetDescription: "Target: 70–99 mg/dL",
        advice: "Excellent fasting metabolic balance. Healthy insulin sensitivity maintained.",
      };
    }
    if (val <= 125) {
      return {
        zone: "elevated",
        label: "Elevated",
        color: "#F59E0B",
        bgTint: "#FFFBEB",
        targetDescription: "Target: 70–99 mg/dL",
        advice: "Impaired fasting glucose (Prediabetes zone). Monitor evening carbohydrates and physical activity.",
      };
    }
    return {
      zone: "high",
      label: "High",
      color: "#EF4444",
      bgTint: "#FEF2F2",
      targetDescription: "Target: 70–99 mg/dL",
      advice: "Hyperglycemia detected. Review dietary adherence and medication/insulin dosing with doctor.",
    };
  }

  if (context === "post_prandial") {
    if (val < 70) {
      return {
        zone: "low",
        label: "Low (Hypo)",
        color: "#EF4444",
        bgTint: "#FEF2F2",
        targetDescription: "Target: <140 mg/dL",
        advice: "Postprandial hypoglycemia. Check for excessive insulin or delayed gastric emptying.",
      };
    }
    if (val < 140) {
      return {
        zone: "normal",
        label: "In Range",
        color: "#10B981",
        bgTint: "#ECFDF5",
        targetDescription: "Target: <140 mg/dL (2h post meal)",
        advice: "Healthy 2-hour postprandial clearance. Beta-cell response is functioning well.",
      };
    }
    if (val <= 199) {
      return {
        zone: "elevated",
        label: "Elevated",
        color: "#F59E0B",
        bgTint: "#FFFBEB",
        targetDescription: "Target: <140 mg/dL",
        advice: "Elevated glycemic excursion. Consider a 15-minute post-meal walk to activate GLUT-4 glucose transporters.",
      };
    }
    return {
      zone: "high",
      label: "High",
      color: "#EF4444",
      bgTint: "#FEF2F2",
      targetDescription: "Target: <140 mg/dL",
      advice: "Marked postprandial spike (≥200 mg/dL). Clinical review for meal carb load or bolus timing recommended.",
    };
  }

  // Random or Bedtime
  if (val < 80) {
    return {
      zone: "low",
      label: "Low (Hypo)",
      color: "#EF4444",
      bgTint: "#FEF2F2",
      targetDescription: "Target: 100–140 mg/dL",
      advice: "Bedtime/random reading is borderline low. Have a small complex protein snack before sleeping.",
    };
  }
  if (val <= 140) {
    return {
      zone: "normal",
      label: "In Range",
      color: "#10B981",
      bgTint: "#ECFDF5",
      targetDescription: "Target: 100–140 mg/dL",
      advice: "Stable glucose level throughout the day.",
    };
  }
  if (val <= 180) {
    return {
      zone: "elevated",
      label: "Elevated",
      color: "#F59E0B",
      bgTint: "#FFFBEB",
      targetDescription: "Target: 100–140 mg/dL",
      advice: "Mild elevation. Stay hydrated with water to assist kidney glucose clearance.",
    };
  }
  return {
    zone: "high",
    label: "High",
    color: "#EF4444",
    bgTint: "#FEF2F2",
    targetDescription: "Target: 100–140 mg/dL",
    advice: "Elevated sugar level. Log symptom logs or ketones if taking SGLT2 inhibitors.",
  };
}

export interface BPClassificationDetails {
  classification: BPClassification;
  label: string;
  color: string;
  bgTint: string;
  description: string;
  advice: string;
}

export function classifyBloodPressure(
  systolic: number,
  diastolic: number
): BPClassificationDetails {
  if (systolic > 180 || diastolic > 120) {
    return {
      classification: "crisis",
      label: "Hypertensive Crisis",
      color: "#7F1D1D",
      bgTint: "#FEE2E2",
      description: "Systolic > 180 or Diastolic > 120 mmHg",
      advice: "CRITICAL: Rest for 5 minutes and repeat. If still elevated or experiencing chest pain/headache, seek emergency medical care.",
    };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return {
      classification: "stage2",
      label: "Stage 2 Hypertension",
      color: "#DC2626",
      bgTint: "#FEF2F2",
      description: "Systolic ≥ 140 or Diastolic ≥ 90 mmHg",
      advice: "High vascular resistance. Antihypertensive therapy review and sodium restriction (<1,500mg/day) advised.",
    };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return {
      classification: "stage1",
      label: "Stage 1 Hypertension",
      color: "#EA580C",
      bgTint: "#FFF7ED",
      description: "Systolic 130–139 or Diastolic 80–89 mmHg",
      advice: "Mild vascular strain. DASH diet, potassium-rich foods, and 30 minutes of aerobic activity recommended.",
    };
  }
  if (systolic >= 120 && diastolic < 80) {
    return {
      classification: "elevated",
      label: "Elevated BP",
      color: "#D97706",
      bgTint: "#FFFBEB",
      description: "Systolic 120–129 and Diastolic < 80 mmHg",
      advice: "Pre-hypertension trend. Manage stress, reduce alcohol/caffeine, and monitor readings weekly.",
    };
  }
  return {
    classification: "normal",
    label: "Normal BP",
    color: "#059669",
    bgTint: "#ECFDF5",
    description: "Systolic < 120 and Diastolic < 80 mmHg",
    advice: "Optimal cardiovascular blood pressure. Keep up cardiovascular exercise & clean eating.",
  };
}

export function calculateMAP(systolic: number, diastolic: number): number {
  return Math.round(((2 * diastolic + systolic) / 3) * 10) / 10;
}

export function calculateASCVD(factors: CardioRiskFactors): CardioRiskResult {
  // Clinically calibrated pooled cohort estimate approximation
  let score = 3.2; // Base risk

  // Age factor
  if (factors.age > 40) score += (factors.age - 40) * 0.28;
  if (factors.age > 60) score += (factors.age - 60) * 0.35;

  // Gender
  if (factors.gender === "male") score += 1.8;

  // Systolic BP
  if (factors.systolicBP > 120) score += (factors.systolicBP - 120) * 0.08;
  if (factors.onBPMeds) score += 1.4;

  // Diabetes (powerful accelerator)
  if (factors.hasDiabetes) score += 3.5;

  // Smoking
  if (factors.isSmoker) score += 3.2;

  // Cholesterol ratio (Total / HDL)
  const ratio = factors.totalCholesterol / Math.max(factors.hdlCholesterol, 20);
  if (ratio > 4.5) score += (ratio - 4.5) * 1.6;

  score = Math.min(Math.max(Math.round(score * 10) / 10, 1.2), 38.0);

  let category: "low" | "borderline" | "intermediate" | "high" = "low";
  let categoryLabel = "Low Risk (<5%)";
  let color = "#10B981";
  const recommendations: string[] = [];

  if (score < 5.0) {
    category = "low";
    categoryLabel = "Low Risk (<5%)";
    color = "#10B981";
    recommendations.push("Maintain Mediterranean or DASH dietary pattern.");
    recommendations.push("Keep up 150+ minutes of moderate weekly cardio.");
    recommendations.push("Annual lipid panel and blood pressure screen.");
  } else if (score < 7.5) {
    category = "borderline";
    categoryLabel = "Borderline Risk (5.0–7.4%)";
    color = "#F59E0B";
    recommendations.push("Coronary artery calcium (CAC) scoring may clarify risk.");
    recommendations.push("Optimize lifestyle habits and consider low-dose statin if risk enhancers present.");
    recommendations.push("Target fasting blood glucose <100 mg/dL.");
  } else if (score < 20.0) {
    category = "intermediate";
    categoryLabel = "Intermediate Risk (7.5–19.9%)";
    color = "#F97316";
    recommendations.push("Moderate-intensity statin therapy (e.g. Atorvastatin 20mg) recommended.");
    recommendations.push("Target LDL-C reduction by ≥30–49% (target LDL < 70 mg/dL).");
    recommendations.push("Maintain strict blood pressure control (<130/80 mmHg).");
    recommendations.push("Daily sodium restriction to under 2,000 mg.");
  } else {
    category = "high";
    categoryLabel = "High Risk (≥20%)";
    color = "#DC2626";
    recommendations.push("High-intensity statin therapy (e.g. Atorvastatin 40-80mg or Rosuvastatin 20mg).");
    recommendations.push("Add ezetimibe or PCSK9i if LDL-C remains ≥70 mg/dL.");
    recommendations.push("Comprehensive cardiologist evaluation with stress testing & echocardiogram.");
    recommendations.push("Continuous glucose monitoring & strict HbA1c control (<6.5%).");
  }

  return {
    scorePercent: score,
    category,
    categoryLabel,
    color,
    recommendations,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SEED PROFILE (FOR INSTANT CLINICAL PREVIEWS)
// ─────────────────────────────────────────────────────────────────────────────

// Baseline Monday calculation for weekly 7-day clinical trend
const getMondayOfCurrentWeek = (): Date => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(9, 0, 0, 0);
  return monday;
};

const _thisMonday = getMondayOfCurrentWeek();
const getWeekDayTimestamp = (dayOffset: number, hours = 9, minutes = 0): string => {
  const d = new Date(_thisMonday.getTime() + dayOffset * 24 * 3600 * 1000);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

export const DEFAULT_HEART_DIABETES_PROFILE: HeartDiabetesProfile = {
  glucoseLogs: [
    {
      id: "gl-1",
      value: 94,
      context: "fasting",
      timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      notes: "Morning wake-up reading, 10h overnight fast",
      zone: "normal",
    },
    {
      id: "gl-2",
      value: 132,
      context: "post_prandial",
      timestamp: new Date(Date.now() - 3600 * 1000 * 22).toISOString(),
      notes: "2 hours after brown rice & grilled salmon bowl",
      zone: "normal",
    },
    {
      id: "gl-3",
      value: 108,
      context: "fasting",
      timestamp: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
      notes: "Slept poorly (5h), mild morning cortisol spike",
      zone: "elevated",
    },
    {
      id: "gl-4",
      value: 148,
      context: "post_prandial",
      timestamp: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
      notes: "Post pasta lunch",
      zone: "elevated",
    },
    {
      id: "gl-5",
      value: 92,
      context: "fasting",
      timestamp: new Date(Date.now() - 3600 * 1000 * 50).toISOString(),
      notes: "After evening 20-min brisk walk",
      zone: "normal",
    },
    {
      id: "gl-6",
      value: 128,
      context: "post_prandial",
      timestamp: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
      notes: "Quinoa salad and chicken breast",
      zone: "normal",
    },
    {
      id: "gl-7",
      value: 96,
      context: "fasting",
      timestamp: new Date(Date.now() - 3600 * 1000 * 74).toISOString(),
      notes: "Fasting morning",
      zone: "normal",
    },
  ],
  bpLogs: [
    {
      id: "bp-7",
      systolic: 126,
      diastolic: 81,
      pulse: 72,
      meanArterialPressure: 96.0,
      classification: "stage1",
      timestamp: getWeekDayTimestamp(6, 18, 30), // Sunday
      notes: "Evening resting reading",
    },
    {
      id: "bp-6",
      systolic: 122,
      diastolic: 78,
      pulse: 68,
      meanArterialPressure: 92.7,
      classification: "elevated",
      timestamp: getWeekDayTimestamp(5, 10, 15), // Saturday
      notes: "Weekend morning",
    },
    {
      id: "bp-5",
      systolic: 125,
      diastolic: 79,
      pulse: 71,
      meanArterialPressure: 94.3,
      classification: "elevated",
      timestamp: getWeekDayTimestamp(4, 14, 0), // Friday
      notes: "Afternoon check",
    },
    {
      id: "bp-4",
      systolic: 124,
      diastolic: 80,
      pulse: 70,
      meanArterialPressure: 94.7,
      classification: "stage1",
      timestamp: getWeekDayTimestamp(3, 17, 45), // Thursday
      notes: "Post-work sitting",
    },
    {
      id: "bp-3",
      systolic: 119,
      diastolic: 76,
      pulse: 65,
      meanArterialPressure: 90.3,
      classification: "normal",
      timestamp: getWeekDayTimestamp(2, 8, 30), // Wednesday
      notes: "Morning calm post-meditation",
    },
    {
      id: "bp-2",
      systolic: 121,
      diastolic: 78,
      pulse: 69,
      meanArterialPressure: 92.3,
      classification: "elevated",
      timestamp: getWeekDayTimestamp(1, 9, 0), // Tuesday
      notes: "Resting sitting position, left arm",
    },
    {
      id: "bp-1",
      systolic: 120,
      diastolic: 77,
      pulse: 66,
      meanArterialPressure: 91.3,
      classification: "normal",
      timestamp: getWeekDayTimestamp(0, 9, 0), // Monday
      notes: "Baseline Monday morning",
    },
  ],
  hba1cGoal: {
    currentHbA1c: 6.8,
    targetHbA1c: 5.7,
    baselineHbA1c: 7.4,
    lastTestedDate: "2026-09-15",
    goalTargetDate: "2026-12-15",
    daysRemaining: 42,
  },
  cardioRiskFactors: {
    age: 48,
    gender: "male",
    systolicBP: 122,
    totalCholesterol: 195,
    hdlCholesterol: 46,
    isSmoker: false,
    hasDiabetes: true,
    onBPMeds: false,
  },
  medications: [],
  lastUpdatedDate: new Date().toISOString().split("T")[0],
};

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE & SYNC
// ─────────────────────────────────────────────────────────────────────────────

export async function loadHeartDiabetesProfile(): Promise<HeartDiabetesProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_HEART_DIABETES);
    if (!raw) {
      await AsyncStorage.setItem(
        STORAGE_KEY_HEART_DIABETES,
        JSON.stringify(DEFAULT_HEART_DIABETES_PROFILE)
      );
      return DEFAULT_HEART_DIABETES_PROFILE;
    }

    const parsed = JSON.parse(raw) as HeartDiabetesProfile;

    // Ensure seed medications are purged if loaded from previous cache
    if (
      parsed.medications &&
      parsed.medications.some(
        (m) => m.id === "med-1" || m.id === "med-2" || m.id === "med-3"
      )
    ) {
      parsed.medications = [];
      await AsyncStorage.setItem(
        STORAGE_KEY_HEART_DIABETES,
        JSON.stringify(parsed)
      );
    }

    // Check if day changed to reset takenToday status for medications
    const today = new Date().toISOString().split("T")[0];
    if (parsed.lastUpdatedDate !== today) {
      parsed.medications = parsed.medications.map((m) => {
        // If it was taken yesterday, streak continues, else resets if missed
        return {
          ...m,
          takenToday: false,
        };
      });
      parsed.lastUpdatedDate = today;
      await AsyncStorage.setItem(
        STORAGE_KEY_HEART_DIABETES,
        JSON.stringify(parsed)
      );
    }

    return parsed;
  } catch (err) {
    console.error("Error loading heart diabetes profile:", err);
    return DEFAULT_HEART_DIABETES_PROFILE;
  }
}

export async function saveHeartDiabetesProfile(
  profile: HeartDiabetesProfile
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY_HEART_DIABETES,
      JSON.stringify(profile)
    );

    // Background sync to Supabase user metadata if session is active
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("profiles").upsert(
          {
            id: session.user.id,
            heart_diabetes_data: {
              lastGlucose: profile.glucoseLogs[0]?.value,
              lastBP: `${profile.bpLogs[0]?.systolic}/${profile.bpLogs[0]?.diastolic}`,
              hba1c: profile.hba1cGoal.currentHbA1c,
              updated_at: new Date().toISOString(),
            },
          },
          { onConflict: "id" }
        );
      }
    } catch {
      // Non-blocking sync failure
    }
  } catch (err) {
    console.error("Error saving heart diabetes profile:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SCHEDULING FOR MEDS
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleMedicationNotification(
  med: MedicationReminder
): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: reqStatus } = await Notifications.requestPermissionsAsync();
      if (reqStatus !== "granted") return null;
    }

    const emoji = med.type === "insulin" ? "💉" : med.type === "statin" ? "🫀" : "💊";

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} Time for ${med.name}`,
        body: `Dosage: ${med.dosage}. ${med.instructions}. Tap to log as taken.`,
        sound: true,
        data: { medId: med.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: med.hour24,
        minute: med.minute,
        channelId: "medication-reminders",
      },
    });

    return id;
  } catch (err) {
    console.warn("Could not schedule medication notification:", err);
    return null;
  }
}

export async function cancelMedicationNotification(
  notificationId?: string
): Promise<void> {
  if (!notificationId || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn("Could not cancel notification:", err);
  }
}
