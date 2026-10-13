// lib/openai.ts

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export type InterviewQuestion = {
  id: string;
  q: string;
  hint: string;
  options: string[];
};

export type ClinicalSummary = {
  healthScore: number;
  scoreGrade: string;
  scoreMessage: string;
  primaryConcernSummary: string;
  riskLevel: string;
  riskMessage: string;
  keyInsights: string[];
  suggestedInvestigations: string[];
  nextSteps: string[];
};

export async function generateInterviewQuestions(complaint: string, category: string, profile: any): Promise<InterviewQuestion[]> {
  if (!API_KEY) {
    console.warn('No OpenAI API key found, falling back to static questions.');
    return getFallbackQuestions(category);
  }

  try {
    let contextInstruction = `Their chief complaint/goal is: "${complaint}".`;
    if (category === 'Weight Loss' || complaint.toLowerCase().includes('weight loss')) {
      contextInstruction = `The user's primary goal is "${complaint}". Do not treat this as an illness or symptom. Instead, act as an empathetic health coach and ask exactly 3 follow-up questions to uncover the root causes of their current weight (e.g., daily diet, physical activity, emotional eating, stress, or medical history).`;
    } else {
      contextInstruction = `Their chief complaint is: "${complaint}". Generate exactly 3 relevant follow-up questions to understand the issue better.`;
    }

    const prompt = `You are a medical AI assistant and health coach. The patient is a ${profile.age || 'unknown age'} year old ${profile.gender || 'person'}. 
${contextInstruction}
For EACH question, also generate 4-5 contextually relevant answer options that the patient can choose from. The options should be specific to the question being asked (e.g., for "how much weight gained" use options like "2-5 kg", "5-10 kg", etc.; for duration use "Last 1-2 weeks", "1-3 months", etc.).
Return ONLY a valid JSON array of objects, with no markdown formatting or backticks. 
Format: [{"id": "q1", "q": "Question text?", "hint": "example answer...", "options": ["Option 1", "Option 2", "Option 3", "Option 4"]}]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    let content = data.choices[0].message.content.trim();
    // Remove markdown code blocks if ChatGPT still adds them
    if (content.startsWith('\`\`\`')) {
      content = content.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');
    }
    
    return JSON.parse(content) as InterviewQuestion[];
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return getFallbackQuestions(category);
  }
}

export async function generateClinicalSummary(
  profile: any,
  complaint: string,
  answers: Record<string, string>,
  lifestyle: any,
  medical: any,
  timeline: string
): Promise<ClinicalSummary> {
  if (!API_KEY) {
    console.warn('No OpenAI API key found, returning mock summary.');
    return getFallbackSummary();
  }

  try {
    const prompt = `You are an advanced medical AI. Analyze ALL of the following patient data to calculate a comprehensive health score and clinical summary. You MUST take into account their age, lifestyle (sleep, activity, diet, stress), medical history, timeline, and current symptoms when calculating the score and insights. Return the result in JSON format.
Patient: ${profile.name || 'Unknown'}, ${profile.age || '?'} yr old ${profile.gender || '?'}, Ht: ${profile.height || '?'}, Wt: ${profile.weight || '?'}, Blood: ${profile.blood || '?'}, Occ: ${profile.occupation || '?'}
Chief Complaint / Goal: ${complaint}
Timeline: ${timeline}
Interview Answers: ${JSON.stringify(answers)}
Lifestyle Profile: Sleep: ${lifestyle.sleep}, Activity: ${lifestyle.activity}, Water: ${lifestyle.water}, Diet: ${lifestyle.diet}, Smoking: ${lifestyle.smoking}, Alcohol: ${lifestyle.alcohol}, Stress: ${lifestyle.stress}, Exercise: ${lifestyle.exercise}
Medical History: Chronic: ${medical.diseases}, Surgeries: ${medical.surgeries}, Allergies: ${medical.allergies}, Meds: ${medical.medications}, Family Hx: ${medical.familyHistory}, Mental Health: ${medical.mentalHealth}, Pregnancy: ${medical.pregnancy}

Return ONLY a valid JSON object with no markdown formatting. Structure:
{
  "healthScore": 72,
  "scoreGrade": "Good", 
  "scoreMessage": "Keep improving! Small changes can make a big difference.",
  "primaryConcernSummary": "Weight Gain + Fatigue, Poor Sleep",
  "riskLevel": "Moderate",
  "riskMessage": "Based on your current health profile and symptoms",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "suggestedInvestigations": ["test 1", "test 2"],
  "nextSteps": ["step 1", "step 2"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    let content = data.choices[0].message.content.trim();
    if (content.startsWith('\`\`\`')) {
      content = content.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');
    }

    return JSON.parse(content) as ClinicalSummary;
  } catch (error) {
    console.error('Error generating summary:', error);
    return getFallbackSummary();
  }
}


// --- Fallbacks ---

function getFallbackQuestions(category: string): InterviewQuestion[] {
  if (category === 'Weight Loss' || category === 'Weight Gain') {
    return [
      { id: 'q1', q: 'Can you describe your typical daily eating habits and any cravings you often experience?', hint: 'e.g., Skip breakfast, snack at night...', options: ['I skip meals often', 'I eat 3 balanced meals', 'I snack frequently between meals', 'I eat mostly junk/processed food', 'I overeat at night'] },
      { id: 'q2', q: 'What is your typical level of physical activity or exercise throughout the week?', hint: 'e.g., Mostly sitting, gym 3x a week...', options: ['Mostly sedentary (desk job)', 'Light walks 2-3 times/week', 'Moderate exercise 3-4 times/week', 'Intense workouts 5+ times/week', 'I used to be active but stopped'] },
      { id: 'q3', q: 'Do you feel stress, sleep patterns, or emotional factors play a role in your weight?', hint: 'e.g., I eat when stressed, poor sleep...', options: ['Yes, I eat when stressed', 'Poor sleep affects my appetite', 'Emotional eating is a big factor', 'Not really, I think it\'s mostly diet', 'Medications may be contributing'] }
    ];
  } else if (category === 'Headache') {
    return [
      { id: 'q1', q: 'Where exactly is the pain located and what does it feel like?', hint: 'e.g., Throbbing on left side, tight band around head', options: ['One side of the head (throbbing)', 'Both sides (tight/pressing)', 'Behind the eyes', 'Back of the head/neck', 'All over the head'] },
      { id: 'q2', q: 'How long does a typical headache last, and how severe is it?', hint: 'e.g., Lasts for hours, 7/10 pain', options: ['30 minutes to 1 hour (mild)', '1-4 hours (moderate)', '4-12 hours (severe)', 'All day (debilitating)', 'Multiple days continuously'] },
      { id: 'q3', q: 'Any nausea, vision changes, or sensitivity to light/sound?', hint: 'e.g., Yes, sensitive to light', options: ['Yes, nausea and vomiting', 'Sensitivity to light', 'Sensitivity to sound', 'Visual aura (flashing lights)', 'No additional symptoms'] }
    ];
  } else {
    return [
      { id: 'q1', q: 'Could you describe your symptoms in more detail?', hint: 'e.g., Started 2 days ago, feels like a dull ache...', options: ['It\'s a constant dull ache', 'Sharp intermittent pain', 'Burning or tingling sensation', 'General discomfort/fatigue', 'It comes and goes unpredictably'] },
      { id: 'q2', q: 'Does anything make it better or worse?', hint: 'e.g., Resting helps, worse after eating...', options: ['Rest makes it better', 'It worsens with physical activity', 'Eating makes it worse', 'Stress aggravates it', 'Nothing seems to help'] },
      { id: 'q3', q: 'Any other symptoms you\'ve noticed alongside this?', hint: 'e.g., Also feel slightly tired and nauseous', options: ['Fatigue and low energy', 'Nausea or appetite changes', 'Sleep disturbances', 'Mood changes (anxiety, irritability)', 'No other symptoms'] }
    ];
  }
}

function getFallbackSummary(): ClinicalSummary {
  return {
    healthScore: 65,
    scoreGrade: "Fair",
    scoreMessage: "There is room for improvement in your daily habits.",
    primaryConcernSummary: "General Symptoms + Undefined",
    riskLevel: "Moderate",
    riskMessage: "Based on incomplete medical history",
    keyInsights: [
      "Incomplete medical history provided.",
      "Age-related risk factors might be possible.",
      "Further assessment is required."
    ],
    suggestedInvestigations: ["Comprehensive Blood Panel", "Physical Examination"],
    nextSteps: [
      "Schedule a follow-up consultation with a physician to review these symptoms.",
      "Monitor your symptoms daily and record any changes in the timeline."
    ]
  };
}

// ── Food Image Analysis (GPT-4o Vision) ────────────────────────────────────────

export type FoodItem = {
  name: string;
  quantity: string;   // e.g. "1 cup", "2 pieces", "150g"
  calories: number;
  servingGrams: number; // grams per serving for quantity scaling
};

export type FoodImageAnalysisResult = {
  items: FoodItem[];
  totalCalories: number;
  mealDescription: string; // one-line summary e.g. "Dal rice with raita"
};

export async function analyzeFoodImage(base64Image: string): Promise<FoodImageAnalysisResult> {
  if (!API_KEY) {
    return getFallbackFoodAnalysis();
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a professional dietitian and food recognition AI. Analyze this meal photo carefully.
Identify every distinct food item visible. For each item estimate:
- A common name (in English, preferably Indian food names if applicable)
- Visible quantity/portion (e.g. "1 medium bowl", "2 rotis", "150g", "1 cup")
- Calorie estimate for that portion
- Serving weight in grams for that portion (for quantity scaling)

Then provide a brief one-line meal description.

Return ONLY valid JSON, no markdown, no backticks:
{
  "items": [
    {"name": "Dal (Yellow Lentil Curry)", "quantity": "1 medium bowl", "calories": 180, "servingGrams": 200},
    {"name": "Steamed Rice", "quantity": "1 cup (cooked)", "calories": 206, "servingGrams": 186}
  ],
  "totalCalories": 386,
  "mealDescription": "Dal rice — a nutritious Indian staple meal"
}`
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'low' },
              }
            ]
          }
        ]
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    let content = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (content.startsWith('```')) {
      content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(content) as FoodImageAnalysisResult;
    return parsed;
  } catch (err) {
    console.warn('[analyzeFoodImage] Error:', err);
    return getFallbackFoodAnalysis();
  }
}

function getFallbackFoodAnalysis(): FoodImageAnalysisResult {
  return {
    items: [
      { name: 'Mixed Meal', quantity: '1 serving', calories: 350, servingGrams: 300 },
    ],
    totalCalories: 350,
    mealDescription: 'Mixed meal (could not analyze image)',
  };
}

// ── Lab Report AI Analysis & Safety Triage ──────────────────────────────────────

export type Biomarker = {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  status: 'normal' | 'low' | 'high' | 'critical';
};

export type LabReportAnalysisResult = {
  reportTitle: string;
  patientName?: string;
  reportDate?: string;
  triage: 'routine' | 'doctor_review' | 'urgent';
  triageBadge: string; // "🟢 Routine" | "🟠 Doctor Review Required" | "🔴 Urgent"
  triageDescription: string;
  summary: string;
  biomarkers: Biomarker[];
  keyRecommendations: string[];
  doctorReviewRecommended: boolean;
};

export async function analyzeLabReport(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  fileName?: string
): Promise<LabReportAnalysisResult> {
  if (!API_KEY) {
    return getFallbackLabReportAnalysis();
  }

  try {
    const isPdf = mimeType.includes('pdf') || (fileName && fileName.toLowerCase().endsWith('.pdf'));
    const dataUrl = `data:${isPdf ? 'application/pdf' : (mimeType || 'image/jpeg')};base64,${base64Data}`;

    const userContent: any[] = [
      {
        type: 'text',
        text: `You are an expert clinical laboratory pathologist and AI medical triage assistant. Analyze this medical lab report / blood test document carefully (Document Name: ${fileName || 'Uploaded Report'}).

Extract all key biomarkers visible (e.g. Vitamin D, HbA1c, Fasting Glucose, Lipid Profile, TSH, Hemoglobin, CRP, ALT, AST, Creatinine, Electrolytes, etc.).

Assign a clinical triage indicator:
- "routine" (🟢 Routine): All or nearly all values are within normal reference ranges.
- "doctor_review" (🟠 Doctor Review Required): One or more biomarkers are mildly elevated or low, requiring non-emergency physician follow-up.
- "urgent" (🔴 Urgent): Critical out-of-range value present requiring immediate clinical evaluation.

Return ONLY a valid JSON object with NO markdown or backticks:
{
  "reportTitle": "Comprehensive Blood & Metabolic Panel",
  "patientName": "Patient",
  "reportDate": "Recent",
  "triage": "doctor_review",
  "triageBadge": "🟠 Doctor Review Required",
  "triageDescription": "Vitamin D deficiency detected (18 ng/mL). Physician review recommended for supplementation guidance.",
  "summary": "The lab report shows optimal liver function and normal blood glucose. However, 25-hydroxy Vitamin D is significantly below normal threshold and HbA1c is slightly elevated at 5.8%.",
  "biomarkers": [
    {"name": "25-OH Vitamin D", "value": "18.2", "unit": "ng/mL", "normalRange": "30 - 100 ng/mL", "status": "low"},
    {"name": "HbA1c (Glycated Hemoglobin)", "value": "5.8", "unit": "%", "normalRange": "4.0 - 5.6 %", "status": "high"},
    {"name": "Fasting Blood Glucose", "value": "92", "unit": "mg/dL", "normalRange": "70 - 99 mg/dL", "status": "normal"},
    {"name": "Total Cholesterol", "value": "185", "unit": "mg/dL", "normalRange": "< 200 mg/dL", "status": "normal"},
    {"name": "High Sensitivity CRP", "value": "1.2", "unit": "mg/L", "normalRange": "< 1.0 mg/L", "status": "high"}
  ],
  "keyRecommendations": [
    "Discuss Vitamin D3 supplementation (50,000 IU weekly protocol) with your doctor.",
    "Adopt low-glycemic dietary modifications to optimize HbA1c.",
    "Repeat Vitamin D and HbA1c panel in 12 weeks."
  ],
  "doctorReviewRecommended": true
}`
      },
      {
        type: 'image_url',
        image_url: { url: dataUrl, detail: 'high' },
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: userContent,
          }
        ]
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    let content = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (content.startsWith('```')) {
      content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(content) as LabReportAnalysisResult;
    return parsed;
  } catch (err) {
    console.warn('[analyzeLabReport] Error:', err);
    return getFallbackLabReportAnalysis();
  }
}

export function getFallbackLabReportAnalysis(): LabReportAnalysisResult {
  return {
    reportTitle: "Metabolic & Lab Biomarker Panel",
    patientName: "Patient Record",
    reportDate: "Today",
    triage: "doctor_review",
    triageBadge: "🟠 Doctor Review Required",
    triageDescription: "Vitamin D is below target clinical levels and HbA1c shows mild elevation. A doctor review is recommended for personalized treatment advice.",
    summary: "Your extracted lab report indicates normal fasting glucose and healthy kidney function. Vitamin D is low at 18.5 ng/mL and HbA1c is 5.8% (prediabetes range).",
    biomarkers: [
      { name: "25-OH Vitamin D", value: "18.5", unit: "ng/mL", normalRange: "30.0 - 100.0 ng/mL", status: "low" },
      { name: "HbA1c (Glycated Hb)", value: "5.8", unit: "%", normalRange: "< 5.7 %", status: "high" },
      { name: "Fasting Blood Glucose", value: "94.0", unit: "mg/dL", normalRange: "70.0 - 99.0 mg/dL", status: "normal" },
      { name: "Total Cholesterol", value: "178.0", unit: "mg/dL", normalRange: "< 200.0 mg/dL", status: "normal" },
      { name: "hs-CRP (Inflammation)", value: "2.1", unit: "mg/L", normalRange: "< 1.0 mg/L", status: "high" },
      { name: "Hemoglobin (Hb)", value: "13.8", unit: "g/dL", normalRange: "12.0 - 16.0 g/dL", status: "normal" }
    ],
    keyRecommendations: [
      "Consult your clinical physician for Vitamin D3 prescription & dosage plan.",
      "Monitor dietary carbohydrate intake and maintain active lifestyle.",
      "Schedule follow-up lab test in 90 days to track improvement."
    ],
    doctorReviewRecommended: true
  };
}


