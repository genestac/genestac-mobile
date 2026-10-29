// lib/skinLaser.ts
// Clinical Data Store, Recovery Protocols, UV Logic & Assessment Engine for Skin & Laser Care

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const STORAGE_KEY_SKIN_LASER = "@genestac_skin_laser_v1";

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type LaserTreatmentType =
  | "CO2 Fractional Resurfacing"
  | "Q-Switched Nd:YAG"
  | "Pico Genesis Laser"
  | "IPL Photofacial"
  | "Microneedling RF"
  | "Erbium Glass Laser";

export interface LaserSession {
  isActive: boolean;
  laserType: LaserTreatmentType;
  sessionDate: string; // ISO
  currentDay: number; // 1 to 7
  comfortLevel: number; // 1 to 10 (1 = comfortable, 10 = intense heat/erythema)
  notes?: string;
}

export interface HealingDayInfo {
  day: number;
  stageName: string;
  headline: string;
  expectedSymptoms: string[];
  careInstructions: string[];
  icon: string;
  themeColor: string;
  bgTint: string;
}

export interface ChecklistItem {
  id: string;
  type: "do" | "dont";
  title: string;
  desc: string;
  category: "Barrier Care" | "Sun Protection" | "Cleansing" | "Active Skincare" | "Lifestyle";
  completed: boolean;
}

export type UvRiskLevel = "Low" | "Moderate" | "High" | "Very High" | "Extreme";

export interface UvIndexData {
  currentUv: number; // e.g. 8
  maxUvToday: number; // e.g. 9
  locationName: string;
  riskLevel: UvRiskLevel;
  spfRecommendation: string;
  protectiveAdvice: string;
  lastAppliedTimestamp: string; // ISO
  reapplyIntervalMinutes: number; // default 120
  reminderEnabled: boolean;
  applicationsToday: string[]; // e.g. ["08:30 AM", "11:15 AM"]
}

export interface SkincareStep {
  id: string;
  stepNumber: number;
  name: string; // e.g. "Gentle Hydrating Cleanser"
  category: "AM" | "PM";
  activeIngredient: string; // e.g. "Ceramides, Glycerin, Centella"
  purpose: string; // e.g. "Preserve moisture barrier without stripping natural lipids"
  completed: boolean;
}

export interface SkincareRoutineData {
  amSteps: SkincareStep[];
  pmSteps: SkincareStep[];
  streakDays: number;
  lastCompletedDate: string;
}

export type FitzpatrickType = "I" | "II" | "III" | "IV" | "V" | "VI";

export interface FitzpatrickSkinData {
  skinType: FitzpatrickType;
  typeName: string;
  description: string;
  burnTendency: string;
  tanTendency: string;
  laserSafetyNote: string;
  hydrationScore: number; // 0 - 100
  barrierHealthScore: number; // 0 - 100
  sensitivityScore: number; // 0 - 100
  acneFlareRisk: "Low" | "Moderate" | "High";
  lastAssessmentDate: string;
}

