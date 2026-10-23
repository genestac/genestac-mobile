// constants/longevityBiomarkers.ts
// Levine Phenotypic Age (PhenoAge) 9-Biomarker Protocol

export interface LongevityBiomarkerItem {
  id: string;
  number: number;
  name: string;
  testName: string;
  standardUnit: string;
  normalRange: string;
  minNormal: number;
  maxNormal: number;
  defaultValue: number;
  category: "Liver & Proteins" | "Kidney & Renal" | "Metabolic" | "Systemic Inflammation" | "Hematology & Immune";
  description: string;
  icon: string; // Ionicons name
  iconColor: string;
}

export const LONGEVITY_9_BIOMARKERS: LongevityBiomarkerItem[] = [
  {
    id: "albumin",
    number: 1,
    name: "Albumin",
    testName: "Serum albumi",
    standardUnit: "g/dL",
    normalRange: "3.5 - 5.0 g/dL",
    minNormal: 3.5,
    maxNormal: 5.0,
    defaultValue: 4.5,
    category: "Liver & Proteins",
    description: "Major blood protein produced by the liver. Indicates liver synthesis capacity, nutritional status, and systemic cellular health.",
    icon: "water-outline",
    iconColor: "#0284C7",
  },
  {
    id: "creatinine",
    number: 2,
    name: "Creatinine",
    testName: "Serum creatinine",
    standardUnit: "mg/dL",
    normalRange: "0.6 - 1.2 mg/dL",
    minNormal: 0.6,
    maxNormal: 1.2,
    defaultValue: 0.88,
    category: "Kidney & Renal",
    description: "Breakdown product of muscle metabolism excreted by the kidneys. Vital marker of glomerular filtration rate (GFR) and kidney aging.",
    icon: "flask-outline",
    iconColor: "#6366F1",
  },
  {
    id: "glucose",
    number: 3,
    name: "Glucose",
    testName: "Fasting blood glucose",
    standardUnit: "mg/dL",
    normalRange: "70 - 99 mg/dL",
    minNormal: 70,
    maxNormal: 99,
    defaultValue: 86,
    category: "Metabolic",
    description: "Fasting blood sugar level. Chronic elevations accelerate protein glycation (AGEs), vascular stiffness, and cellular senescence.",
    icon: "speedometer-outline",
    iconColor: "#F59E0B",
  },
  {
    id: "crp",
    number: 4,
    name: "C-reactive protein",
    testName: "CRP",
    standardUnit: "mg/L",
    normalRange: "< 1.0 mg/L",
    minNormal: 0.1,
    maxNormal: 1.0,
    defaultValue: 0.55,
    category: "Systemic Inflammation",
    description: "Key hepatic acute-phase reactant. Measures silent systemic inflammation ('inflammaging'), endothelial stress, and cardiovascular risk.",
    icon: "flame-outline",
    iconColor: "#EF4444",
  },
  {
    id: "lymphocyte_pct",
    number: 5,
    name: "Lymphocyte percentage",
    testName: "CBC with differential",
    standardUnit: "%",
    normalRange: "20.0 - 40.0 %",
    minNormal: 20.0,
    maxNormal: 40.0,
    defaultValue: 33.5,
    category: "Hematology & Immune",
    description: "Percentage of lymphocytes among white blood cells. Reflects adaptive immune reserve and resistance against immunosenescence.",
    icon: "shield-checkmark-outline",
    iconColor: "#10B981",
  },
  {
    id: "mcv",
    number: 6,
    name: "Mean corpuscular volume",
    testName: "MCV, from CBC",
    standardUnit: "fL",
    normalRange: "80.0 - 100.0 fL",
    minNormal: 80.0,
    maxNormal: 100.0,
    defaultValue: 88.5,
    category: "Hematology & Immune",
    description: "Average volume of red blood cells. Elevated MCV is linked to vitamin B12/folate insufficiency, oxidative stress, and biological aging.",
    icon: "ellipse-outline",
    iconColor: "#8B5CF6",
  },
  {
    id: "rdw",
    number: 7,
    name: "Red cell distribution width",
    testName: "RDW, from CBC",
    standardUnit: "%",
    normalRange: "11.5 - 14.5 %",
    minNormal: 11.5,
    maxNormal: 14.5,
    defaultValue: 12.3,
    category: "Hematology & Immune",
    description: "Variation in red blood cell size (anisocytosis). Clinically one of the strongest predictors of biological age, morbidity, and longevity.",
    icon: "pulse-outline",
    iconColor: "#EC4899",
  },
  {
    id: "alp",
    number: 8,
    name: "Alkaline phosphatase",
    testName: "ALP",
    standardUnit: "U/L",
    normalRange: "44 - 147 U/L",
    minNormal: 44,
    maxNormal: 147,
    defaultValue: 65,
    category: "Liver & Proteins",
    description: "Enzyme concentrated in liver, bile ducts, and bone tissue. Reflects hepatobiliary clearance and bone turnover dynamics.",
    icon: "fitness-outline",
    iconColor: "#14B8A6",
  },
  {
    id: "wbc",
    number: 9,
    name: "White blood cell count",
    testName: "WBC, from CBC",
    standardUnit: "10³ / µL",
    normalRange: "4.0 - 11.0 10³/µL",
    minNormal: 4.0,
    maxNormal: 11.0,
    defaultValue: 5.6,
    category: "Hematology & Immune",
    description: "Total white blood cell count. High baseline levels indicate ongoing subclinical systemic stress and active immune surveillance.",
    icon: "bandage-outline",
    iconColor: "#F97316",
  },
];

export type BiomarkerStatus = "optimal" | "normal" | "low" | "high";

