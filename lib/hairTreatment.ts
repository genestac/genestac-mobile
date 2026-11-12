// lib/hairTreatment.ts
// Clinical Data Store, Stage Classifications (Norwood/Ludwig), Daily Protocol & Shedding Tracker for Hair Restoration

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export const STORAGE_KEY_HAIR_TREATMENT = "@genestac_hair_treatment_v4";

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type HairPhotoAngle = "crown" | "hairline" | "temples";

export interface HairProgressionPhoto {
  id: string;
  angle: HairPhotoAngle;
  photoUri: string;
  dayNumber: number; // e.g. 1, 30, 60, 90, 180
  date: string; // ISO
  caption?: string;
  ghostOverlayUsed?: boolean;
  notes?: string;
}

export type HairLossPattern = "norwood" | "ludwig";

export type NorwoodStage =
  | "Stage I"
  | "Stage II"
  | "Stage IIa"
  | "Stage III"
  | "Stage III-Vertex"
  | "Stage IV"
  | "Stage V"
  | "Stage VI"
  | "Stage VII";

export type LudwigStage =
  | "Grade I-1"
  | "Grade I-2"
  | "Grade I-3"
  | "Grade II-1"
  | "Grade II-2"
  | "Grade III"
  | "Advanced Diffuse";

export type StabilizationStatus =
  | "Active Regrowth"
  | "Stabilized (No Progression)"
  | "Early Stabilization"
  | "Temporary Shedding Phase"
  | "Active Thinning / Needs Protocol Adjustment";

export interface HairStageAssessment {
  id: string;
  pattern: HairLossPattern;
  selectedStage: NorwoodStage | LudwigStage;
  recordedDate: string; // ISO
  stabilizationStatus: StabilizationStatus;
  dhtRisk: "Low" | "Moderate" | "High" | "Very High" | "Severe";
  stabilizationConfidence: number; // 0 - 100%
  recommendedTherapies: string[];
  notes?: string;
}

export type DailyProtocolKey =
  | "topical_serum"
  | "scalp_massage"
  | "laser_cap"
  | "oral_medication";

export interface DailyProtocolItem {
  id: string;
  key: DailyProtocolKey;
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  completed: boolean;
  dosage: string;
  time?: string;
  durationMinutes?: number;
  instructions: string;
}

export type HairSheddingLevel = "low" | "normal" | "heavy";

export interface SheddingLog {
  id: string;
  date: string; // ISO
  weekNumber: number;
  sheddingLevel: HairSheddingLevel;
  estimatedHairsLost: string; // e.g. "< 50 hairs", "50–100 hairs", "> 100 hairs"
  densityRating: number; // 1 to 5
  scalpSymptoms: string[]; // e.g. ["Healthy", "Itchiness", "Dandruff/Flaking", "Redness", "Trichodynia"]
  minoxidilPhaseNotice?: boolean;
  notes?: string;
}