export interface SkinLaserProfile {
  laserSession: LaserSession;
  checklists: ChecklistItem[];
  uvData: UvIndexData;
  routine: SkincareRoutineData;
  fitzpatrick: FitzpatrickSkinData;
  lastUpdatedDate: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL HEALING PROTOCOL TIMELINE (DAYS 1 TO 7)
// ─────────────────────────────────────────────────────────────────────────────

export const HEALING_TIMELINE_DAYS: HealingDayInfo[] = [
  {
    day: 1,
    stageName: "Day 1: Redness & Cooling",
    headline: "Acute Erythema & Thermal Dissipation",
    expectedSymptoms: [
      "Skin feels warm like a sunburn with visible redness",
      "Slight pinpoint scabbing or micro-swelling around treatment zones",
      "Tightness and sensitivity to room temperature air",
    ],
    careInstructions: [
      "Apply sterile chilled thermal water compresses for 10-15 mins",
      "Apply generous layer of doctor-prescribed post-laser healing balm (Panthenol/Cica)",
      "Keep head elevated with 2 pillows during sleep to minimize fluid edema",
    ],
    icon: "snow-outline",
    themeColor: "#E11D48",
    bgTint: "#FFE4E6",
  },
  {
    day: 2,
    stageName: "Day 2: Swelling Subsiding",
    headline: "Early Re-epithelialization & Barrier Shielding",
    expectedSymptoms: [
      "Peak mild swelling subsiding gradually throughout the day",
      "Skin transitions to a bronzed or darker sandpaper feel",
      "Tight sensation as micro-crusts (MENDs) begin forming",
    ],
    careInstructions: [
      "Wash only with lukewarm water and ultra-gentle soapless cleanser",
      "Do NOT scrub, exfoliate, or use washcloths",
      "Reapply barrier occlusive every 3 to 4 hours to prevent moisture loss",
    ],
    icon: "shield-checkmark-outline",
    themeColor: "#D97706",
    bgTint: "#FEF3C7",
  },
  {
    day: 3,
    stageName: "Day 3: Peeling & Micro-Crusting",
    headline: "Active Epidermal Shedding & Cellular Turnover",
    expectedSymptoms: [
      "Micro-crusts begin gently flaking off around mouth and cheeks",
      "Itchiness and ticklish sensation indicating healing cellular migration",
      "Uneven patchy texture under fingertip touch",
    ],
    careInstructions: [
      "CRITICAL: Never pick, scratch, or peel flaking skin prematurely",
      "Pat on Centella Asiatica or Ceramide NP soothing serum",
      "Keep 100% shielded from direct window daylight and outdoor UV",
    ],
    icon: "leaf-outline",
    themeColor: "#D97706",
    bgTint: "#FFFBEB",
  },
  {
    day: 4,
    stageName: "Day 4: Barrier Regeneration",
    headline: "New Collagen Scaffold & Basement Membrane Repair",
    expectedSymptoms: [
      "Peeling extends towards forehead, temples, and jawline",
      "Pink, baby-fresh skin emerges underneath flaked zones",
      "Reduced warmth and burning sensations",
    ],
    careInstructions: [
      "Continue heavy occlusive or rich barrier peptide moisturizer",
      "Stay indoors or apply 100% Mineral Zinc Oxide SPF 50 if stepping out",
      "Drink at least 2.5–3 liters of water to support dermal hydration",
    ],
    icon: "water-outline",
    themeColor: "#0284C7",
    bgTint: "#E0F2FE",
  },
  {
    day: 5,
    stageName: "Day 5: Flaking Clearance",
    headline: "Epithelial Closure & Stratum Corneum Realignment",
    expectedSymptoms: [
      "Majority of coarse flaking has naturally detached during gentle washes",
      "Subtle lingering pinkness in areas of deeper laser passes",
      "Noticeable improvement in skin softness and pore tightness",
    ],
    careInstructions: [
      "Introduce hyaluronic acid serum beneath barrier cream",
      "Avoid saunas, hot showers, intense gym sweating, and chlorine pools",
      "Ensure clean silk or soft cotton pillowcase to prevent friction",
    ],
    icon: "sparkles-outline",
    themeColor: "#0D9488",
    bgTint: "#CCFBF1",
  },
  {
    day: 6,
    stageName: "Day 6: Deep Hydration Rebound",
    headline: "Vascular Stabilization & Melanin Settling",
    expectedSymptoms: [
      "Skin feels supple, well-hydrated, and structurally firm",
      "Residual tenderness has virtually dissipated",
      "Light pink radiance indicating active microvascular healing",
    ],
    careInstructions: [
      "Continue SPF 50+ mineral protection rigorously every 2 hours",
      "Gentle massage with squalane or barrier lipid oil permitted",
      "Still NO chemical exfoliants (AHA/BHA), retinoids, or high-potency Vitamin C",
    ],
    icon: "heart-outline",
    themeColor: "#7C3AED",
    bgTint: "#F3E8FF",
  },
  {
    day: 7,
    stageName: "Day 7: Glowing Skin & Collagen Remodeling",
    headline: "Complete Re-Surfacing & Long-Term Neocollagenesis",
    expectedSymptoms: [
      "Smooth, radiant, visibly revitalized and uniform complexion",
      "Substantial texture refinement and reduction in pigmentation",
      "Dermal fibroblasts actively producing Type I & III collagen for 90 days",
    ],
    careInstructions: [
      "Congratulations! The primary acute post-laser recovery phase is complete",
      "Book your post-laser dermatologist follow-up review",
      "Resume regular active skincare gradually only after physician clearance",
    ],
    icon: "sunny",
    themeColor: "#059669",
    bgTint: "#ECFDF5",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL DO'S & DON'TS CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  // DO'S
  {
    id: "do-1",
    type: "do",
    title: "Apply Broad-Spectrum Mineral SPF 50",
    desc: "Use Zinc Oxide/Titanium Dioxide every 2 hours when daylight is present.",
    category: "Sun Protection",
    completed: true,
  },
  {
    id: "do-2",
    type: "do",
    title: "Hydrate Barrier with Ceramide Balm",
    desc: "Locks in transepidermal moisture and accelerates epithelial closure.",
    category: "Barrier Care",
    completed: true,
  },
  {
    id: "do-3",
    type: "do",
    title: "Wash with Gentle Soapless Cleanser",
    desc: "Use lukewarm water and gentle patting motions. No rubbing or washcloths.",
    category: "Cleansing",
    completed: false,
  },
  {
    id: "do-4",
    type: "do",
    title: "Sleep Slightly Elevated on Clean Pillows",
    desc: "Elevation minimizes post-laser facial lymphatic edema and puffiness.",
    category: "Lifestyle",
    completed: true,
  },
  {
    id: "do-5",
    type: "do",
    title: "Mist with Thermal Spring Water",
    desc: "Soothes thermal heat and delivers calming trace minerals (selenium, zinc).",
    category: "Barrier Care",
    completed: false,
  },

  // DON'TS
  {
    id: "dont-1",
    type: "dont",
    title: "No Direct Sun Exposure",
    desc: "UV radiation on post-laser skin risks severe Post-Inflammatory Hyperpigmentation (PIH).",
    category: "Sun Protection",
    completed: true,
  },
  {
    id: "dont-2",
    type: "dont",
    title: "Do Not Pick, Peel, or Scratch Skin",
    desc: "Prematurely detaching micro-crusts causes scarring and uneven dermal tone.",
    category: "Barrier Care",
    completed: true,
  },
  {
    id: "dont-3",
    type: "dont",
    title: "Avoid Retinol, AHAs, BHAs & Vitamin C",
    desc: "Stop all active exfoliating acids and potent actives until skin fully heals.",
    category: "Active Skincare",
    completed: true,
  },
  {
    id: "dont-4",
    type: "dont",
    title: "No Heavy Sweating, Gym, or Saunas",
    desc: "Excess thermal heat and salt in sweat provoke stinging and secondary infection.",
    category: "Lifestyle",
    completed: false,
  },
  {
    id: "dont-5",
    type: "dont",
    title: "Avoid Fragranced or Alcohol Skincare",
    desc: "Chemical fragrances and denatured alcohol induce contact dermatitis.",
    category: "Active Skincare",
    completed: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT AM / PM ROUTINE STEPS
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_AM_STEPS: SkincareStep[] = [
  {
    id: "am-1",
    stepNumber: 1,
    name: "Gentle Barrier Cleanser",
    category: "AM",
    activeIngredient: "Glycerin, Ceramides & Amino Acids",
    purpose: "Non-stripping cleanse to clear nocturnal sebum without compromising pH",
    completed: true,
  },
  {
    id: "am-2",
    stepNumber: 2,
    name: "Antioxidant Protective Serum",
    category: "AM",
    activeIngredient: "10% Niacinamide or Gentle Vitamin C Ester",
    purpose: "Free radical scavenge, lipid peroxidation prevention & tone brightening",
    completed: true,
  },
  {
    id: "am-3",
    stepNumber: 3,
    name: "Ceramide Moisture Lock",
    category: "AM",
    activeIngredient: "Ceramides NP/AP/EOP & Hyaluronic Acid",
    purpose: "Replenishes stratum corneum intercellular lipids for all-day barrier seal",
    completed: true,
  },
  {
    id: "am-4",
    stepNumber: 4,
    name: "Broad-Spectrum Mineral SPF 50+",
    category: "AM",
    activeIngredient: "Zinc Oxide 18%, Titanium Dioxide, PA++++",
    purpose: "Crucial photoprotection against UVA/UVB photoaging and laser erythema",
    completed: false,
  },
];

export const DEFAULT_PM_STEPS: SkincareStep[] = [
  {
    id: "pm-1",
    stepNumber: 1,
    name: "Double Cleanse (Micellar / Cleansing Oil)",
    category: "PM",
    activeIngredient: "Oat Kernel Extract & Squalane",
    purpose: "Thoroughly dissolves mineral sunscreen, environmental particulates & sebum",
    completed: false,
  },
  {
    id: "pm-2",
    stepNumber: 2,
    name: "Soothing Barrier Recovery Serum",
    category: "PM",
    activeIngredient: "Centella Asiatica (Cica), Madecassoside & Panthenol B5",
    purpose: "Accelerates micro-wound epithelialization and suppresses pro-inflammatory cytokines",
    completed: false,
  },
  {
    id: "pm-3",
    stepNumber: 3,
    name: "Restorative Overnight Night Cream",
    category: "PM",
    activeIngredient: "Copper Tripeptide-1, Shea Lipid & Ectoin",
    purpose: "Deep cellular nocturnal repair while epidermal trans-epidermal loss peaks",
    completed: false,
  },
  {
    id: "pm-4",
    stepNumber: 4,
    name: "Healing Occlusive Cica Balm",
    category: "PM",
    activeIngredient: "5% Panthenol, Zinc-Manganese & Shea Butter",
    purpose: "Protective breathable second-skin shield over sensitive healing zones",
    completed: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FITZPATRICK SKIN TYPES & QUIZ DATA
// ─────────────────────────────────────────────────────────────────────────────

export interface FitzpatrickQuestion {
  id: number;
  question: string;
  subtitle: string;
  options: {
    label: string;
    score: number; // 0 to 4
    fitzHint?: string;
  }[];
}

export const FITZPATRICK_QUIZ_QUESTIONS: FitzpatrickQuestion[] = [
  {
    id: 1,
    question: "What is your natural eye and hair color?",
    subtitle: "Genetic melanin predisposition baseline",
    options: [
      { label: "Light blue/green eyes, blonde or red hair", score: 0 },
      { label: "Blue, hazel or light brown eyes, blonde or dark blonde hair", score: 1 },
      { label: "Hazel, amber or brown eyes, light/medium brown hair", score: 2 },
      { label: "Dark brown eyes, dark brown or black hair", score: 3 },
      { label: "Deep dark brown/black eyes, jet black hair", score: 4 },
    ],
  },
  {
    id: 2,
    question: "What happens to your skin after 45 minutes in midday sun without sunscreen?",
    subtitle: "Thermal and erythema response threshold",
    options: [
      { label: "Always burns severely, blisters, never tans", score: 0 },
      { label: "Usually burns easily, peels, tans minimally", score: 1 },
      { label: "Burns mildly initially, then tans evenly into golden brown", score: 2 },
      { label: "Rarely burns, tans easily into medium olive brown", score: 3 },
      { label: "Never burns, deeply tans, rich dark pigmentation", score: 4 },
    ],
  },
  {
    id: 3,
    question: "How does your facial skin feel 20 minutes after cleansing?",
    subtitle: "Assessing transepidermal barrier hydration balance",
    options: [
      { label: "Extremely tight, dry, stinging or showing dry patches", score: 0 },
      { label: "Tight across forehead & cheeks, needs immediate moisturizer", score: 1 },
      { label: "Balanced and supple, slightly oily only in T-zone", score: 2 },
      { label: "Generally comfortable, produces noticeable sheen", score: 3 },
      { label: "Comfortable, dense barrier, rarely dry or irritated", score: 4 },
    ],
  },
  {
    id: 4,
    question: "How reactive is your skin to new skincare products, weather, or fragrances?",
    subtitle: "Epidermal neuro-sensitivity & barrier reactivity",
    options: [
      { label: "Highly reactive: immediate redness, burning, itching, or flushing", score: 0 },
      { label: "Frequently sensitized: tingles with acids, prone to eczema/rosacea", score: 1 },
      { label: "Mildly sensitive: occasional redness during seasonal transitions", score: 2 },
      { label: "Resilient: tolerates most treatments without irritation", score: 3 },
      { label: "Very resilient: skin barrier rarely reacts or shows redness", score: 4 },
    ],
  },
  {
    id: 5,
    question: "How frequently do you experience breakouts, flaking, or post-acne dark spots?",
    subtitle: "Melanocyte hyperactivity & acne flare frequency",
    options: [
      { label: "Frequent flaking & persistent redness with dry micro-bumps", score: 0 },
      { label: "Occasional inflammatory breakouts with lingering pink marks", score: 1 },
      { label: "Mild occasional breakouts with brown post-inflammatory spots", score: 2 },
      { label: "Infrequent breakouts but prone to prominent dark hyperpigmentation", score: 3 },
      { label: "Rare breakouts; any blemish leaves strong dark pigmentation", score: 4 },
    ],
  },
];

export const FITZPATRICK_DETAILS: Record<FitzpatrickType, {
  name: string;
  description: string;
  burnTendency: string;
  tanTendency: string;
  laserSafetyNote: string;
  color: string;
}> = {
  I: {
    name: "Type I (Very Fair)",
    description: "Pale ivory skin, blonde or red hair, light eyes. High susceptibility to photocarcinogenesis.",
    burnTendency: "Always burns painfully, never tans",
    tanTendency: "Does not tan; high risk of solar elastosis",
    laserSafetyNote: "Lowest risk of Post-Inflammatory Hyperpigmentation (PIH); ideal candidate for broad spectrum ablative lasers.",
    color: "#E11D48",
  },
  II: {
    name: "Type II (Fair / Light)",
    description: "Fair skin, blue/hazel eyes, light hair. Prone to freckles and sunburns.",
    burnTendency: "Burns easily, peels",
    tanTendency: "Tans minimally with difficulty",
    laserSafetyNote: "Good laser safety profile. Require strict post-treatment SPF 50 to prevent sunspots.",
    color: "#F59E0B",
  },
  III: {
    name: "Type III (Medium / Olive)",
    description: "Cream white to light olive skin, dark eyes, brown hair. Very common in Asian & Mediterranean tones.",
    burnTendency: "Burns moderately initially",
    tanTendency: "Tans gradually to light golden olive",
    laserSafetyNote: "Moderate risk of post-laser PIH. Conservative laser energy settings and cooling mandatory.",
    color: "#0284C7",
  },
  IV: {
    name: "Type IV (Olive / Brown)",
    description: "Moderate brown or olive skin, dark brown eyes and hair. Highly active melanocytes.",
    burnTendency: "Rarely burns",
    tanTendency: "Tans easily into rich golden brown",
    laserSafetyNote: "Higher risk of PIH. Long-pulse Nd:YAG and Pico lasers preferred over high-fluence IPL.",
    color: "#0D9488",
  },
  V: {
    name: "Type V (Dark Brown)",
    description: "Dark brown complexion, black hair, dark eyes. Abundant protective eumelanin.",
    burnTendency: "Very rarely burns",
    tanTendency: "Tans profusely and quickly",
    laserSafetyNote: "Laser safety requires 1064nm wavelength (Nd:YAG) to bypass epidermal melanin safely.",
    color: "#7C3AED",
  },
  VI: {
    name: "Type VI (Deeply Pigmented)",
    description: "Deepest dark skin tones, jet black hair, dark eyes. Excellent natural UV protection.",
    burnTendency: "Never burns",
    tanTendency: "Deeply pigmented; high risk of keloid/hypopigmentation with wrong laser",
    laserSafetyNote: "Strict dermatological laser protocol required. Gentle non-ablative resurfacing only.",
    color: "#1E293B",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT PROFILE STATE
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SKIN_LASER_PROFILE: SkinLaserProfile = {
  laserSession: {
    isActive: true,
    laserType: "CO2 Fractional Resurfacing",
    sessionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Day 3
    currentDay: 3,
    comfortLevel: 3,
    notes: "Treated full face for acne scar revision and pore refinement.",
  },
  checklists: DEFAULT_CHECKLIST_ITEMS,
  uvData: {
    currentUv: 8,
    maxUvToday: 9,
    locationName: "New Delhi, NCR • Clear Sky",
    riskLevel: "Very High",
    spfRecommendation: "SPF 50+ Broad Spectrum (PA++++)",
    protectiveAdvice: "Very high UV intensity. Seek shade between 11 AM - 3 PM. Wear UV-blocking eyewear & wide-brim hat.",
    lastAppliedTimestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    reapplyIntervalMinutes: 120,
    reminderEnabled: true,
    applicationsToday: ["08:30 AM", "11:00 AM"],
  },
  routine: {
    amSteps: DEFAULT_AM_STEPS,
    pmSteps: DEFAULT_PM_STEPS,
    streakDays: 14,
    lastCompletedDate: new Date().toISOString().split("T")[0],
  },
  fitzpatrick: {
    skinType: "III",
    typeName: "Type III (Medium / Olive)",
    description: "Cream white to light olive skin. Burns moderately initially, tans to uniform golden brown.",
    burnTendency: "Moderate burn risk during peak midday sun",
    tanTendency: "Tans gradually into golden bronze",
    laserSafetyNote: "Moderate risk of post-laser hyperpigmentation (PIH). Strict SPF 50 & cooling barrier care mandatory.",
    hydrationScore: 84,
    barrierHealthScore: 88,
    sensitivityScore: 28,
    acneFlareRisk: "Low",
    lastAssessmentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  lastUpdatedDate: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// UV EVALUATION & COLOR HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateUvRisk(uvIndex: number): {
  level: UvRiskLevel;
  color: string;
  bgTint: string;
  spfAdvice: string;
  protectionSteps: string[];
} {
  if (uvIndex <= 2) {
    return {
      level: "Low",
      color: "#10B981",
      bgTint: "#ECFDF5",
      spfAdvice: "SPF 30 is sufficient for casual morning exposure.",
      protectionSteps: ["Wear sunglasses on bright days", "Safe for morning walks"],
    };
  }
  if (uvIndex <= 5) {
    return {
      level: "Moderate",
      color: "#F59E0B",
      bgTint: "#FFFBEB",
      spfAdvice: "SPF 30–50 required. Reapply every 2 hours if outdoors.",
      protectionSteps: ["Wear a hat and sunglasses", "Stay in shade near midday"],
    };
  }
  if (uvIndex <= 7) {
    return {
      level: "High",
      color: "#EA580C",
      bgTint: "#FFF7ED",
      spfAdvice: "SPF 50+ mandatory. Protection essential during outdoor exposure.",
      protectionSteps: [
        "Reduce sun exposure between 11 AM – 3 PM",
        "Wear UV protective clothing & hat",
        "Reapply SPF 50 every 90–120 minutes",
      ],
    };
  }
  if (uvIndex <= 10) {
    return {
      level: "Very High",
      color: "#E11D48",
      bgTint: "#FFE4E6",
      spfAdvice: "SPF 50+ Broad-Spectrum (PA++++) with Zinc Oxide essential now.",
      protectionSteps: [
        "Avoid direct sun exposure between 10 AM – 4 PM",
        "Seek shade; post-laser skin will experience thermal erythema",
        "Reapply sunscreen immediately after sweating or swimming",
      ],
    };
  }
  return {
    level: "Extreme",
    color: "#7C3AED",
    bgTint: "#F3E8FF",
    spfAdvice: "Maximum protection! Avoid any direct outdoor exposure.",
    protectionSteps: [
      "Stay indoors during peak hours",
      "Full coverage protective clothing & polarized UV-400 sunglasses",
      "Immediate sunburn and post-inflammatory pigmentation danger",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FITZPATRICK & BARRIER CALCULATION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

export function calculateQuizResults(scores: number[]): {
  skinType: FitzpatrickType;
  barrierScore: number;
  hydrationScore: number;
  sensitivityScore: number;
  acneRisk: "Low" | "Moderate" | "High";
} {
  // scores[0] is genetic color (0-4)
  // scores[1] is sun burn response (0-4)
  // scores[2] is post-cleanse hydration (0-4)
  // scores[3] is product sensitivity (0-4)
  // scores[4] is breakout/flaking frequency (0-4)

  const geneticSunScore = (scores[0] ?? 2) + (scores[1] ?? 2); // 0 to 8

  let skinType: FitzpatrickType = "III";
  if (geneticSunScore <= 1) skinType = "I";
  else if (geneticSunScore <= 3) skinType = "II";
  else if (geneticSunScore <= 5) skinType = "III";
  else if (geneticSunScore <= 6) skinType = "IV";
  else if (geneticSunScore <= 7) skinType = "V";
  else skinType = "VI";

  // Barrier health: higher score across items 2, 3, 4 indicates stronger, calmer barrier
  const barrierRaw = ((scores[2] ?? 2) + (scores[3] ?? 2) + (scores[4] ?? 2)) / 12; // 0 to 1
  const barrierScore = Math.min(100, Math.max(30, Math.round(barrierRaw * 60 + 40)));

  // Hydration score based mostly on question 2
  const hydRaw = (scores[2] ?? 2) / 4;
  const hydrationScore = Math.min(100, Math.max(35, Math.round(hydRaw * 50 + 50)));

  // Sensitivity score: inverted question 3 (0 is highly sensitive)
  const sensRaw = 4 - (scores[3] ?? 2);
  const sensitivityScore = Math.min(100, Math.max(10, Math.round((sensRaw / 4) * 80 + 10)));

  // Acne flare risk
  let acneRisk: "Low" | "Moderate" | "High" = "Moderate";
  if ((scores[4] ?? 2) >= 3) acneRisk = "Low";
  else if ((scores[4] ?? 2) <= 1) acneRisk = "High";

  return {
    skinType,
    barrierScore,
    hydrationScore,
    sensitivityScore,
    acneRisk,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

export async function loadSkinLaserProfile(): Promise<SkinLaserProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SKIN_LASER);
    if (!raw) {
      await saveSkinLaserProfile(DEFAULT_SKIN_LASER_PROFILE);
      return DEFAULT_SKIN_LASER_PROFILE;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SKIN_LASER_PROFILE,
      ...parsed,
    };
  } catch (err) {
    console.warn("Could not load skin laser profile from storage:", err);
    return DEFAULT_SKIN_LASER_PROFILE;
  }
}

export async function saveSkinLaserProfile(profile: SkinLaserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_SKIN_LASER, JSON.stringify(profile));
  } catch (err) {
    console.warn("Could not save skin laser profile to storage:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS SCHEDULING (SPF REAPPLICATION REMINDER)
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleSpfReminderNotification(
  minutesFromNow: number = 120
): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: reqStatus } = await Notifications.requestPermissionsAsync();
      if (reqStatus !== "granted") return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "☀️ Time to Reapply SPF 50!",
        body: "Your 2-hour UV barrier shield has expired. Reapply broad-spectrum sunscreen now to protect healing skin.",
        sound: true,
        data: { type: "spf_reapply" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(60, minutesFromNow * 60),
      },
    });

    return id;
  } catch (err) {
    console.warn("Could not schedule SPF reminder notification:", err);
    return null;
  }
}

export async function cancelSpfReminderNotification(notificationId?: string): Promise<void> {
  if (!notificationId || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn("Could not cancel SPF notification:", err);
  }
}
