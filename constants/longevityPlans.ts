export interface LongevityPlanItem {
  id: string;
  name: string;
  details: string;
  price: string;
  frequency?: string;
  badge?: string;
  note?: string;
}

export interface LongevityPlanSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  items: LongevityPlanItem[];
}

export const LONGEVITY_SECTIONS: LongevityPlanSection[] = [
  {
    id: "memberships",
    title: "Annual Membership Packages",
    subtitle: "Comprehensive 12-month longevity programs tailored for complete health optimization",
    icon: "ribbon",
    items: [
      {
        id: "b1",
        name: "Longevity Essential",
        price: "₹24,900 / year",
        details: "Initial physician consultation; comprehensive preventive blood panel; biomarker biological age; body composition; nutrition consultation; personalized lifestyle protocol; 1 physician review.",
        badge: "Essential",
      },
      {
        id: "b2",
        name: "Longevity Advanced",
        price: "₹59,900 / year",
        details: "Everything in Essential plus advanced blood panel, cardiovascular age/risk, inflammation assessment, hormone assessment, functional-age testing, sleep assessment, 2 quarterly reviews and annual strategy review.",
        badge: "Popular",
      },
      {
        id: "b3",
        name: "Longevity Precision",
        price: "₹1,19,000 / year",
        details: "Advanced program plus advanced epigenetic age test, DEXA body composition/bone health, VO₂ assessment, micronutrient panel, wearable/CGM review, 4 quarterly physician reviews and priority care coordination.",
        badge: "Precision",
      },
      {
        id: "b4",
        name: "Longevity Concierge",
        price: "₹1,95,000 / year",
        details: "Precision-level diagnostics plus high-touch physician program, monthly health-coach/nutrition touchpoints, quarterly blood review, continuous app-based tracking, specialist coordination and priority appointment access. IV therapies/medicines billed separately.",
        badge: "VIP Concierge",
      },
      {
        id: "b5",
        name: "Executive Couple Program",
        price: "₹1,05,000 / couple / year",
        details: "Paired Advanced program for two adults with coordinated screening, lifestyle planning and annual review. Advanced epigenetic testing not included.",
        badge: "For Couples",
      },
    ],
  },
  {
    id: "alacarte",
    title: "À-la-Carte Services",
    subtitle: "Individual longevity diagnostic panels, consultations, and specialized protocols",
    icon: "fitness",
    items: [
      {
        id: "a1",
        name: "Longevity Physician Consultation – Initial",
        details: "60–75 min physician assessment, history, risk map, goals, baseline plan",
        price: "₹4,500",
        frequency: "One-time / as required",
      },
      {
        id: "a2",
        name: "Longevity Physician Review",
        details: "30–45 min review of results, progress and protocol adjustment",
        price: "₹2,500",
        frequency: "Every 8–12 weeks",
      },
      {
        id: "a3",
        name: "Comprehensive Preventive Blood Panel",
        details: "CBC, liver, kidney, glucose/HbA1c, lipids, thyroid, uric acid, electrolytes, urine, Vit D/B12, iron/ferritin, hs-CRP and selected risk markers",
        price: "₹6,500",
        frequency: "6–12 monthly",
      },
      {
        id: "a4",
        name: "Advanced Longevity Blood Panel",
        details: "Expanded metabolic, cardiovascular, inflammation, nutrition and hormone biomarkers; physician interpretation",
        price: "₹12,500",
        frequency: "6–12 monthly",
      },
      {
        id: "a5",
        name: "Biological Age – Biomarker/PhenoAge Assessment",
        details: "Clinical biomarker-derived biological age, organ-system risk summary and action plan",
        price: "₹4,500",
        frequency: "6–12 monthly",
      },
      {
        id: "a6",
        name: "Advanced Epigenetic Biological Age Test",
        details: "DNA methylation / epigenetic clock, pace-of-aging and organ-age outputs where available",
        price: "₹55,000",
        frequency: "12–24 monthly",
      },
      {
        id: "a7",
        name: "Metabolic Age & Insulin-Resistance Assessment",
        details: "Fasting metabolic markers, HbA1c, insulin/HOMA-IR where indicated, waist/body composition and physician interpretation",
        price: "₹5,500",
        frequency: "6 monthly",
      },
      {
        id: "a8",
        name: "Cardiovascular Age & Risk Assessment",
        details: "BP, lipids, ApoB, Lp(a) where indicated, ECG; risk calculation and prevention plan; imaging billed separately",
        price: "₹7,500",
        frequency: "Annual",
      },
      {
        id: "a9",
        name: "Inflammation & Immune-Risk Assessment",
        details: "hs-CRP, ESR and clinically selected inflammatory/immune markers with interpretation",
        price: "₹5,500",
        frequency: "6–12 monthly",
      },
      {
        id: "a10",
        name: "Hormone Health Assessment – Male",
        details: "Testosterone, SHBG/free-T assessment where appropriate, LH/FSH, prolactin, thyroid and relevant metabolic markers; physician review",
        price: "₹8,500",
        frequency: "6–12 monthly",
      },
      {
        id: "a11",
        name: "Hormone Health Assessment – Female",
        details: "Cycle-/age-appropriate reproductive hormones, thyroid, prolactin and metabolic assessment; physician review",
        price: "₹8,500",
        frequency: "6–12 monthly",
      },
      {
        id: "a12",
        name: "Micronutrient Status Panel",
        details: "Key vitamins/minerals and deficiency-risk review; extended specialty micronutrient panels quoted separately",
        price: "₹9,500",
        frequency: "Annual",
      },
      {
        id: "a13",
        name: "Body Composition & Visceral Fat Assessment",
        details: "BIA/advanced body composition, muscle mass, fat %, visceral-fat estimate and target setting",
        price: "₹2,500",
        frequency: "Quarterly",
      },
      {
        id: "a14",
        name: "DEXA Body Composition / Bone Health Add-on",
        details: "DEXA scan coordination and physician interpretation where clinically indicated",
        price: "₹6,500",
        frequency: "Annual / indicated",
      },
      {
        id: "a15",
        name: "Functional Age & Strength Assessment",
        details: "Grip strength, gait/sit-to-stand, mobility, balance, flexibility and functional-age score",
        price: "₹3,500",
        frequency: "6 monthly",
      },
      {
        id: "a16",
        name: "Cardiorespiratory Fitness / VO₂ Assessment",
        details: "Field or lab-based fitness assessment; aerobic capacity and exercise zones; CPET where available priced separately",
        price: "₹5,500",
        frequency: "6–12 monthly",
      },
      {
        id: "a17",
        name: "Sleep Optimization Assessment",
        details: "Sleep-risk screen, wearable review, sleep hygiene protocol; sleep study referral if indicated",
        price: "₹4,500",
        frequency: "Initial + review",
      },
      {
        id: "a18",
        name: "Nutrition & Longevity Consultation",
        details: "60 min dietitian/nutritionist consult, personalized nutrition targets and meal framework",
        price: "₹2,500",
        frequency: "Monthly / quarterly",
      },
      {
        id: "a19",
        name: "Physician-Led Supplementation Plan",
        details: "Evidence-based supplement review, interaction screening, dose schedule and 8–12 week reassessment",
        price: "₹3,500",
        frequency: "Per plan cycle",
      },
      {
        id: "a20",
        name: "Personalized Lifestyle & Longevity Protocol",
        details: "Integrated sleep, exercise, nutrition, stress, weight, recovery and biomarker action plan",
        price: "₹5,000",
        frequency: "Per protocol",
      },
      {
        id: "a21",
        name: "Wearable / CGM Data Review",
        details: "14-day or 30-day glucose/activity/sleep data interpretation and action plan; device cost extra",
        price: "₹4,500",
        frequency: "Per cycle",
      },
      {
        id: "a22",
        name: "NAD+ / Cellular-Energy Medical Assessment",
        details: "Eligibility, contraindication screen, baseline review and physician prescription decision where appropriate",
        price: "₹2,500",
        frequency: "Before therapy",
      },
      {
        id: "a23",
        name: "NAD+ IV Session – Physician Supervised",
        details: "Clinic infusion when medically appropriate; final price varies by dose, product and infusion time",
        price: "₹18,000–₹30,000",
        frequency: "Per session",
      },
      {
        id: "a24",
        name: "IV Micronutrient / Hydration Therapy – Physician Supervised",
        details: "Individualized IV formulation only after medical screening; ingredients and dose determine price",
        price: "₹8,000–₹18,000",
        frequency: "Per session",
      },
      {
        id: "a25",
        name: "Quarterly Longevity Review",
        details: "Physician review + body composition + focused repeat biomarkers + protocol update",
        price: "₹7,500",
        frequency: "Quarterly",
      },
      {
        id: "a26",
        name: "Annual Longevity Strategy Review",
        details: "Year-end comparison of biomarkers, biological age, cardiovascular/metabolic risk, body composition and next-year plan",
        price: "₹9,500",
        frequency: "Annual",
      },
    ],
  },
  {
    id: "addons",
    title: "High-Value Optional Add-ons",
    subtitle: "Specialized diagnostic imaging, sensor tracking, and genetic testing options",
    icon: "add-circle",
    items: [
      {
        id: "c1",
        name: "Coronary calcium score / cardiac imaging",
        price: "At actual + coordination fee",
        details: "Only if clinically appropriate and ordered by physician.",
        note: "Clinical indication required",
      },
      {
        id: "c2",
        name: "Sleep study / polysomnography",
        price: "At actual + ₹1,500 review fee",
        details: "For suspected sleep apnea or other sleep disorder.",
        note: "Diagnostic screen",
      },
      {
        id: "c3",
        name: "CGM sensor",
        price: "Device cost + ₹4,500 interpretation cycle",
        details: "Useful for selected metabolic-risk patients; not mandatory for everyone.",
        note: "Glucose tracking",
      },
      {
        id: "c4",
        name: "Genetic risk / pharmacogenomics panel",
        price: "₹18,000–₹45,000",
        details: "Panel scope and lab determine pricing; genetic counseling where relevant.",
        note: "Genomic screening",
      },
      {
        id: "c5",
        name: "Advanced micronutrient / metabolomics testing",
        price: "₹18,000–₹35,000",
        details: "Use selectively where results are likely to change management.",
        note: "Selective diagnostics",
      },
      {
        id: "c6",
        name: "Specialist consultation coordination",
        price: "₹2,000 care-coordination fee + specialist fee",
        details: "Cardiology, endocrinology, sleep, sports medicine, etc.",
        note: "Specialist network",
      },
    ],
  },
];