export interface HairTreatmentProfile {
  photos: HairProgressionPhoto[];
  currentStageAssessment: HairStageAssessment;
  stageHistory: HairStageAssessment[];
  dailyProtocol: {
    todayItems: DailyProtocolItem[];
    streak: number;
    lastCompletedDate: string;
    laserCapDurationSeconds: number; // default 600 (10 mins)
  };
  sheddingLogs: SheddingLog[];
  treatmentStartDate: string; // ISO
  lastUpdatedDate: string; // ISO
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL METADATA: NORWOOD (MALE) & LUDWIG (FEMALE) STAGES
// ─────────────────────────────────────────────────────────────────────────────

export interface StageClinicalMeta {
  stage: NorwoodStage | LudwigStage;
  pattern: HairLossPattern;
  title: string;
  shortLabel: string;
  severity: "Minimal" | "Mild" | "Moderate" | "Advanced" | "Severe";
  hairlineDescription: string;
  crownDescription: string;
  dhtSensitivity: "Low" | "Moderate" | "High" | "Very High";
  stabilizationGoal: string;
  treatments: string[];
  surgicalCandidacy: "Not Indicated" | "Premature" | "Good Candidate" | "Ideal Candidate" | "Limited Donor";
}

export const NORWOOD_STAGES_META: Record<NorwoodStage, StageClinicalMeta> = {
  "Stage I": {
    stage: "Stage I",
    pattern: "norwood",
    title: "Norwood Stage I — Juvenile / Pre-Loss",
    shortLabel: "Stage I",
    severity: "Minimal",
    hairlineDescription: "No significant hairline recession or thinning. Natural adolescent/juvenile hairline.",
    crownDescription: "Vertex is completely dense with full terminal follicles.",
    dhtSensitivity: "Low",
    stabilizationGoal: "Maintain density, scalp barrier optimization, and preventative baseline tracking.",
    treatments: ["Gentle ketoconazole shampoo", "Scalp micro-circulation massage", "Biotin & nutritional support"],
    surgicalCandidacy: "Not Indicated",
  },
  "Stage II": {
    stage: "Stage II",
    pattern: "norwood",
    title: "Norwood Stage II — Mild Temporal Recession",
    shortLabel: "Stage II",
    severity: "Mild",
    hairlineDescription: "Mild symmetrical recession at frontotemporal angles. Mature adult hairline transitioning.",
    crownDescription: "Crown remains dense with no visible scalp exposure.",
    dhtSensitivity: "Moderate",
    stabilizationGoal: "Arrest further bitemporal recession and strengthen early miniaturizing follicles.",
    treatments: ["Topical Minoxidil 5% twice daily", "Low-Level Laser Therapy (LLLT 650nm)", "Oral Saw Palmetto / early DHT management", "Dermarolling 0.5mm"],
    surgicalCandidacy: "Premature",
  },
  "Stage IIa": {
    stage: "Stage IIa",
    pattern: "norwood",
    title: "Norwood Stage IIa — Anterior Hairline Recession",
    shortLabel: "Stage IIa",
    severity: "Mild",
    hairlineDescription: "Hairline recedes uniformly across the entire forehead, maintaining an anterior border.",
    crownDescription: "No thinning at the crown.",
    dhtSensitivity: "Moderate",
    stabilizationGoal: "Halt frontal boundary backward drift.",
    treatments: ["Topical Minoxidil 5%", "Oral Finasteride 1mg (physician evaluated)", "Scalp massage with peptides"],
    surgicalCandidacy: "Premature",
  },
  "Stage III": {
    stage: "Stage III",
    pattern: "norwood",
    title: "Norwood Stage III — Clinically Significant Recession",
    shortLabel: "Stage III",
    severity: "Moderate",
    hairlineDescription: "Deep symmetrical recession at temples forming characteristic 'M', 'U', or 'V' shape.",
    crownDescription: "Vertex remains preserved or shows very minimal initial wisps.",
    dhtSensitivity: "High",
    stabilizationGoal: "Anchor hairline, thicken miniaturized follicular units, and reverse early loss.",
    treatments: ["Oral Finasteride 1mg daily (DHT blocker)", "Topical Minoxidil 5%", "Red Light Laser Cap 10 mins daily", "PRP / PRF Scalp Injections"],
    surgicalCandidacy: "Good Candidate",
  },
  "Stage III-Vertex": {
    stage: "Stage III-Vertex",
    pattern: "norwood",
    title: "Norwood Stage III-Vertex — Hairline + Crown Thinning",
    shortLabel: "Stage III-V",
    severity: "Moderate",
    hairlineDescription: "Moderate recession at frontal temples with visible notch.",
    crownDescription: "Clear focal thinning circle appearing at the crown / vertex.",
    dhtSensitivity: "High",
    stabilizationGoal: "Close crown diameter and prevent frontal & crown junctions from merging.",
    treatments: ["Oral Finasteride 1mg + Topical Minoxidil 5%", "Red Light Laser Cap (LLLT)", "Microneedling 1.0mm weekly", "Exosome / PRP therapy"],
    surgicalCandidacy: "Good Candidate",
  },
  "Stage IV": {
    stage: "Stage IV",
    pattern: "norwood",
    title: "Norwood Stage IV — Deep Recession & Thinning Vertex",
    shortLabel: "Stage IV",
    severity: "Advanced",
    hairlineDescription: "Deep temporal recession with widening frontal island.",
    crownDescription: "Significant crown loss separated from frontal loss by a bridge of hair.",
    dhtSensitivity: "High",
    stabilizationGoal: "Reinforce the mid-scalp bridge and rebuild vertex density.",
    treatments: ["Oral Finasteride 1mg or Dutasteride 0.5mg", "High-potency Minoxidil + Tretinoin topical", "Daily Red Light Cap", "FUE Hair Transplant consideration"],
    surgicalCandidacy: "Ideal Candidate",
  },
  "Stage V": {
    stage: "Stage V",
    pattern: "norwood",
    title: "Norwood Stage V — Narrowing Scalp Bridge",
    shortLabel: "Stage V",
    severity: "Advanced",
    hairlineDescription: "Frontal recession merges toward vertex as the intervening band of hair thins.",
    crownDescription: "Enlarged crown bald zone with sparse follicle coverage.",
    dhtSensitivity: "Very High",
    stabilizationGoal: "Preserve lateral fringe and donor zone, densify thinning mid-scalp.",
    treatments: ["Triple protocol: Oral Finasteride + Dual topical + LLLT", "Doctor trichology review", "FUE Hair Restoration (2500–3500 grafts)"],
    surgicalCandidacy: "Ideal Candidate",
  },
  "Stage VI": {
    stage: "Stage VI",
    pattern: "norwood",
    title: "Norwood Stage VI — Confluent Frontal & Crown Loss",
    shortLabel: "Stage VI",
    severity: "Severe",
    hairlineDescription: "The hair bridge across the crown is lost. Frontal and crown baldness merge.",
    crownDescription: "Scalp bare across top; hair remains only on sides and back (horseshoe).",
    dhtSensitivity: "Very High",
    stabilizationGoal: "Prevent further descent of lateral borders and preserve safe donor area.",
    treatments: ["Systemic DHT inhibition (Finasteride/Dutasteride)", "Extensive FUE multi-session planning", "Scalp Micropigmentation (SMP)"],
    surgicalCandidacy: "Good Candidate",
  },
  "Stage VII": {
    stage: "Stage VII",
    pattern: "norwood",
    title: "Norwood Stage VII — Severe Horseshoe Pattern",
    shortLabel: "Stage VII",
    severity: "Severe",
    hairlineDescription: "Only a narrow band of hair survives around the back and sides.",
    crownDescription: "Scalp completely bare from frontal hairline through entire vertex.",
    dhtSensitivity: "Very High",
    stabilizationGoal: "Protect remaining donor follicles and maintain scalp dermal health.",
    treatments: ["Dermal scalp care & UV photoprotection", "Scalp Micropigmentation (SMP)", "Selective Body/Beard FUE transplant if donor permits"],
    surgicalCandidacy: "Limited Donor",
  },
};

export const LUDWIG_STAGES_META: Record<LudwigStage, StageClinicalMeta> = {
  "Grade I-1": {
    stage: "Grade I-1",
    pattern: "ludwig",
    title: "Ludwig Grade I-1 — Minimal Part Widening",
    shortLabel: "I-1",
    severity: "Minimal",
    hairlineDescription: "Frontal hairline is fully preserved with no recession.",
    crownDescription: "Subtle thinning along the central parting line.",
    dhtSensitivity: "Low",
    stabilizationGoal: "Stimulate micro-vascular supply and halt early miniaturization.",
    treatments: ["Topical Minoxidil 2% or 5% foam", "Ferritin, Vitamin D & Thyroid optimization", "Low-Level Light Therapy (LLLT)"],
    surgicalCandidacy: "Not Indicated",
  },
  "Grade I-2": {
    stage: "Grade I-2",
    pattern: "ludwig",
    title: "Ludwig Grade I-2 — Noticeable Mid-Part Widening",
    shortLabel: "I-2",
    severity: "Mild",
    hairlineDescription: "Frontal fringe intact, 1–2 cm front border preserved.",
    crownDescription: "Central part visibly widened when parted down the middle.",
    dhtSensitivity: "Moderate",
    stabilizationGoal: "Anchor follicle telogen-to-anagen transition.",
    treatments: ["Topical Minoxidil 5% daily", "Biotin + Zinc complex", "Laser Cap 10 mins 3x/week", "Scalp microneedling"],
    surgicalCandidacy: "Premature",
  },
  "Grade I-3": {
    stage: "Grade I-3",
    pattern: "ludwig",
    title: "Ludwig Grade I-3 — Moderate Diffuse Thinning",
    shortLabel: "I-3",
    severity: "Mild",
    hairlineDescription: "Front hairline preserved but density behind it is compromised.",
    crownDescription: "Scalp skin easily visible through the hair under bright overhead light.",
    dhtSensitivity: "Moderate",
    stabilizationGoal: "Reverse follicular shaft diameter reduction.",
    treatments: ["Topical Minoxidil 5%", "PRP / PRF therapy", "Oral Spironolactone (clinical consult)", "Red Light Laser Cap"],
    surgicalCandidacy: "Premature",
  },
  "Grade II-1": {
    stage: "Grade II-1",
    pattern: "ludwig",
    title: "Ludwig Grade II-1 — Pronounced Crown Thinning",
    shortLabel: "II-1",
    severity: "Moderate",
    hairlineDescription: "Frontal fringe remains intact but thinning reaches hairline margin.",
    crownDescription: "Noticeable reduction in hair volume and diameter across the entire mid-scalp.",
    dhtSensitivity: "High",
    stabilizationGoal: "Prevent follicular dropout and rebuild hair shaft density.",
    treatments: ["Oral Minoxidil (low-dose) or Topical 5%", "Anti-androgen therapy (Spironolactone/Finasteride under MD care)", "PRP with laser cap"],
    surgicalCandidacy: "Good Candidate",
  },
  "Grade II-2": {
    stage: "Grade II-2",
    pattern: "ludwig",
    title: "Ludwig Grade II-2 — Severe Part Line Expansion",
    shortLabel: "II-2",
    severity: "Moderate",
    hairlineDescription: "Front fringe thinning, central oval expanding outwards.",
    crownDescription: "Marked hair density deficit; scalp reflection visible in ambient room light.",
    dhtSensitivity: "High",
    stabilizationGoal: "Stabilize diffuse follicular loss and restore coverage.",
    treatments: ["Comprehensive systemic + topical multi-target protocol", "Doctor trichologist review", "LLLT 650nm sessions daily"],
    surgicalCandidacy: "Good Candidate",
  },
  "Grade III": {
    stage: "Grade III",
    pattern: "ludwig",
    title: "Ludwig Grade III — Extensive Top-of-Head Denudation",
    shortLabel: "Grade III",
    severity: "Advanced",
    hairlineDescription: "Very narrow wispy frontal hairline remains.",
    crownDescription: "Severe diffuse hair loss with substantial scalp show across the entire crown.",
    dhtSensitivity: "Very High",
    stabilizationGoal: "Maximize salvageable follicles and support scalp thickness.",
    treatments: ["Combined medical therapy + LLLT", "PRP/Stem cell factor therapy", "Female hair transplant / SMP"],
    surgicalCandidacy: "Good Candidate",
  },
  "Advanced Diffuse": {
    stage: "Advanced Diffuse",
    pattern: "ludwig",
    title: "Ludwig Advanced Diffuse — Generalized Thinning",
    shortLabel: "Diffuse",
    severity: "Severe",
    hairlineDescription: "Diffuse thinning across frontal and temporal zones.",
    crownDescription: "Global density loss involving crown, vertex, and lateral zones.",
    dhtSensitivity: "Very High",
    stabilizationGoal: "Systemic endocrine evaluation, scalp barrier resuscitation.",
    treatments: ["Endocrine & autoimmune hair panel", "Medical trichology protocol", "High-frequency red light therapy"],
    surgicalCandidacy: "Limited Donor",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT PROFILE WITH REALISTIC CLINICAL SAMPLES
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_DAILY_PROTOCOL_ITEMS: DailyProtocolItem[] = [
  {
    id: "proto_1",
    key: "topical_serum",
    title: "Topical Minoxidil 5% / Growth Serum",
    subtitle: "Morning & Night Application",
    badge: "Vasodilator",
    icon: "water-outline",
    completed: true,
    dosage: "1 mL (approx. 6 sprays or half dropper)",
    time: "08:30 AM",
    instructions: "Apply directly to dry scalp across hairline & crown. Gently tap with fingertips; do not wash hair for 4 hours.",
  },
  {
    id: "proto_2",
    key: "scalp_massage",
    title: "Scalp Massage & Micro-circulation",
    subtitle: "Myofascial Scalp Glide (4 Mins)",
    badge: "Blood Flow",
    icon: "hand-left-outline",
    completed: true,
    dosage: "4 Minutes",
    durationMinutes: 4,
    time: "09:00 AM",
    instructions: "Use fingertip pads in circular motions along galea aponeurotica to relieve scalp tension and boost dermal papilla perfusion.",
  },
  {
    id: "proto_3",
    key: "laser_cap",
    title: "Red Light Laser Cap (LLLT 650nm)",
    subtitle: "Photobiomodulation Session",
    badge: "10-Min Timer",
    icon: "sunny-outline",
    completed: false,
    dosage: "10 Minutes Session",
    durationMinutes: 10,
    instructions: "Wear cap over clean dry scalp. 650nm medical-grade laser diodes stimulate mitochondrial ATP in follicular cells.",
  },
  {
    id: "proto_4",
    key: "oral_medication",
    title: "Oral Finasteride 1mg / Biotin Complex",
    subtitle: "Systemic DHT Inhibition & Keratin Building",
    badge: "Oral Daily",
    icon: "medkit-outline",
    completed: true,
    dosage: "1 Tablet with water",
    time: "08:00 AM",
    instructions: "Inhibits 5-alpha reductase enzyme to decrease scalp DHT levels by up to ~70%, preventing follicular miniaturization.",
  },
];

// Built-in verified local clinical transformation assets (Exact same individual)
export const LOCAL_HAIR_ASSETS: Record<string, any> = {
  photo_hairline_d1: require("@/assets/images/hair/hairline_day1.jpg"),
  photo_hairline_d90: require("@/assets/images/hair/hairline_day90.jpg"),
  photo_crown_d1: require("@/assets/images/hair/crown_day1.jpg"),
  photo_crown_d90: require("@/assets/images/hair/crown_day90.jpg"),
  photo_temples_d1: require("@/assets/images/hair/temples_day1.jpg"),
  photo_temples_d90: require("@/assets/images/hair/temples_day90.jpg"),
};

export function resolveHairPhotoSource(
  photo: HairProgressionPhoto | null | undefined
): any {
  if (!photo) return undefined;
  if (LOCAL_HAIR_ASSETS[photo.id]) {
    return LOCAL_HAIR_ASSETS[photo.id];
  }
  if (typeof photo.photoUri === "number") {
    return photo.photoUri;
  }
  if (typeof photo.photoUri === "string") {
    if (LOCAL_HAIR_ASSETS[photo.photoUri]) {
      return LOCAL_HAIR_ASSETS[photo.photoUri];
    }
    return { uri: photo.photoUri };
  }
  return photo.photoUri;
}

// Sample baseline progression photos (Crown, Hairline, Temples) for instant interactive slider experience
// Represents the EXACT SAME 32-year-old male before and after 90 days of medical therapy
export const SAMPLE_HAIR_PHOTOS: HairProgressionPhoto[] = [
  {
    id: "photo_hairline_d1",
    angle: "hairline",
    photoUri: "photo_hairline_d1",
    dayNumber: 1,
    date: "2026-08-05T09:30:00.000Z",
    caption:
      "Day 1 Baseline — Frontal hairline recession (Norwood Stage III), temporal thinning with visible scalp.",
    ghostOverlayUsed: false,
  },
  {
    id: "photo_hairline_d90",
    angle: "hairline",
    photoUri: "photo_hairline_d90",
    dayNumber: 90,
    date: "2026-11-03T09:30:00.000Z",
    caption:
      "Day 90 Transformation — Exact same individual with filled-in temples, thick terminal hairline, +35% density.",
    ghostOverlayUsed: true,
  },
  {
    id: "photo_crown_d1",
    angle: "crown",
    photoUri: "photo_crown_d1",
    dayNumber: 1,
    date: "2026-08-05T09:40:00.000Z",
    caption:
      "Day 1 Baseline — Circular thinning zone at vertex whorl with visible scalp skin.",
    ghostOverlayUsed: false,
  },
  {
    id: "photo_crown_d90",
    angle: "crown",
    photoUri: "photo_crown_d90",
    dayNumber: 90,
    date: "2026-11-03T09:40:00.000Z",
    caption:
      "Day 90 Transformation — Exact same vertex angle, circular thinning closed with dense terminal coverage.",
    ghostOverlayUsed: true,
  },
  {
    id: "photo_temples_d1",
    angle: "temples",
    photoUri: "photo_temples_d1",
    dayNumber: 1,
    date: "2026-08-05T09:50:00.000Z",
    caption:
      "Day 1 Baseline — 45° lateral profile showing distinct fronto-temporal recession notch.",
    ghostOverlayUsed: false,
  },
  {
    id: "photo_temples_d90",
    angle: "temples",
    photoUri: "photo_temples_d90",
    dayNumber: 90,
    date: "2026-11-03T09:50:00.000Z",
    caption:
      "Day 90 Transformation — Exact same lateral angle, temporal notch filled with strong terminal hair peak.",
    ghostOverlayUsed: true,
  },
];

export const SAMPLE_SHEDDING_LOGS: SheddingLog[] = [
  {
    id: "shed_w1",
    date: "2026-09-10T10:00:00.000Z",
    weekNumber: 1,
    sheddingLevel: "normal",
    estimatedHairsLost: "50–80 hairs",
    densityRating: 3,
    scalpSymptoms: ["Healthy"],
    notes: "Baseline week before starting Minoxidil and LLLT cap.",
  },
  {
    id: "shed_w3",
    date: "2026-09-24T10:00:00.000Z",
    weekNumber: 3,
    sheddingLevel: "heavy",
    estimatedHairsLost: "120–150 hairs",
    densityRating: 2,
    scalpSymptoms: ["Mild Itchiness"],
    minoxidilPhaseNotice: true,
    notes: "Expected Minoxidil dread shed! Weak telogen club hairs being ejected by new anagen bulbs.",
  },
  {
    id: "shed_w6",
    date: "2026-10-15T10:00:00.000Z",
    weekNumber: 6,
    sheddingLevel: "normal",
    estimatedHairsLost: "60–80 hairs",
    densityRating: 3,
    scalpSymptoms: ["Healthy"],
    notes: "Shedding stabilized back to baseline. Scalp calm.",
  },
  {
    id: "shed_w10",
    date: "2026-11-01T10:00:00.000Z",
    weekNumber: 10,
    sheddingLevel: "low",
    estimatedHairsLost: "< 40 hairs",
    densityRating: 4,
    scalpSymptoms: ["Healthy"],
    notes: "Noticeable reduction in shower hair fall! Follicle retention is strong.",
  },
];

export const DEFAULT_HAIR_PROFILE: HairTreatmentProfile = {
  photos: SAMPLE_HAIR_PHOTOS,
  currentStageAssessment: {
    id: "stage_init_1",
    pattern: "norwood",
    selectedStage: "Stage III",
    recordedDate: "2026-08-05T09:00:00.000Z",
    stabilizationStatus: "Active Regrowth",
    dhtRisk: "High",
    stabilizationConfidence: 84,
    recommendedTherapies: [
      "Oral Finasteride 1mg daily",
      "Topical Minoxidil 5%",
      "Red Light Laser Cap (10 mins/day)",
      "Bimonthly Scalp Microneedling",
    ],
    notes: "Patient exhibiting classic Norwood III recession with early stabilization since starting triple therapy.",
  },
  stageHistory: [
    {
      id: "stage_hist_0",
      pattern: "norwood",
      selectedStage: "Stage III",
      recordedDate: "2026-08-05T09:00:00.000Z",
      stabilizationStatus: "Active Thinning / Needs Protocol Adjustment",
      dhtRisk: "High",
      stabilizationConfidence: 50,
      recommendedTherapies: ["Begin medical therapy"],
      notes: "Baseline consultation diagnosis.",
    },
    {
      id: "stage_hist_1",
      pattern: "norwood",
      selectedStage: "Stage III",
      recordedDate: "2026-11-03T09:00:00.000Z",
      stabilizationStatus: "Active Regrowth",
      dhtRisk: "High",
      stabilizationConfidence: 84,
      recommendedTherapies: [
        "Oral Finasteride 1mg daily",
        "Topical Minoxidil 5%",
        "Red Light Laser Cap (10 mins/day)",
      ],
      notes: "Day 90 evaluation: Follicle diameter +28%, shedding reduced to low.",
    },
  ],
  dailyProtocol: {
    todayItems: DEFAULT_DAILY_PROTOCOL_ITEMS,
    streak: 18,
    lastCompletedDate: new Date().toISOString().split("T")[0],
    laserCapDurationSeconds: 600, // 10 minutes
  },
  sheddingLogs: SAMPLE_SHEDDING_LOGS,
  treatmentStartDate: "2026-08-05T00:00:00.000Z",
  lastUpdatedDate: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE & PROFILE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function loadHairProfile(): Promise<HairTreatmentProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_HAIR_TREATMENT);
    if (!raw) {
      // Save default for first run
      await AsyncStorage.setItem(
        STORAGE_KEY_HAIR_TREATMENT,
        JSON.stringify(DEFAULT_HAIR_PROFILE)
      );
      return DEFAULT_HAIR_PROFILE;
    }
    const parsed = JSON.parse(raw) as HairTreatmentProfile;

    // Check if new day to reset today's protocol completion (preserving streak)
    const todayStr = new Date().toISOString().split("T")[0];
    if (parsed.dailyProtocol?.lastCompletedDate !== todayStr) {
      parsed.dailyProtocol.todayItems = (parsed.dailyProtocol.todayItems || DEFAULT_DAILY_PROTOCOL_ITEMS).map(
        (item) => ({ ...item, completed: false, time: undefined })
      );
      parsed.dailyProtocol.lastCompletedDate = todayStr;
    }

    // Ensure sample photos exist if empty, or migrate older pexels photos to same-person local assets
    if (!parsed.photos || parsed.photos.length === 0) {
      parsed.photos = SAMPLE_HAIR_PHOTOS;
    } else {
      parsed.photos = parsed.photos.map((p) => {
        if (LOCAL_HAIR_ASSETS[p.id]) {
          return {
            ...p,
            photoUri: p.id,
          };
        }
        return p;
      });
    }

    return parsed;
  } catch (err) {
    console.error("Error loading hair profile:", err);
    return DEFAULT_HAIR_PROFILE;
  }
}

export async function saveHairProfile(
  profile: HairTreatmentProfile
): Promise<void> {
  try {
    const dataToSave = {
      ...profile,
      lastUpdatedDate: new Date().toISOString(),
    };
    await AsyncStorage.setItem(
      STORAGE_KEY_HAIR_TREATMENT,
      JSON.stringify(dataToSave)
    );
  } catch (err) {
    console.error("Error saving hair profile:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function getPhotosByAngle(
  photos: HairProgressionPhoto[],
  angle: HairPhotoAngle
): HairProgressionPhoto[] {
  return photos
    .filter((p) => p.angle === angle)
    .sort((a, b) => a.dayNumber - b.dayNumber);
}

export function getComparisonPhotos(
  photos: HairProgressionPhoto[],
  angle: HairPhotoAngle,
  dayA: number = 1,
  dayB: number = 90
): { before: HairProgressionPhoto | null; after: HairProgressionPhoto | null } {
  const anglePhotos = getPhotosByAngle(photos, angle);
  if (anglePhotos.length === 0) {
    return { before: null, after: null };
  }

  // Exact matches or closest available
  let before = anglePhotos.find((p) => p.dayNumber === dayA);
  let after = anglePhotos.find((p) => p.dayNumber === dayB);

  if (!before && anglePhotos.length > 0) {
    before = anglePhotos[0];
  }
  if (!after && anglePhotos.length > 1) {
    after = anglePhotos[anglePhotos.length - 1];
  } else if (!after && before) {
    after = before;
  }

  return { before: before || null, after: after || null };
}

export function getStageMetadata(
  pattern: HairLossPattern,
  stage: NorwoodStage | LudwigStage
): StageClinicalMeta {
  if (pattern === "norwood") {
    return (
      NORWOOD_STAGES_META[stage as NorwoodStage] ||
      NORWOOD_STAGES_META["Stage III"]
    );
  } else {
    return (
      LUDWIG_STAGES_META[stage as LudwigStage] ||
      LUDWIG_STAGES_META["Grade I-2"]
    );
  }
}

export function calculateTreatmentDays(startDateStr: string): number {
  try {
    const start = new Date(startDateStr).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
    return diff || 90; // Default 90 if fresh
  } catch {
    return 90;
  }
}
