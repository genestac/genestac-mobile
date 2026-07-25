import { supabase } from './supabase';
import { WeightJourney, MealLog, SleepLog, Referral, RewardTransaction, ReferralSummary, StepLog } from './types';



export type RecipeRecommendation = {
  name: string;
  calories: number;
  prepTime: string;
  benefits: string;
  ingredients: string[];
};

export type SleepRecommendation = {
  targetHours: number;
  tip: string;
};

export type MealAnalysisResult = {
  calories: number;
  feedback: string;
};

// 1. Fetch User Weight Loss Journey directly from Supabase
export async function fetchUserJourney(userId: string): Promise<WeightJourney | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('weight_loss_journey')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user journey from Supabase:', error);
      return null;
    }

    return (data?.weight_loss_journey as WeightJourney) || null;
  } catch (err) {
    console.error('Failed to fetch user journey from Supabase:', err);
    return null;
  }
}

// 2. Save/Update User Weight Loss Journey directly in Supabase
export async function saveUserJourney(userId: string, journey: WeightJourney): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ weight_loss_journey: journey })
      .eq('id', userId);

    if (error) {
      console.error('Error saving user journey to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save user journey to Supabase:', err);
    return false;
  }
}

// 3. Fetch User Diet & Exercise Plans directly from Supabase
export async function fetchUserPlans(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_plans')
      .select('diet_plan, exercise_plan')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user plans from Supabase:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch user plans from Supabase:', err);
    return null;
  }
}

// 4. Meal Analysis Helper powered by NVIDIA Llama 3.1 AI API
export async function analyzeMeal(description: string): Promise<MealAnalysisResult> {
  const nvidiaKey = process.env.EXPO_PUBLIC_NVIDIA_KEY || process.env.NVIDIA_KEY || '';

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [
          {
            role: 'user',
            content: `Analyze this meal. Provide a realistic estimate of the total calories and a brief feedback message (max 2 sentences) on whether this aligns with a healthy weight-loss diet. Respond ONLY in valid JSON format with exactly these two keys: "calories" (number) and "feedback" (string). Do not include markdown formatting or backticks around the JSON. Meal description: ${description}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.2,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.calories === 'number' && typeof parsed.feedback === 'string') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('NVIDIA AI Meal Analysis failed, using smart fallback:', err);
  }

  const descLower = description.toLowerCase();
  let estimatedCals = 350;
  if (descLower.includes('roti') || descLower.includes('bread') || descLower.includes('rice')) estimatedCals += 100;
  if (descLower.includes('chicken') || descLower.includes('paneer') || descLower.includes('egg')) estimatedCals += 120;
  if (descLower.includes('salad') || descLower.includes('veggies')) estimatedCals -= 50;

  return {
    calories: Math.max(150, estimatedCals),
    feedback: 'Balanced choice providing complex carbs, protein, and essential nutrients for healthy weight management.',
  };
}

// 5. Recipe Recommendations Helper powered by NVIDIA Llama 3.1 AI API
export async function recommendMeals(meals: MealLog[]): Promise<RecipeRecommendation[]> {
  const nvidiaKey = process.env.EXPO_PUBLIC_NVIDIA_KEY || process.env.NVIDIA_KEY || '';

  const fallbackRecommendations: RecipeRecommendation[] = [
    {
      name: 'High-Protein Berry Oatmeal Bowl',
      calories: 280,
      prepTime: '10 mins',
      benefits: 'High fiber, low sugar, keeps you full for hours.',
      ingredients: ['1/2 cup rolled oats', '1 scoop vanilla protein powder', '1/2 cup fresh berries', '1 tbsp chia seeds'],
    },
    {
      name: 'Mediterranean Quinoa & Chicken Salad',
      calories: 380,
      prepTime: '15 mins',
      benefits: 'Lean protein, healthy unsaturated fats, vitamin-rich.',
      ingredients: ['100g grilled chicken breast', '1/2 cup cooked quinoa', '1 cup cherry tomatoes & cucumbers', '1 tsp olive oil'],
    },
    {
      name: 'Baked Garlic Salmon & Asparagus',
      calories: 340,
      prepTime: '20 mins',
      benefits: 'Rich in Omega-3 fatty acids, extremely low carb.',
      ingredients: ['120g wild salmon fillet', '1 bunch fresh asparagus', '1 clove garlic', '1 slice lemon'],
    },
  ];

  try {
    const recentMealsText = Array.isArray(meals) && meals.length > 0
      ? meals.slice(-5).map((m) => `- ${m.mealType || 'Meal'}: ${m.description} (${m.calories || 300} kcal)`).join('\n')
      : 'No meals logged yet.';

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [
          {
            role: 'user',
            content: `Analyze the user's recent diet:\n${recentMealsText}\n\nBased on this, suggest 3 healthy, appetizing, and low-calorie recipe ideas (approx 250-400 kcal each) that provide excellent alternatives or adjustments to align with a weight loss goal. Respond ONLY in valid JSON format with a single key "recommendations" containing an array of 3 recipe objects. Each recipe object must have exactly these keys: "name" (string), "calories" (number), "prepTime" (string, e.g. "15 mins"), "benefits" (string, max 1 sentence), and "ingredients" (array of strings). Do not include markdown formatting or backticks around the JSON.`,
          },
        ],
        max_tokens: 450,
        temperature: 0.3,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
        return parsed.recommendations.map((item: any) => ({
          name: item.name || 'Healthy Recipe',
          calories: typeof item.calories === 'number' ? item.calories : 300,
          prepTime: typeof item.prepTime === 'string' ? item.prepTime : '15 mins',
          benefits: item.benefits || 'High protein, nutritious choice for weight loss.',
          ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
        }));
      }
    }
  } catch (err) {
    console.error('Failed to generate recipes with NVIDIA AI API:', err);
  }

  return fallbackRecommendations;
}