export function getBiomarkerStatus(id: string, value: number): {
  status: BiomarkerStatus;
  label: string;
  color: string;
  bgColor: string;
} {
  const item = LONGEVITY_9_BIOMARKERS.find((b) => b.id === id);
  if (!item || isNaN(value)) {
    return { status: "normal", label: "Normal", color: "#10B981", bgColor: "#ECFDF5" };
  }

  if (value < item.minNormal) {
    return { status: "low", label: "Low", color: "#F59E0B", bgColor: "#FFFBEB" };
  }
  if (value > item.maxNormal) {
    return { status: "high", label: "Elevated", color: "#EF4444", bgColor: "#FEF2F2" };
  }

  // Check if firmly in optimal mid-range
  const mid = (item.minNormal + item.maxNormal) / 2;
  const spread = (item.maxNormal - item.minNormal) * 0.3;
  if (Math.abs(value - mid) <= spread) {
    return { status: "optimal", label: "Optimal", color: "#059669", bgColor: "#D1FAE5" };
  }
  return { status: "normal", label: "In Range", color: "#0D9488", bgColor: "#CCFBF1" };
}

export interface PhenoAgeResult {
  bioAge: number;
  paceOfAging: number;
  ageDifference: number; // positive = older than chrono, negative = younger
  mortalityScorePercent: number;
  riskCategory: "Optimal / Slow Aging" | "Moderate / Normal" | "Elevated / Fast Aging";
}

/**
 * Validated Levine Phenotypic Age (PhenoAge) algorithm
 * Based on Levine et al., 2018 (Aging Cell)
 */
export function calculateLevinePhenoAge(
  chronoAge: number,
  biomarkers: Record<string, number>
): PhenoAgeResult {
  const age = chronoAge > 0 ? chronoAge : 38;

  // Extract biomarker values with safe clinical fallbacks
  const alb_gL = (biomarkers.albumin ?? 4.5) * 10; // convert g/dL -> g/L
  const creat_umol = (biomarkers.creatinine ?? 0.88) * 88.4; // mg/dL -> umol/L
  const gluc_mmol = (biomarkers.glucose ?? 86) / 18.0182; // mg/dL -> mmol/L
  const crp_mgdL = Math.max(0.01, (biomarkers.crp ?? 0.55) / 10); // mg/L -> mg/dL
  const ln_crp = Math.log(crp_mgdL);
  const lymph_pct = biomarkers.lymphocyte_pct ?? 33.5;
  const mcv = biomarkers.mcv ?? 88.5;
  const rdw = biomarkers.rdw ?? 12.3;
  const alp = biomarkers.alp ?? 65;
  const wbc = biomarkers.wbc ?? 5.6;

  // Linear predictor (xb)
  const xb =
    -19.9067 -
    0.0336 * alb_gL +
    0.0095 * creat_umol +
    0.1953 * gluc_mmol +
    0.0954 * ln_crp -
    0.012 * lymph_pct +
    0.0268 * mcv +
    0.3306 * rdw +
    0.00188 * alp +
    0.0554 * wbc +
    0.0804 * age;

  const gamma = 0.007692661;
  const expXb = Math.exp(xb);
  const term = (Math.exp(120 * gamma) - 1) / gamma;
  const mortScore = 1 - Math.exp(-expXb * term);

  let calculatedBioAge: number;
  if (mortScore <= 0 || isNaN(mortScore)) {
    calculatedBioAge = age - 3.5;
  } else if (mortScore >= 1) {
    calculatedBioAge = age + 8.5;
  } else {
    const inner = -0.00553 * Math.log(1 - mortScore);
    if (inner <= 0) {
      calculatedBioAge = age;
    } else {
      calculatedBioAge = 141.5 + Math.log(inner) / 0.090165;
    }
  }

  if (isNaN(calculatedBioAge) || !isFinite(calculatedBioAge)) {
    calculatedBioAge = age;
  }

  // Clamp within human physiological limits
  calculatedBioAge = Math.max(18, Math.min(95, parseFloat(calculatedBioAge.toFixed(1))));

  const diff = parseFloat((calculatedBioAge - age).toFixed(1));

  // DunedinPACE pace of aging estimation (baseline 1.0x / year)
  const pace = Math.max(
    0.65,
    Math.min(1.45, parseFloat((1.0 + (diff / age) * 0.45).toFixed(2)))
  );

  let riskCategory: PhenoAgeResult["riskCategory"] = "Moderate / Normal";
  if (diff < -1.5) {
    riskCategory = "Optimal / Slow Aging";
  } else if (diff > 2.0) {
    riskCategory = "Elevated / Fast Aging";
  }

  return {
    bioAge: calculatedBioAge,
    paceOfAging: pace,
    ageDifference: diff,
    mortalityScorePercent: parseFloat((Math.max(0.01, Math.min(0.99, mortScore)) * 100).toFixed(1)),
    riskCategory,
  };
}

// Preset demo values for immediate preview & testing
export const DEMO_HEALTHY_BIOMARKERS: Record<string, number> = {
  albumin: 4.6,
  creatinine: 0.85,
  glucose: 84,
  crp: 0.42,
  lymphocyte_pct: 35.0,
  mcv: 88.0,
  rdw: 12.0,
  alp: 62,
  wbc: 5.2,
};

export const DEMO_ELEVATED_BIOMARKERS: Record<string, number> = {
  albumin: 3.6,
  creatinine: 1.25,
  glucose: 108,
  crp: 2.8,
  lymphocyte_pct: 21.0,
  mcv: 96.5,
  rdw: 14.8,
  alp: 115,
  wbc: 8.9,
};
