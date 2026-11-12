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
  shortLabel?: string;
}

export interface LaserProtocolMeta {
  type: LaserTreatmentType;
  category: string;
  downtime: string;
  indication: string;
  primaryFocus: string;
  themeColor: string;
  bgTint: string;
  badgeColor: string;
  defaultNote: string;
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
// CLINICAL PROTOCOL METADATA & TREATMENT SPECIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_LASER_PROTOCOLS_META: Record<LaserTreatmentType, LaserProtocolMeta> = {
  "CO2 Fractional Resurfacing": {
    type: "CO2 Fractional Resurfacing",
    category: "Ablative Fractional (10,600nm)",
    downtime: "5–7 Days Moderate Downtime",
    indication: "Deep acne scars, severe sun damage, coarse wrinkles & skin laxity",
    primaryFocus: "Barrier occlusion, thermal dissipation & natural MENDs shedding",
    themeColor: "#E11D48",
    bgTint: "#FFE4E6",
    badgeColor: "#E11D48",
    defaultNote: "Ablative fractional resurfacing for deep acne scar revision and dermal remodeling.",
  },
  "Q-Switched Nd:YAG": {
    type: "Q-Switched Nd:YAG",
    category: "Photoacoustic Laser (1064nm / 532nm)",
    downtime: "Minimal Downtime (< 24 Hours)",
    indication: "Melasma, lentigines, pigment toning & carbon peel rejuvenation",
    primaryFocus: "Melanin clearance, strict sun shield & pigment stabilization",
    themeColor: "#0284C7",
    bgTint: "#E0F2FE",
    badgeColor: "#0284C7",
    defaultNote: "Q-Switched Nd:YAG laser toning for facial melasma and stubborn pigment spots.",
  },
  "Pico Genesis Laser": {
    type: "Pico Genesis Laser",
    category: "Picosecond Laser (750ps Photoacoustic)",
    downtime: "Zero to Minimal Downtime (2–4 Hours)",
    indication: "Stubborn melasma, hyperpigmentation, cellular glow & pore refinement",
    primaryFocus: "Macrophage clearance of shattered pigment, hydration & UV defense",
    themeColor: "#0D9488",
    bgTint: "#CCFBF1",
    badgeColor: "#0D9488",
    defaultNote: "Pico Genesis session for pigment lightening and overall cellular radiance.",
  },
  "IPL Photofacial": {
    type: "IPL Photofacial",
    category: "Broadband Pulsed Light (500–1200nm)",
    downtime: "3–5 Days Low Downtime",
    indication: "Sun damage, freckles, age spots & broken facial capillaries",
    primaryFocus: "Coffee-ground pigment sloughing, vascular calming & strict SPF 50",
    themeColor: "#D97706",
    bgTint: "#FEF3C7",
    badgeColor: "#D97706",
    defaultNote: "Full-face IPL photofacial for sun damage, freckles, and diffuse redness.",
  },
  "Microneedling RF": {
    type: "Microneedling RF",
    category: "RF Microneedling (Morpheus8 / Secret RF)",
    downtime: "2–4 Days Moderate Downtime",
    indication: "Skin laxity, enlarged pores, acne scars & contour tightening",
    primaryFocus: "Sterile micro-channel healing, barrier sealing & deep neocollagenesis",
    themeColor: "#7C3AED",
    bgTint: "#F3E8FF",
    badgeColor: "#7C3AED",
    defaultNote: "RF microneedling session for dermal tightening and acne scar remodeling.",
  },
  "Erbium Glass Laser": {
    type: "Erbium Glass Laser",
    category: "Non-Ablative Fractional (1550nm Fraxel)",
    downtime: "3–5 Days Low-Moderate Downtime",
    indication: "Acne scarring, fine lines, texture roughness & glass skin finish",
    primaryFocus: "MENDs micro-crusting care, intense ceramide barrier & hydration",
    themeColor: "#2563EB",
    bgTint: "#DBEAFE",
    badgeColor: "#2563EB",
    defaultNote: "Erbium glass non-ablative resurfacing for skin texture and pore reduction.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PROTOCOL-SPECIFIC 7-DAY HEALING TIMELINES
// ─────────────────────────────────────────────────────────────────────────────

export const LASER_TIMELINES: Record<LaserTreatmentType, HealingDayInfo[]> = {
  // 1. CO2 FRACTIONAL RESURFACING (Ablative)
  "CO2 Fractional Resurfacing": [
    {
      day: 1,
      shortLabel: "Redness",
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
      shortLabel: "Swelling",
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
      shortLabel: "Peeling",
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
      shortLabel: "Repair",
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
      shortLabel: "Clearing",
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
      shortLabel: "Hydration",
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
      shortLabel: "Glowing",
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
  ],

  // 2. Q-SWITCHED ND:YAG (Pigment Toning)
  "Q-Switched Nd:YAG": [
    {
      day: 1,
      shortLabel: "Calming",
      stageName: "Day 1: Flushing & Heat Relief",
      headline: "Sub-Nanosecond Acoustic Calming & Mild Flushing",
      expectedSymptoms: [
        "Transient pink flushing and warm sensation lasting 2 to 6 hours",
        "Zero open surface wounds or bleeding; targeted melanocytes thermally stimulated",
        "Mild dryness or tight feeling around treated pigment clusters",
      ],
      careInstructions: [
        "Mist with chilled thermal spring water or apply cool compress for 10-15 mins",
        "Apply light soothing Centella Asiatica or Panthenol barrier gel",
        "Strictly stay in shade and avoid all direct window and outdoor UV daylight",
      ],
      icon: "snow-outline",
      themeColor: "#0284C7",
      bgTint: "#E0F2FE",
    },
    {
      day: 2,
      shortLabel: "Oxidation",
      stageName: "Day 2: Pigment Oxidation",
      headline: "Superficial Pigment Darkening & Macrophage Activation",
      expectedSymptoms: [
        "Flushing has completely disappeared; normal skin tone restored",
        "Freckles, sun spots, or melasma patches look slightly darker (normal pigment oxidation)",
        "No scab formation or raw peeling",
      ],
      careInstructions: [
        "Wash with gentle non-foaming hydrating cleanser and lukewarm water",
        "Apply hydrating serum containing Hyaluronic Acid and Niacinamide",
        "Reapply broad-spectrum mineral SPF 50 every 2 hours when exposed to daylight",
      ],
      icon: "eye-outline",
      themeColor: "#0D9488",
      bgTint: "#CCFBF1",
    },
    {
      day: 3,
      shortLabel: "Micro-Clear",
      stageName: "Day 3: Melanosome Shedding",
      headline: "Cellular Melanosome Phagocytosis & Gentle Sloughing",
      expectedSymptoms: [
        "Treated pigment spots may exhibit faint, microscopic dusty flaking during washing",
        "Skin texture feels smooth with zero discomfort or itching",
        "Dermal clearing process underway beneath the surface",
      ],
      careInstructions: [
        "Allow microscopic melanin particles to wash off naturally; do NOT rub or scrub",
        "Continue intense barrier hydration with ceramide emulsion",
        "Avoid saunas, steam rooms, and intense facial workouts for 48 hours",
      ],
      icon: "leaf-outline",
      themeColor: "#D97706",
      bgTint: "#FEF3C7",
    },
    {
      day: 4,
      shortLabel: "Barrier",
      stageName: "Day 4: Barrier Stabilization",
      headline: "Stratum Corneum Equilibrium & Pigment Lightening",
      expectedSymptoms: [
        "Darkened spots begin visibly lightening and blending with baseline skin tone",
        "Skin feels balanced, calm, and free of sensitivity",
        "Moisture retention and skin barrier fully stabilized",
      ],
      careInstructions: [
        "Gentle mineral SPF 50+ reapplication mandatory every 2 hours",
        "Moisturize twice daily with squalane or barrier repair cream",
        "Keep active exfoliating acids (AHA/BHA/Retinol) paused",
      ],
      icon: "shield-checkmark-outline",
      themeColor: "#2563EB",
      bgTint: "#DBEAFE",
    },
    {
      day: 5,
      shortLabel: "Brightening",
      stageName: "Day 5: Melanin Suppression",
      headline: "Tyrosinase Suppression & Melanin Stabilization",
      expectedSymptoms: [
        "Noticeable reduction in dermal pigment density and spot intensity",
        "Uniform facial glow without blotchiness",
        "Cellular barrier completely intact and resilient",
      ],
      careInstructions: [
        "Can introduce mild antioxidant serums (Vitamin E, Niacinamide) if cleared",
        "Continue rigorous broad-spectrum UV protection to prevent rebound PIH",
        "Drink at least 2.5 liters of water to support cellular hydration",
      ],
      icon: "sparkles-outline",
      themeColor: "#7C3AED",
      bgTint: "#F3E8FF",
    },
    {
      day: 6,
      shortLabel: "Clarity",
      stageName: "Day 6: Deep Dermal Clarity",
      headline: "Dermal Remodeling & Vascular Settling",
      expectedSymptoms: [
        "Complexion looks luminous, clear, and rejuvenated",
        "Pigmentation clusters visibly broken up and fading",
        "No residual redness or sensitivity under light touch",
      ],
      careInstructions: [
        "Standard gentle AM/PM skincare routine can be maintained",
        "Continue daily SPF 50 mineral protection discipline",
        "Avoid chemical peels or harsh dermabrasion for another week",
      ],
      icon: "heart-outline",
      themeColor: "#4F46E5",
      bgTint: "#EEF2FF",
    },
    {
      day: 7,
      shortLabel: "Radiance",
      stageName: "Day 7: Optimal Pigment Clarity",
      headline: "Maximum Pigment Clearance & Porcelain Glow",
      expectedSymptoms: [
        "Clear, refreshed, and visibly uniform skin tone",
        "Noticeable lightening of sun spots and melasma borders",
        "Melanocytes stabilized in healthy resting phase",
      ],
      careInstructions: [
        "Full routine maintenance with high-factor mineral SPF",
        "Schedule maintenance toning session in 3 to 4 weeks if recommended",
        "Consult dermatologist before re-introducing prescription retinoids",
      ],
      icon: "sunny",
      themeColor: "#059669",
      bgTint: "#ECFDF5",
    },
  ],

  // 3. PICO GENESIS LASER (Picosecond)
  "Pico Genesis Laser": [
    {
      day: 1,
      shortLabel: "Calming",
      stageName: "Day 1: Photoacoustic Calming",
      headline: "Sub-Picosecond Acoustic Wave Dissipation",
      expectedSymptoms: [
        "Mild transient pinkness or slight tingling lasting only 1 to 3 hours",
        "Zero open surface injury, peeling, or crusting whatsoever",
        "Skin looks instantly refreshed once minor flushing subsides",
      ],
      careInstructions: [
        "Apply cold compress or calming Centella gel if residual warmth persists",
        "Apply ultra-light soothing barrier moisturizer",
        "Mineral SPF 50 is mandatory before any window daylight or outdoor exposure",
      ],
      icon: "snow-outline",
      themeColor: "#0D9488",
      bgTint: "#CCFBF1",
    },
    {
      day: 2,
      shortLabel: "Zero Downtime",
      stageName: "Day 2: Epidermal Resilience",
      headline: "Normal Appearance & Melanin Particle Clearance",
      expectedSymptoms: [
        "Zero downtime visible; skin appears completely normal to observers",
        "Slight darkening of superficial brown spots as pigment is shattered into dust",
        "Skin feels soft, comfortable, and clean",
      ],
      careInstructions: [
        "Gentle cleanse with lukewarm water and mild barrier cleanser",
        "Light makeup or tinted mineral SPF may be worn safely",
        "Reapply SPF 50 every 2 hours throughout daylight hours",
      ],
      icon: "shield-checkmark-outline",
      themeColor: "#0284C7",
      bgTint: "#E0F2FE",
    },
    {
      day: 3,
      shortLabel: "Micro-Clear",
      stageName: "Day 3: Pigment Dust Clearance",
      headline: "Macrophage Phagocytosis of Micro-Pigment Dust",
      expectedSymptoms: [
        "Microscopic shattered pigment particles processing naturally",
        "Skin feels silky smooth without any rough patches",
        "Gradual enhancement in skin luminosity and clarity",
      ],
      careInstructions: [
        "Do not use abrasive face scrubs or cleansing brushes",
        "Hydrate deeply with Hyaluronic Acid and Panthenol serum",
        "Normal routine can continue with focus on barrier comfort",
      ],
      icon: "leaf-outline",
      themeColor: "#D97706",
      bgTint: "#FEF3C7",
    },
    {
      day: 4,
      shortLabel: "Collagen",
      stageName: "Day 4: Optical Breakdown Remodeling",
      headline: "Laser-Induced Optical Breakdown (LIOB) Activation",
      expectedSymptoms: [
        "Deep dermis initiates fibroblast collagen & elastin synthesis",
        "Skin looks bright, smooth, and revitalized",
        "Zero irritation, flaking, or dryness",
      ],
      careInstructions: [
        "Apply peptide-rich barrier moisturizer morning and evening",
        "Avoid direct baking in midday sun or tanning salons",
        "Stay well-hydrated throughout the day",
      ],
      icon: "sparkles-outline",
      themeColor: "#7C3AED",
      bgTint: "#F3E8FF",
    },
    {
      day: 5,
      shortLabel: "Refinement",
      stageName: "Day 5: Textural Refinement",
      headline: "Pore Minimization & Pigment Dissolution",
      expectedSymptoms: [
        "Refinement in pore appearance and overall epidermal grain",
        "Stubborn patches of pigment look lighter and softer around edges",
        "Healthy natural skin radiance",
      ],
      careInstructions: [
        "Continue gentle barrier-supportive skincare",
        "Mild active ingredients like 5% Niacinamide can be resumed",
        "Maintain rigorous SPF 50 protection",
      ],
      icon: "water-outline",
      themeColor: "#2563EB",
      bgTint: "#DBEAFE",
    },
    {
      day: 6,
      shortLabel: "Radiance",
      stageName: "Day 6: Radiance Rebound",
      headline: "Cellular Energy Peak & Tone Brightness",
      expectedSymptoms: [
        "Complexion feels bouncy, elastic, and luminous",
        "Zero pigment flare or rebound redness",
        "Skin reflects light evenly and looks glass-like",
      ],
      careInstructions: [
        "Gentle antioxidant serum (Vitamin C ester / Ferulic) can be resumed if tolerated",
        "Consistent broad-spectrum mineral protection",
        "Avoid harsh chemical peels",
      ],
      icon: "heart-outline",
      themeColor: "#4F46E5",
      bgTint: "#EEF2FF",
    },
    {
      day: 7,
      shortLabel: "Pico Glow",
      stageName: "Day 7: Peak Pico Luminescence",
      headline: "Optimal Cellular Rejuvenation & Porcelain Finish",
      expectedSymptoms: [
        "Maximum glow achieved with visible lightening of pigmentation",
        "Pore structure refined, skin barrier strong and resilient",
        "Zero peeling or social downtime experienced throughout",
      ],
      careInstructions: [
        "Maintenance phase: keep up daily SPF 50 discipline",
        "Schedule next session in 3-4 weeks for cumulative pigment clearance",
        "Enjoy smooth, clear, camera-ready skin",
      ],
      icon: "sunny",
      themeColor: "#059669",
      bgTint: "#ECFDF5",
    },
  ],

  // 4. IPL PHOTOFACIAL (Broadband Light)
  "IPL Photofacial": [
    {
      day: 1,
      shortLabel: "Heat Relief",
      stageName: "Day 1: Thermal Dissipation",
      headline: "Selective Photothermolysis & Erythema Relief",
      expectedSymptoms: [
        "Skin feels hot and sunburned for 2 to 4 hours post-treatment",
        "Redness and localized swelling around freckles and broken capillaries",
        "Sun spots begin darkening immediately into deeper brown",
      ],
      careInstructions: [
        "Apply cold gel pack wrapped in clean cloth for 10-15 minutes at a time",
        "Apply sterile Aloe Vera or Cica recovery gel generously",
        "Elevate head with an extra pillow tonight to reduce morning puffiness",
      ],
      icon: "snow-outline",
      themeColor: "#E11D48",
      bgTint: "#FFE4E6",
    },
    {
      day: 2,
      shortLabel: "Crusting",
      stageName: "Day 2: 'Coffee Ground' Darkening",
      headline: "Micro-Crusting of Targeted Melanin ('Coffee Grounds')",
      expectedSymptoms: [
        "Sun spots and freckles turn dark brown or black like fine coffee ground specks",
        "Mild redness subsides into a faint pink flush",
        "Skin feels dry or slightly rough over pigmented areas",
      ],
      careInstructions: [
        "Wash with lukewarm water and non-abrasive gentle cleanser only",
        "Do NOT pick, scratch, or try to scrub off darkened specks",
        "Apply generous layer of barrier moisturizer and mineral SPF 50",
      ],
      icon: "eye-outline",
      themeColor: "#D97706",
      bgTint: "#FEF3C7",
    },
    {
      day: 3,
      shortLabel: "Specks",
      stageName: "Day 3: Pigment Speck Isolation",
      headline: "Epidermal Migration of Micro-Pigment Debris",
      expectedSymptoms: [
        "Darkened spots remain visible as tiny dark specks on the skin surface",
        "Warmth and sensitivity completely resolved",
        "Itchy sensation as skin naturally preps to shed specks",
      ],
      careInstructions: [
        "Apply soothing Ceramide or Hyaluronic serum to alleviate dryness",
        "CRITICAL: Let spots detach naturally on their own; early detachment causes scars",
        "Strictly avoid direct sun and UV exposure",
      ],
      icon: "leaf-outline",
      themeColor: "#D97706",
      bgTint: "#FFFBEB",
    },
    {
      day: 4,
      shortLabel: "Sloughing",
      stageName: "Day 4: Natural Sloughing of Spots",
      headline: "Gentle Natural Shedding of Pigment Specks",
      expectedSymptoms: [
        "Coffee ground specks begin naturally lifting off while washing face",
        "Fresh, unpigmented clear skin is revealed underneath",
        "Diffuse vascular redness noticeably diminished",
      ],
      careInstructions: [
        "Pat dry with clean towel; no rubbing or friction",
        "Keep applying rich barrier hydration to support new skin",
        "100% Mineral Zinc Oxide SPF 50 whenever near windows or outdoors",
      ],
      icon: "water-outline",
      themeColor: "#0284C7",
      bgTint: "#E0F2FE",
    },
    {
      day: 5,
      shortLabel: "Calming",
      stageName: "Day 5: Vascular Calming & Clearance",
      headline: "Vascular Collapse & Melanin Clearance",
      expectedSymptoms: [
        "70-90% of coffee ground specks have naturally rinsed away",
        "Broken capillaries appear faded, broken down, or invisible",
        "Skin feels soft, calm, and visibly more uniform",
      ],
      careInstructions: [
        "Continue gentle washing routine",
        "Avoid hot baths, saunas, steam rooms, or spicy foods that trigger flushing",
        "Hydrate with non-comedogenic ceramide lotion",
      ],
      icon: "sparkles-outline",
      themeColor: "#0D9488",
      bgTint: "#CCFBF1",
    },
    {
      day: 6,
      shortLabel: "Evenness",
      stageName: "Day 6: Tone Evenness & Barrier Shield",
      headline: "Stratum Corneum Smoothing & Tone Unification",
      expectedSymptoms: [
        "Complexion looks clean, bright, and markedly even",
        "Lingering specks have fully sloughed away",
        "No redness or sensitivity under light touch",
      ],
      careInstructions: [
        "Mineral SPF 50+ reapplication every 2-3 hours",
        "Light makeup can be applied effortlessly on smooth skin",
        "Keep active acids and retinol paused for another 2 days",
      ],
      icon: "shield-checkmark-outline",
      themeColor: "#7C3AED",
      bgTint: "#F3E8FF",
    },
    {
      day: 7,
      shortLabel: "Radiance",
      stageName: "Day 7: Photorejuvenated Radiance",
      headline: "Comprehensive Photofacial Clarity & Glow",
      expectedSymptoms: [
        "Dramatic reduction in brown sun spots, freckles, and redness",
        "Skin looks radiant, clear, and rejuvenated",
        "Pigment clearance complete for this session",
      ],
      careInstructions: [
        "Dermatologist follow-up or schedule next session in 4 weeks",
        "Gradually reintroduce active skincare with physician clearance",
        "Maintain daily mineral SPF 50 to preserve your clear results",
      ],
      icon: "sunny",
      themeColor: "#059669",
      bgTint: "#ECFDF5",
    },
  ],

  // 5. MICRONEEDLING RF
  "Microneedling RF": [
    {
      day: 1,
      shortLabel: "Punctures",
      stageName: "Day 1: Micro-Punctures & Tightness",
      headline: "Thermal RF Coagulation & Micro-Channel Closure",
      expectedSymptoms: [
        "Redness, grid-mark impressions, and pinpoint scabs across treatment zones",
        "Warm, tight, sunburned sensation lasting 4 to 8 hours",
        "Micro-channels open for first 4-6 hours post-treatment",
      ],
      careInstructions: [
        "Do NOT wash face for first 6 hours; sterile saline or doctor serum only",
        "Apply only sterile pure Hyaluronic Acid or growth factor ampoules",
        "Sleep on a fresh, clean pillowcase with head slightly elevated",
      ],
      icon: "snow-outline",
      themeColor: "#E11D48",
      bgTint: "#FFE4E6",
    },
    {
      day: 2,
      shortLabel: "Grid Settling",
      stageName: "Day 2: Grid Settling & Barrier Shield",
      headline: "Epithelial Micro-Channel Closure & Barrier Seal",
      expectedSymptoms: [
        "Micro-channels completely closed; skin turns pink with faint grid pattern",
        "Mild swelling around eyes or jawline depending on RF depth",
        "Skin feels dry and tight like parchment paper",
      ],
      careInstructions: [
        "Gentle rinse with lukewarm water; no soap or scrubbing",
        "Apply bland Ceramide/Panthenol balm to prevent moisture evaporation",
        "NO makeup, tinted sunscreen, or chemical SPF today",
      ],
      icon: "shield-checkmark-outline",
      themeColor: "#D97706",
      bgTint: "#FEF3C7",
    },
    {
      day: 3,
      shortLabel: "Micro-Crusts",
      stageName: "Day 3: Pinpoint Micro-Crusts",
      headline: "Stratum Corneum Keratinocyte Renewal",
      expectedSymptoms: [
        "Tiny microscopic crusts at pin sites feel like fine sandpaper",
        "Swelling has largely dissipated; pinkness fading to normal",
        "Itchiness indicating active cellular repair",
      ],
      careInstructions: [
        "Do NOT scratch or pick pin-prick crusts",
        "Cleanse with ultra-gentle soapless cleanser",
        "Mineral Zinc Oxide SPF 50 now permitted and mandatory",
      ],
      icon: "leaf-outline",
      themeColor: "#D97706",
      bgTint: "#FFFBEB",
    },
    {
      day: 4,
      shortLabel: "Collagen",
      stageName: "Day 4: Deep Collagen Induction",
      headline: "Fibroblast Thermal Coagulation Neocollagenesis",
      expectedSymptoms: [
        "Sandpaper grid texture naturally sloughs off during washing",
        "Skin tone returns to baseline with noticeable early skin tightening",
        "Zero open wounds or bleeding",
      ],
      careInstructions: [
        "Continue generous hydration with hyaluronic acid and ceramides",
        "Drink 2.5-3 liters of water to support dermal matrix rebuilding",
        "Avoid gym workouts that produce heavy sweating today",
      ],
      icon: "water-outline",
      themeColor: "#0284C7",
      bgTint: "#E0F2FE",
    },
    {
      day: 5,
      shortLabel: "Refinement",
      stageName: "Day 5: Dermal Texture Refinement",
      headline: "Epidermal Consolidation & Pore Tightening",
      expectedSymptoms: [
        "Micro-grid marks completely resolved",
        "Visible refinement in skin tightness, pore architecture, and firmness",
        "Soft, smooth skin surface",
      ],
      careInstructions: [
        "Light non-comedogenic makeup can be resumed safely",
        "Continue broad-spectrum mineral SPF 50 protection",
        "Gentle hydrating masks permitted",
      ],
      icon: "sparkles-outline",
      themeColor: "#0D9488",
      bgTint: "#CCFBF1",
    },
    {
      day: 6,
      shortLabel: "Firmness",
      stageName: "Day 6: Tissue Remodeling",
      headline: "Elastin Synthesis & Dermal Remodeling",
      expectedSymptoms: [
        "Subdermal tightening effect continues to develop",
        "Skin feels resilient, bouncy, and structurally strengthened",
        "Pore size noticeably reduced",
      ],
      careInstructions: [
        "Moisturize twice daily with peptide and ceramide creams",
        "Strict daily sun protection",
        "Avoid chemical peels or facial waxing",
      ],
      icon: "heart-outline",
      themeColor: "#7C3AED",
      bgTint: "#F3E8FF",
    },
    {
      day: 7,
      shortLabel: "Taut Glow",
      stageName: "Day 7: Compact Dermal Lift & Glow",
      headline: "Acute Healing Complete • 90-Day Neocollagenesis Active",
      expectedSymptoms: [
        "Skin looks firm, taut, revitalized, and smoothly textured",
        "Acne scar indentations showing initial shallowing",
        "Dermal collagen will continue producing for 12 weeks",
      ],
      careInstructions: [
        "Dermatologist follow-up; plan next session in 4 to 6 weeks",
        "Gradually resume active skincare (retinoids, vitamin C) if cleared",
        "Maintain daily mineral SPF 50 discipline",
      ],
      icon: "sunny",
      themeColor: "#059669",
      bgTint: "#ECFDF5",
    },
  ],

  // 6. ERBIUM GLASS LASER (Non-Ablative Fractional)
  "Erbium Glass Laser": [
    {
      day: 1,
      shortLabel: "Heat Relief",
      stageName: "Day 1: Micro-Thermal Zone Heat",
      headline: "Micro-Thermal Coagulation & Erythema Relief",
      expectedSymptoms: [
        "Intense sunburn sensation and noticeable facial redness",
        "Mild puffy edema around cheeks and under eyes",
        "Stratum corneum intact with microscopic coagulated zones (MTZs)",
      ],
      careInstructions: [
        "Apply cold saline compresses for 10 minutes every hour as needed",
        "Generously layer doctor-prescribed Cica balm or Panthenol cream",
        "Sleep with head elevated on 2 pillows to prevent fluid pooling",
      ],
      icon: "snow-outline",
      themeColor: "#E11D48",
      bgTint: "#FFE4E6",
    },
    {
      day: 2,
      shortLabel: "Bronzing",
      stageName: "Day 2: Sandpaper Bronzing",
      headline: "MENDs Formation & Stratum Corneum Bronzing",
      expectedSymptoms: [
        "Skin develops a tanned/bronzed cast and feels like fine sandpaper",
        "Peak swelling begins subsiding by afternoon",
        "Skin feels tight and dry under fingertip touch",
      ],
      careInstructions: [
        "Wash gently with lukewarm water and ultra-mild cleanser",
        "Do NOT scrub or try to buff away the bronzed sandpaper texture",
        "Apply rich barrier lipid cream every 3-4 hours",
      ],
      icon: "shield-checkmark-outline",
      themeColor: "#D97706",
      bgTint: "#FEF3C7",
    },
    {
      day: 3,
      shortLabel: "MENDs Shed",
      stageName: "Day 3: MENDs Exfoliation",
      headline: "Microscopic Epidermal Necrotic Debris (MENDs) Release",
      expectedSymptoms: [
        "Bronzed sandpaper particles gently start shedding during face washing",
        "Mild itching indicating active epidermal regeneration",
        "Pink fresh skin peeking through shed zones",
      ],
      careInstructions: [
        "Keep skin continuously drenched in barrier moisturizer",
        "Strictly NO picking or pulling at flaking MENDs",
        "100% Mineral Zinc Oxide SPF 50+ indoors and outdoors",
      ],
      icon: "leaf-outline",
      themeColor: "#D97706",
      bgTint: "#FFFBEB",
    },
    {
      day: 4,
      shortLabel: "Renewal",
      stageName: "Day 4: Rapid Re-Epithelialization",
      headline: "Epidermal Barrier Re-establishment & Collagen Boost",
      expectedSymptoms: [
        "Most sandpaper bronzing has detached from cheeks and chin",
        "Skin appears fresh, pink, and noticeably tighter",
        "Warmth and tenderness completely gone",
      ],
      careInstructions: [
        "Continue applying ceramide and squalane moisture shields",
        "Drink 2.5-3 liters of water to support dermal matrix hydration",
        "Avoid hot saunas, gym sweat, or chlorine",
      ],
      icon: "water-outline",
      themeColor: "#0284C7",
      bgTint: "#E0F2FE",
    },
    {
      day: 5,
      shortLabel: "Smoothing",
      stageName: "Day 5: Texture Smoothing",
      headline: "Basement Membrane Restoration & Texture Refinement",
      expectedSymptoms: [
        "Forehead and temples finish shedding remaining roughness",
        "Skin feels dramatically softer, smoother, and silky to the touch",
        "Residual pinkness dissipates into healthy radiance",
      ],
      careInstructions: [
        "Introduce gentle Hyaluronic Acid serum beneath barrier cream",
        "Light mineral makeup can be applied smoothly",
        "Continue strict 2-hour mineral SPF 50 reapplication",
      ],
      icon: "sparkles-outline",
      themeColor: "#0D9488",
      bgTint: "#CCFBF1",
    },
    {
      day: 6,
      shortLabel: "Plumping",
      stageName: "Day 6: Deep Dermal Plumping",
      headline: "Dermal Neocollagenesis & Hydration Rebound",
      expectedSymptoms: [
        "Skin feels deeply hydrated, elastic, and visibly revitalized",
        "Fine lines and shallow acne scars appear softer and blurred",
        "Complete barrier comfort without tightness",
      ],
      careInstructions: [
        "Standard gentle routine with rich antioxidant hydration",
        "Avoid harsh chemical peels or exfoliants for 7 more days",
        "Daily high-protection mineral SPF discipline",
      ],
      icon: "heart-outline",
      themeColor: "#7C3AED",
      bgTint: "#F3E8FF",
    },
    {
      day: 7,
      shortLabel: "Glass Skin",
      stageName: "Day 7: Glass-Skin Refinement",
      headline: "Complete Non-Ablative Resurfacing & Long-Term Collagen",
      expectedSymptoms: [
        "Radiant, smooth, refined 'glass skin' texture",
        "Substantial improvement in pore size and scar depth",
        "Fibroblasts actively producing collagen for 90 days",
      ],
      careInstructions: [
        "Schedule next session in 4 to 6 weeks for cumulative remodeling",
        "Resume active skincare slowly with doctor's approval",
        "Celebrate glowing, rejuvenated skin",
      ],
      icon: "sunny",
      themeColor: "#059669",
      bgTint: "#ECFDF5",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// PROTOCOL-SPECIFIC CLINICAL DO'S & DON'TS CHECKLISTS
// ─────────────────────────────────────────────────────────────────────────────

export const LASER_CHECKLISTS: Record<LaserTreatmentType, ChecklistItem[]> = {
  // 1. CO2 FRACTIONAL RESURFACING
  "CO2 Fractional Resurfacing": [
    {
      id: "co2-do-1",
      type: "do",
      title: "Apply Broad-Spectrum Mineral SPF 50",
      desc: "Use Zinc Oxide/Titanium Dioxide every 2 hours when daylight is present.",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "co2-do-2",
      type: "do",
      title: "Hydrate Barrier with Ceramide Balm",
      desc: "Locks in transepidermal moisture and accelerates epithelial closure.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "co2-do-3",
      type: "do",
      title: "Wash with Gentle Soapless Cleanser",
      desc: "Use lukewarm water and gentle patting motions. No rubbing or washcloths.",
      category: "Cleansing",
      completed: false,
    },
    {
      id: "co2-do-4",
      type: "do",
      title: "Sleep Slightly Elevated on Clean Pillows",
      desc: "Elevation minimizes post-laser facial lymphatic edema and puffiness.",
      category: "Lifestyle",
      completed: true,
    },
    {
      id: "co2-do-5",
      type: "do",
      title: "Mist with Thermal Spring Water",
      desc: "Soothes thermal heat and delivers calming trace minerals (selenium, zinc).",
      category: "Barrier Care",
      completed: false,
    },
    {
      id: "co2-dont-1",
      type: "dont",
      title: "No Direct Sun Exposure",
      desc: "UV radiation on post-laser skin risks severe Post-Inflammatory Hyperpigmentation (PIH).",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "co2-dont-2",
      type: "dont",
      title: "Do Not Pick, Peel, or Scratch Skin",
      desc: "Prematurely detaching micro-crusts causes scarring and uneven dermal tone.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "co2-dont-3",
      type: "dont",
      title: "Avoid Retinol, AHAs, BHAs & Vitamin C",
      desc: "Stop all active exfoliating acids and potent actives until skin fully heals.",
      category: "Active Skincare",
      completed: true,
    },
    {
      id: "co2-dont-4",
      type: "dont",
      title: "No Heavy Sweating, Gym, or Saunas",
      desc: "Excess thermal heat and salt in sweat provoke stinging and secondary infection.",
      category: "Lifestyle",
      completed: false,
    },
    {
      id: "co2-dont-5",
      type: "dont",
      title: "Avoid Fragranced or Alcohol Skincare",
      desc: "Chemical fragrances and denatured alcohol induce contact dermatitis.",
      category: "Active Skincare",
      completed: true,
    },
  ],

  // 2. Q-SWITCHED ND:YAG
  "Q-Switched Nd:YAG": [
    {
      id: "yag-do-1",
      type: "do",
      title: "Apply Broad-Spectrum Mineral SPF 50 (PA++++)",
      desc: "Essential to prevent rebound melanocyte hyperactivity and post-toning PIH.",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "yag-do-2",
      type: "do",
      title: "Cool Flushing with Chilled Thermal Mist",
      desc: "Dissipates sub-nanosecond photoacoustic warmth and calms facial capillaries.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "yag-do-3",
      type: "do",
      title: "Hydrate with Niacinamide & Ceramides",
      desc: "Supports cellular lipid barrier and prevents post-treatment transepidermal water loss.",
      category: "Barrier Care",
      completed: false,
    },
    {
      id: "yag-do-4",
      type: "do",
      title: "Allow Darkened Spots to Clear Naturally",
      desc: "Microscopic oxidized pigment flakes away smoothly during normal gentle washing.",
      category: "Cleansing",
      completed: true,
    },
    {
      id: "yag-do-5",
      type: "do",
      title: "Sleep on Clean Silk or Soft Cotton Case",
      desc: "Minimizes mechanical friction on delicate treated skin overnight.",
      category: "Lifestyle",
      completed: true,
    },
    {
      id: "yag-dont-1",
      type: "dont",
      title: "No Direct Midday Sun Exposure",
      desc: "Pigment-treated skin is ultra-susceptible to rebound hyperpigmentation.",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "yag-dont-2",
      type: "dont",
      title: "Avoid Facial Friction, Scrubbing, or Brushes",
      desc: "Aggressive friction stimulates inflammatory melanosome production.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "yag-dont-3",
      type: "dont",
      title: "Pause Exfoliating Acids (AHA/BHA/Retinol)",
      desc: "Hold active resurfacing acids for 5 days to protect the sensitized barrier.",
      category: "Active Skincare",
      completed: true,
    },
    {
      id: "yag-dont-4",
      type: "dont",
      title: "Avoid Saunas, Steam & Heavy Sweating (48h)",
      desc: "Thermal facial heating triggers unwanted vascular dilation and melasma flares.",
      category: "Lifestyle",
      completed: false,
    },
    {
      id: "yag-dont-5",
      type: "dont",
      title: "No Unapproved Bleaching Creams",
      desc: "Avoid hydroquinone or strong lightening agents unless specifically doctor-cleared.",
      category: "Active Skincare",
      completed: true,
    },
  ],

  // 3. PICO GENESIS LASER
  "Pico Genesis Laser": [
    {
      id: "pico-do-1",
      type: "do",
      title: "Apply Broad-Spectrum Mineral SPF 50 Daily",
      desc: "Protects shattered pigment particles from UV-triggered melanin reload.",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "pico-do-2",
      type: "do",
      title: "Soothe with Centella Asiatica & Panthenol",
      desc: "Calms brief 1-2 hour post-laser warmth and supports instant cellular comfort.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "pico-do-3",
      type: "do",
      title: "Deeply Hydrate with Pure Hyaluronic Acid",
      desc: "Fuels cellular turnover and LIOB collagen remodeling in the dermis.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "pico-do-4",
      type: "do",
      title: "Cleanse with Gentle Non-Stripping Cleanser",
      desc: "Maintains skin pH while washing off environmental particulates.",
      category: "Cleansing",
      completed: false,
    },
    {
      id: "pico-do-5",
      type: "do",
      title: "Resume Gentle Skincare After 24 Hours",
      desc: "Pico genesis has virtually zero downtime; gentle makeup and serums are fine.",
      category: "Lifestyle",
      completed: true,
    },
    {
      id: "pico-dont-1",
      type: "dont",
      title: "No Direct UV Tanning or Sunbathing",
      desc: "Protects the newly stimulated dermal matrix from acute photoaging.",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "pico-dont-2",
      type: "dont",
      title: "Avoid Harsh Physical Scrubs (48 Hours)",
      desc: "No exfoliating beads, konjac sponges, or scrubbing devices required.",
      category: "Cleansing",
      completed: true,
    },
    {
      id: "pico-dont-3",
      type: "dont",
      title: "Avoid High-Strength Chemical Peels (7 Days)",
      desc: "Allow picosecond acoustic remodeling to work without chemical trauma.",
      category: "Active Skincare",
      completed: true,
    },
    {
      id: "pico-dont-4",
      type: "dont",
      title: "Avoid Scalding Hot Showers for 24 Hours",
      desc: "Helps skin microvasculature return to neutral baseline quickly.",
      category: "Lifestyle",
      completed: false,
    },
    {
      id: "pico-dont-5",
      type: "dont",
      title: "Do Not Scratch or Pick Treated Spots",
      desc: "Shattered micro-pigment is removed internally by immune macrophages.",
      category: "Barrier Care",
      completed: true,
    },
  ],

  // 4. IPL PHOTOFACIAL
  "IPL Photofacial": [
    {
      id: "ipl-do-1",
      type: "do",
      title: "Apply Cool Compresses for Immediate Heat",
      desc: "Wrap cold gel pack in clean cloth for 10-15 mins to soothe light-induced heat.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "ipl-do-2",
      type: "do",
      title: "Let 'Coffee Ground' Spots Slough Naturally",
      desc: "Darkened melanin specks will wash off effortlessly between Days 3 and 6.",
      category: "Cleansing",
      completed: true,
    },
    {
      id: "ipl-do-3",
      type: "do",
      title: "Apply 100% Mineral Zinc Oxide SPF 50 Diligently",
      desc: "Shields newly cleared pigment and coagulated capillaries from sunlight.",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "ipl-do-4",
      type: "do",
      title: "Hydrate with Aloe & Ceramide Recovery Gel",
      desc: "Relieves dry, patchy tightness without trapping excess thermal heat.",
      category: "Barrier Care",
      completed: false,
    },
    {
      id: "ipl-do-5",
      type: "do",
      title: "Sleep Slightly Elevated on Night 1",
      desc: "Reduces next-morning periorbital and cheek swelling significantly.",
      category: "Lifestyle",
      completed: true,
    },
    {
      id: "ipl-dont-1",
      type: "dont",
      title: "NEVER Pick, Scratch, or Buff Off Dark Specks",
      desc: "Forcibly removing darkened spots causes permanent hypopigmentation scars.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "ipl-dont-2",
      type: "dont",
      title: "No Direct Sunlight or Outdoor Sunbathing",
      desc: "Direct UV provokes aggressive melasma flare and reverses photofacial results.",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "ipl-dont-3",
      type: "dont",
      title: "Avoid Saunas, Steam Rooms & Hot Yoga (48h)",
      desc: "Capillaries expand with heat, reversing vascular photocoagulation.",
      category: "Lifestyle",
      completed: false,
    },
    {
      id: "ipl-dont-4",
      type: "dont",
      title: "Avoid Retinol, Glycolic & Salicylic Acids (5 Days)",
      desc: "Prevents stinging and contact irritation on photocoagulated pigment zones.",
      category: "Active Skincare",
      completed: true,
    },
    {
      id: "ipl-dont-5",
      type: "dont",
      title: "Avoid Strenuous Cardio for 48 Hours",
      desc: "Keeps heart rate and facial vascular flushing calm during acute recovery.",
      category: "Lifestyle",
      completed: false,
    },
  ],

  // 5. MICRONEEDLING RF
  "Microneedling RF": [
    {
      id: "rf-do-1",
      type: "do",
      title: "Use Sterile Saline / Pure Hyaluronic Acid (Day 1)",
      desc: "Micro-channels remain open for hours; only sterile hydration is safe.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "rf-do-2",
      type: "do",
      title: "Sleep on Clean Pillowcase with Head Elevated",
      desc: "Prevents nocturnal bacterial transfer and relieves RF lymphatic swelling.",
      category: "Lifestyle",
      completed: true,
    },
    {
      id: "rf-do-3",
      type: "do",
      title: "Apply Barrier Ceramide Cream (Day 2 Onwards)",
      desc: "Once micro-channels close, ceramide balm speeds epithelial remodeling.",
      category: "Barrier Care",
      completed: false,
    },
    {
      id: "rf-do-4",
      type: "do",
      title: "Apply Mineral Zinc Oxide SPF 50 Once Sealed",
      desc: "Broad-spectrum mineral barrier shields healing punctures from photoaging.",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "rf-do-5",
      type: "do",
      title: "Drink 2.5–3 Liters of Water Daily",
      desc: "Deep dermal hydration fuels neocollagenesis and tissue tightening.",
      category: "Lifestyle",
      completed: true,
    },
    {
      id: "rf-dont-1",
      type: "dont",
      title: "NO Makeup or Tinted Products for 24–48 Hours",
      desc: "Cosmetic particles can enter open micro-channels and cause granulomas.",
      category: "Lifestyle",
      completed: true,
    },
    {
      id: "rf-dont-2",
      type: "dont",
      title: "Do NOT Touch Face with Unwashed Hands",
      desc: "Micro-punctures require sterile conditions to avoid secondary infection.",
      category: "Cleansing",
      completed: true,
    },
    {
      id: "rf-dont-3",
      type: "dont",
      title: "Avoid Sweating, Gym, Saunas & Steam (48–72h)",
      desc: "Sweat salts sting and introduce bacteria into healing needle punctures.",
      category: "Lifestyle",
      completed: false,
    },
    {
      id: "rf-dont-4",
      type: "dont",
      title: "Do NOT Scratch or Pick Pinpoint Crusts",
      desc: "Micro-crusts at pin sites must detach on their own for smooth contour.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "rf-dont-5",
      type: "dont",
      title: "Avoid Swimming Pools & Chlorinated Water (7 Days)",
      desc: "Harsh chemicals and pool pathogens severely irritate RF micro-channels.",
      category: "Lifestyle",
      completed: true,
    },
  ],

  // 6. ERBIUM GLASS LASER
  "Erbium Glass Laser": [
    {
      id: "erb-do-1",
      type: "do",
      title: "Apply Chilled Saline Compresses for Initial Heat",
      desc: "Soothes non-ablative micro-thermal zones (MTZs) and cools facial flushing.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "erb-do-2",
      type: "do",
      title: "Apply Rich Ceramide Barrier Cream Every 3-4 Hours",
      desc: "Maintains moisture shield over sandpaper-textured bronzed skin.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "erb-do-3",
      type: "do",
      title: "Rigorous 100% Mineral Zinc Oxide SPF 50 Protection",
      desc: "Blocks UVA/UVB photo-injury to vulnerable micro-thermal channels.",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "erb-do-4",
      type: "do",
      title: "Wash with Lukewarm Water & Soapless Cleanser",
      desc: "Ultra-gentle cleansing preserves delicate stratum corneum re-alignment.",
      category: "Cleansing",
      completed: false,
    },
    {
      id: "erb-do-5",
      type: "do",
      title: "Sleep Slightly Elevated on Clean Pillows",
      desc: "Minimizes post-laser facial lymphatic puffiness during Nights 1 and 2.",
      category: "Lifestyle",
      completed: true,
    },
    {
      id: "erb-dont-1",
      type: "dont",
      title: "Do NOT Scrub or Buff Off Bronzed MENDs",
      desc: "Sandpaper texture must detach naturally during gentle washing.",
      category: "Barrier Care",
      completed: true,
    },
    {
      id: "erb-dont-2",
      type: "dont",
      title: "No Direct Sun Exposure or UV Tanning",
      desc: "Extreme risk of post-inflammatory hyperpigmentation on MTZ zones.",
      category: "Sun Protection",
      completed: true,
    },
    {
      id: "erb-dont-3",
      type: "dont",
      title: "Avoid Retinoids, AHA/BHA Acids & Vitamin C (7 Days)",
      desc: "Active acids provoke contact dermatitis and irritation on MTZ channels.",
      category: "Active Skincare",
      completed: true,
    },
    {
      id: "erb-dont-4",
      type: "dont",
      title: "Avoid Saunas, Steam Rooms & Heavy Sweating (72h)",
      desc: "Excess thermal heat and salt in sweat cause stinging and erythema flare.",
      category: "Lifestyle",
      completed: false,
    },
    {
      id: "erb-dont-5",
      type: "dont",
      title: "Avoid Fragranced or Alcohol Skincare",
      desc: "Denatured alcohol and synthetic perfumes irritate regenerating epidermis.",
      category: "Active Skincare",
      completed: true,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// PROTOCOL ACCESSORS & BACKWARD COMPATIBILITY
// ─────────────────────────────────────────────────────────────────────────────

export function getLaserProtocolMeta(laserType?: LaserTreatmentType): LaserProtocolMeta {
  if (laserType && ALL_LASER_PROTOCOLS_META[laserType]) {
    return ALL_LASER_PROTOCOLS_META[laserType];
  }
  return ALL_LASER_PROTOCOLS_META["CO2 Fractional Resurfacing"];
}

export function getHealingTimelineForLaser(laserType?: LaserTreatmentType): HealingDayInfo[] {
  if (laserType && LASER_TIMELINES[laserType]) {
    return LASER_TIMELINES[laserType];
  }
  return LASER_TIMELINES["CO2 Fractional Resurfacing"];
}

export function getChecklistForLaser(laserType?: LaserTreatmentType): ChecklistItem[] {
  if (laserType && LASER_CHECKLISTS[laserType]) {
    return LASER_CHECKLISTS[laserType];
  }
  return LASER_CHECKLISTS["CO2 Fractional Resurfacing"];
}

// Backward-compatible aliases for legacy imports
export const HEALING_TIMELINE_DAYS: HealingDayInfo[] =
  LASER_TIMELINES["CO2 Fractional Resurfacing"];

export const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] =
  LASER_CHECKLISTS["CO2 Fractional Resurfacing"];

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
