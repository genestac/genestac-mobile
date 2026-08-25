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