// 6. Sleep Hygiene Recommendation Helper powered by NVIDIA Llama 3.1 AI API
export async function recommendSleep(sleepLogs: SleepLog[]): Promise<SleepRecommendation> {
  const nvidiaKey = process.env.EXPO_PUBLIC_NVIDIA_KEY || process.env.NVIDIA_KEY || '';

  const fallbackAdvice: SleepRecommendation = {
    targetHours: 8.0,
    tip: 'Maintain a consistent sleep schedule and limit screen time before bed to support natural melatonin production.',
  };

  try {
    const recentSleepText = Array.isArray(sleepLogs) && sleepLogs.length > 0
      ? sleepLogs.slice(-7).map((log) => `- Date: ${log.date}, Hours: ${log.hours}h`).join('\n')
      : 'No sleep logs recorded yet.';

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [
          {
            role: 'user',
            content: `Evaluate the user's recent sleep history:\n${recentSleepText}\n\nBased on these patterns, recommend a personalized target for tonight (usually between 7 and 9 hours) and provide one brief, highly actionable sleep hygiene tip (maximum 2 sentences) to help them achieve better recovery. Respond ONLY in valid JSON format with exactly these two keys: "targetHours" (number) and "tip" (string). Do not include markdown formatting or backticks around the JSON.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.targetHours === 'number' && typeof parsed.tip === 'string') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to generate sleep recommendations with NVIDIA AI API:', err);
  }

  const recentHours = sleepLogs && sleepLogs.length > 0 ? sleepLogs[sleepLogs.length - 1].hours : 7.0;
  return {
    targetHours: 8.0,
    tip: recentHours < 7.0
      ? 'Prioritize an extra hour of sleep tonight to optimize metabolic recovery and hormone balance.'
      : fallbackAdvice.tip,
  };
}

// Pure JS SHA-1 for Cloudinary signed upload
function sha1(str: string): string {
  function rotateLeft(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }
  const utf8Str = unescape(encodeURIComponent(str));
  const words: number[] = [];
  for (let i = 0; i < utf8Str.length; i++) {
    words[i >> 2] |= utf8Str.charCodeAt(i) << (24 - (i % 4) * 8);
  }
  const strBitLength = utf8Str.length * 8;
  words[strBitLength >> 5] |= 0x80 << (24 - (strBitLength % 32));
  words[(((strBitLength + 64) >> 9) << 4) + 15] = strBitLength;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;
  let e = -1009589776;

  for (let i = 0; i < words.length; i += 16) {
    const w = new Array(80);
    for (let j = 0; j < 16; j++) w[j] = words[i + j] || 0;
    for (let j = 16; j < 80; j++) {
      w[j] = rotateLeft(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    }
    let [A, B, C, D, E] = [a, b, c, d, e];
    for (let j = 0; j < 80; j++) {
      let f = 0,
        k = 0;
      if (j < 20) {
        f = (B & C) | (~B & D);
        k = 1518500249;
      } else if (j < 40) {
        f = B ^ C ^ D;
        k = 1859775393;
      } else if (j < 60) {
        f = (B & C) | (B & D) | (C & D);
        k = -1894007588;
      } else {
        f = B ^ C ^ D;
        k = -899497514;
      }
      const temp = (rotateLeft(A, 5) + f + E + k + w[j]) | 0;
      E = D;
      D = C;
      C = rotateLeft(B, 30);
      B = A;
      A = temp;
    }
    a = (a + A) | 0;
    b = (b + B) | 0;
    c = (c + C) | 0;
    d = (d + D) | 0;
    e = (e + E) | 0;
  }

  return [a, b, c, d, e]
    .map((val) => (val >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

// 7. Cloudinary Upload Integration (Signed Upload)
export async function uploadToCloudinary(imageUri: string): Promise<string> {
  const cloudName =
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    "dzq7wi93y";
  const apiKey =
    process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY ||
    process.env.CLOUDINARY_API_KEY ||
    "341487361814837";
  const apiSecret =
    process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET ||
    process.env.CLOUDINARY_API_SECRET ||
    "QkbFWp23L5m_rMoGeXTgYlJych4";

  if (!imageUri || imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
    return imageUri;
  }

  try {
    const timestamp = Math.round(Date.now() / 1000).toString();
    const stringToSign = `timestamp=${timestamp}${apiSecret}`;
    const signature = sha1(stringToSign);

    const formData = new FormData();
    if (imageUri.startsWith("data:")) {
      formData.append("file", imageUri);
    } else {
      const filename = imageUri.split("/").pop() || `upload_${Date.now()}.jpg`;
      const ext = filename.split(".").pop()?.toLowerCase();
      const mimeType =
        ext === "png"
          ? "image/png"
          : ext === "heic"
          ? "image/heic"
          : "image/jpeg";

      formData.append("file", {
        uri: imageUri,
        type: mimeType,
        name: filename,
      } as any);
    }

    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    if (res.ok && data.secure_url) {
      return data.secure_url;
    } else {
      const msg = data.error?.message || "Cloudinary upload failed";
      console.error("Cloudinary upload error response:", data);
      throw new Error(msg);
    }
  } catch (err: any) {
    console.error("Cloudinary upload exception:", err);
    throw err;
  }
}

// 8. Refer & Earn API Helpers

/**
 * Validate a referral code against existing users
 */
export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerId?: string; referrerName?: string }> {
  if (!code || !code.trim()) {
    return { valid: false };
  }

  try {
    const cleanCode = code.trim().toUpperCase();
    const { data, error } = await supabase
      .from('users')
      .select('id, name, referral_code')
      .eq('referral_code', cleanCode)
      .maybeSingle();

    if (error || !data) {
      return { valid: false };
    }

    return {
      valid: true,
      referrerId: data.id,
      referrerName: data.name,
    };
  } catch (err) {
    console.error('Error validating referral code:', err);
    return { valid: false };
  }
}

/**
 * Link a referee user to a referrer code and create a PENDING referral record
 */
export async function linkReferralOnSignup(refereeUserId: string, referralCode: string): Promise<boolean> {
  try {
    const { valid, referrerId } = await validateReferralCode(referralCode);
    if (!valid || !referrerId) {
      console.warn('Invalid referral code provided on signup:', referralCode);
      return false;
    }

    const cleanCode = referralCode.trim().toUpperCase();

    // 1. Update referee's record in users table
    const { error: userUpdateErr } = await supabase
      .from('users')
      .update({
        referred_by_code: cleanCode,
        referred_by_user_id: referrerId,
      })
      .eq('id', refereeUserId);

    if (userUpdateErr) {
      console.error('Error updating referred_by fields on user:', userUpdateErr);
    }

    // 2. Insert into referrals table
    const { error: referralErr } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referee_id: refereeUserId,
        referral_code_used: cleanCode,
        status: 'PENDING',
        qualifying_event: 'PLAN_PURCHASED',
      });

    if (referralErr) {
      console.error('Error creating referral record:', referralErr);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to link referral on signup:', err);
    return false;
  }
}

/**
 * Fetch comprehensive referral summary for a user
 */
export async function fetchUserReferralSummary(userId: string): Promise<ReferralSummary | null> {
  try {
    // 1. Fetch user's referral fields
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('referral_code, wallet_balance, total_earned, total_referrals_count')
      .eq('id', userId)
      .maybeSingle();

    if (userErr) {
      console.error('Error fetching user referral profile:', userErr);
    }

    // 2. Fetch referrals where this user is the referrer
    const { data: referralsData, error: referralsErr } = await supabase
      .from('referrals')
      .select('*, referee:users!referrals_referee_id_fkey(name)')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (referralsErr) {
      console.error('Error fetching user referrals list:', referralsErr);
    }

    // 3. Fetch ledger transactions for this user
    const { data: txData, error: txErr } = await supabase
      .from('reward_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (txErr) {
      console.error('Error fetching reward transactions:', txErr);
    }

    const referralsList: Referral[] = (referralsData || []).map((r: any) => ({
      ...r,
      referee_name: r.referee?.name || 'New Patient',
    }));

    const transactionsList: RewardTransaction[] = txData || [];

    const pendingCount = referralsList.filter(r => r.status === 'PENDING').length;
    const qualifiedCount = referralsList.filter(r => r.status === 'QUALIFIED' || r.status === 'REWARDED').length;

    return {
      referralCode: userData?.referral_code || '',
      walletBalance: Number(userData?.wallet_balance || 0),
      totalEarned: Number(userData?.total_earned || 0),
      totalReferralsCount: userData?.total_referrals_count ?? referralsList.length,
      pendingCount,
      qualifiedCount,
      referralsList,
      transactionsList,
    };
  } catch (err) {
    console.error('Failed to fetch referral summary:', err);
    return null;
  }
}

// 9. Step Log API Helpers
export async function saveUserStepLog(
  userId: string,
  todayLog: StepLog,
  customGoal?: number
): Promise<boolean> {
  try {
    const journey = await fetchUserJourney(userId);
    const currentJourney: WeightJourney = journey || { history: [] };

    const stepLogs = currentJourney.stepLogs || [];
    const todayStr = todayLog.date.split('T')[0];

    const existingIdx = stepLogs.findIndex(s => s.date.split('T')[0] === todayStr);

    let updatedStepLogs: StepLog[];
    if (existingIdx >= 0) {
      updatedStepLogs = [...stepLogs];
      updatedStepLogs[existingIdx] = {
        ...updatedStepLogs[existingIdx],
        ...todayLog,
        date: todayStr,
      };
    } else {
      updatedStepLogs = [{ ...todayLog, date: todayStr }, ...stepLogs];
    }

    const updatedJourney: WeightJourney = {
      ...currentJourney,
      stepGoal: customGoal ?? currentJourney.stepGoal ?? 10000,
      stepLogs: updatedStepLogs,
    };

    return await saveUserJourney(userId, updatedJourney);
  } catch (err) {
    console.error('Failed to save step log to Supabase:', err);
    return false;
  }
}



