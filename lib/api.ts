import { supabase } from './supabase';
import { WeightJourney, MealLog, SleepLog, WaterLog, MeasurementLog, StepLog, Referral, RewardTransaction, ReferralSummary, UserPlan, HealthProfile, DietPlan, ExercisePlan, BloodTestRequest, TestType } from './types';



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

// 3. Fetch User Plans & History directly from Supabase
export async function fetchUserPlans(userId: string): Promise<UserPlan | null> {
  try {
    const { data, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user plans from Supabase:', error);
      return null;
    }

    return (data as UserPlan) || null;
  } catch (err) {
    console.error('Failed to fetch user plans from Supabase:', err);
    return null;
  }
}

// 3b. Save / Update User Plans & History directly in Supabase
export async function saveUserPlans(userId: string, updates: Partial<UserPlan>): Promise<boolean> {
  try {
    const existing = await fetchUserPlans(userId);
    if (existing && existing.id) {
      const { error } = await supabase
        .from('user_plans')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating user_plans in Supabase:', error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('user_plans')
        .insert({
          user_id: userId,
          ...updates,
        });

      if (error) {
        console.error('Error inserting into user_plans in Supabase:', error);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('Failed to save user_plans in Supabase:', err);
    return false;
  }
}

// 4. Meal Analysis Helper powered by NVIDIA Llama 3.1 AI API
export async function analyzeMeal(description: string): Promise<MealAnalysisResult> {
  const nvidiaKey = process.env.EXPO_PUBLIC_NVIDIA_KEY! || process.env.NVIDIA_KEY! || '';

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
  const nvidiaKey = process.env.EXPO_PUBLIC_NVIDIA_KEY! || process.env.NVIDIA_KEY! || '';

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
  const nvidiaKey = process.env.EXPO_PUBLIC_NVIDIA_KEY! || process.env.NVIDIA_KEY! || '';

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
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME! ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME! ||
    "";
  const apiKey =
    process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY! ||
    process.env.CLOUDINARY_API_KEY! ||
    "";
  const apiSecret =
    process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET! ||
    process.env.CLOUDINARY_API_SECRET! ||
    "";

  if (!imageUri || imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
    return imageUri;
  }

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("Cloudinary credentials not configured in environment.");
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

    let referralCode = userData?.referral_code || '';
    if (!referralCode) {
      // Auto-generate a unique 6-char code if user doesn't have one yet
      referralCode = 'GEN' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await supabase
        .from('users')
        .update({ referral_code: referralCode })
        .eq('id', userId);
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
      referralCode,
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

/**
 * Qualify & process reward for a pending referral when referee purchases a plan or completes onboarding
 */
export async function processReferralReward(refereeUserId: string, rewardAmount: number = 250): Promise<boolean> {
  try {
    const { data: refRecord, error: refErr } = await supabase
      .from('referrals')
      .select('*')
      .eq('referee_id', refereeUserId)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (refErr || !refRecord) {
      return false;
    }

    const referrerId = refRecord.referrer_id;

    await supabase
      .from('referrals')
      .update({
        status: 'REWARDED',
        qualified_at: new Date().toISOString(),
        rewarded_at: new Date().toISOString(),
        reward_amount: rewardAmount,
      })
      .eq('id', refRecord.id);

    await supabase
      .from('reward_transactions')
      .insert({
        user_id: referrerId,
        referral_id: refRecord.id,
        amount: rewardAmount,
        type: 'CREDIT',
        source: 'REFERRAL_BONUS',
        description: 'Referral reward credit for successful signup & plan purchase',
        status: 'COMPLETED',
      });

    const { data: referrerUser } = await supabase
      .from('users')
      .select('wallet_balance, total_earned, total_referrals_count')
      .eq('id', referrerId)
      .maybeSingle();

    const currentBal = Number(referrerUser?.wallet_balance || 0);
    const currentEarned = Number(referrerUser?.total_earned || 0);
    const currentCount = Number(referrerUser?.total_referrals_count || 0);

    await supabase
      .from('users')
      .update({
        wallet_balance: currentBal + rewardAmount,
        total_earned: currentEarned + rewardAmount,
        total_referrals_count: currentCount + 1,
      })
      .eq('id', referrerId);

    return true;
  } catch (err) {
    console.error('Error processing referral reward:', err);
    return false;
  }
}

// 9. History Log API Helpers (User Plans)
export async function saveUserStepLog(
  userId: string,
  todayLog: StepLog,
  customGoal?: number
): Promise<boolean> {
  try {
    const userPlan = await fetchUserPlans(userId);
    const stepsHistory = userPlan?.steps_history || [];
    const todayStr = todayLog.date.split('T')[0];

    const existingIdx = stepsHistory.findIndex(s => s.date.split('T')[0] === todayStr);

    let updatedStepLogs: StepLog[];
    if (existingIdx >= 0) {
      updatedStepLogs = [...stepsHistory];
      updatedStepLogs[existingIdx] = {
        ...updatedStepLogs[existingIdx],
        ...todayLog,
        date: todayStr,
      };
    } else {
      updatedStepLogs = [{ ...todayLog, date: todayStr }, ...stepsHistory];
    }

    // Save steps_history in user_plans
    const planSuccess = await saveUserPlans(userId, { steps_history: updatedStepLogs });

    // Optionally update stepGoal in weight_loss_journey if specified
    if (customGoal) {
      const journey = await fetchUserJourney(userId);
      const currentJourney = journey || { history: [] };
      await saveUserJourney(userId, { ...currentJourney, stepGoal: customGoal });
    }

    return planSuccess;
  } catch (err) {
    console.error('Failed to save step log to Supabase:', err);
    return false;
  }
}

export async function saveUserWaterHistory(
  userId: string,
  waterHistory: WaterLog[]
): Promise<boolean> {
  return await saveUserPlans(userId, { water_history: waterHistory });
}

export async function saveUserSleepHistory(
  userId: string,
  sleepHistory: SleepLog[]
): Promise<boolean> {
  return await saveUserPlans(userId, { sleep_history: sleepHistory });
}

export async function saveUserMeasurementHistory(
  userId: string,
  measurementHistory: MeasurementLog[]
): Promise<boolean> {
  return await saveUserPlans(userId, { measurement_history: measurementHistory });
}

// 10. AI Diet & Exercise Plan Generator based on HealthProfile
export async function generateAIUserPlans(
  userId: string,
  profile: HealthProfile
): Promise<{ diet_plan: DietPlan; exercise_plan: ExercisePlan } | null> {
  const nvidiaKey = process.env.EXPO_PUBLIC_NVIDIA_KEY! || process.env.NVIDIA_KEY! || '';

  const profileSummary = `
Age: ${profile.age || 30} years
Gender: ${profile.gender || 'Not specified'}
Weight: ${profile.weightKg || 70} kg, Target: ${profile.targetWeightKg || 65} kg, Height: ${profile.heightCm || 170} cm
Primary Goal: ${profile.primaryGoal || 'Weight Loss'}
Activity Level: ${profile.activityLevel || 'Moderately Active'}
Dietary Preference: ${profile.dietaryPreference || 'Vegetarian'}
Medical Conditions: ${profile.medicalConditions || 'None'}
Allergies: ${profile.allergies || 'None'}
`.trim();

  let dietPlan: DietPlan | null = null;
  let exercisePlan: ExercisePlan | null = null;

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
            content: `You are an expert AI nutritionist and fitness trainer. Based on the user's Health Profile:\n${profileSummary}\n\nGenerate a comprehensive 7-day Diet Plan and 7-day Exercise Plan for days (monday, tuesday, wednesday, thursday, friday, saturday, sunday).\nRespond ONLY in valid JSON format with two root keys: "diet_plan" and "exercise_plan".\n"diet_plan" maps each weekday string to an object with "breakfast", "lunch", "snacks", "dinner". Each meal can be a string description or an object with "meal" description.\n"exercise_plan" maps each weekday string to an object with "type" (string), "duration_minutes" (number), and "exercises" (array of objects with "name", "sets", "reps" or "duration").\nDo not include markdown or backticks in the response.`,
          },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.diet_plan && parsed.exercise_plan) {
        dietPlan = parsed.diet_plan;
        exercisePlan = parsed.exercise_plan;
      }
    }
  } catch (err) {
    console.error('NVIDIA AI Plan Generation failed, using smart profile-tailored fallback:', err);
  }

  // Fallback Plans tailored to profile
  if (!dietPlan || !exercisePlan) {
    const pref = profile.dietaryPreference || 'Vegetarian';
    const isVeg = pref === 'Vegetarian' || pref === 'Vegan';

    dietPlan = dietPlan || {
      monday: {
        breakfast: isVeg ? "Oatmeal with chia seeds, almonds & skimmed milk" : "2 Boiled eggs with whole wheat toast & green tea",
        lunch: isVeg ? "2 Multigrain Roti, Dal Tadka, Mixed Veggie salad & Curd" : "Grilled Chicken Breast, Brown Rice & Cucumber Salad",
        snacks: "Roasted Makhana & 1 cup Green Tea",
        dinner: isVeg ? "Paneer Bhurji with 1 Roti & Cucumber salad" : "Baked Fish Fillet with steamed Broccoli",
      },
      tuesday: {
        breakfast: isVeg ? "Vegetable Poha with roasted peanuts & Mint Chutney" : "Egg White Omelette with spinach & brown toast",
        lunch: isVeg ? "1 cup Quinoa, Chana Masala & Tossed Salad" : "Chicken Salad Bowl with olive oil dressing",
        snacks: "Handful of Walnuts & Almonds",
        dinner: isVeg ? "Lauki Bottle Gourd Curry, 1 Roti & Salad" : "Grilled Tofu or Egg Curry with 1 Roti",
      },
      wednesday: {
        breakfast: isVeg ? "Besan Chilla with spinach & mint chutney" : "Scrambled Eggs with avocado toast",
        lunch: isVeg ? "Rajma Curry, Brown Rice & Kachumber Salad" : "Steamed Chicken Momos / Bowl with Fresh Salad",
        snacks: "Sprouted Moong Salad with Lemon",
        dinner: isVeg ? "Mixed Vegetable Soup & Paneer Tikka" : "Grilled Chicken & Asparagus",
      },
      thursday: {
        breakfast: isVeg ? "Idli with Sambhar & Coconut Chutney" : "Boiled Eggs & Fruit Salad",
        lunch: isVeg ? "2 Moong Dal Chilla with Mint Raita" : "Grilled Chicken Wrap with whole wheat roti",
        snacks: "1 Apple with 1 tsp Peanut Butter",
        dinner: isVeg ? "Palak Paneer with 1 Bajra Roti" : "Egg Curry with steamed Brown Rice",
      },
      friday: {
        breakfast: isVeg ? "Avocado Toast & Chia Seed Pudding" : "Egg White Omelette with Mushrooms",
        lunch: isVeg ? "Brown Rice Pulao with Mixed Veg & Boondi Raita" : "Chicken Stir-fry with Peppers & Mushrooms",
        snacks: "Roasted Chana & Herbal Tea",
        dinner: isVeg ? "Clear Vegetable Soup & Tofu Salad" : "Baked Salmon or Grilled Chicken with Salad",
      },
      saturday: {
        breakfast: isVeg ? "Stuffed Methi Paratha with Fresh Curd" : "French Toast with honey & Berries",
        lunch: isVeg ? "Paneer Kathi Roll (Whole Wheat) & Green Salad" : "Grilled Chicken Bowl with Quinoa",
        snacks: "Dark Chocolate (1 square) & Almonds",
        dinner: isVeg ? "Dal Khichdi with Ghee & Cucumber Salad" : "Chicken Soup & Grilled Veggies",
      },
      sunday: {
        breakfast: isVeg ? "Multigrain Pancakes with Berries" : "Eggs Benedict on Whole Grain Bread",
        lunch: isVeg ? "Special Veg Thali (Moderate Portions)" : "Roasted Chicken with Veggies & Brown Rice",
        snacks: "Coconut Water & Roasted Seeds",
        dinner: isVeg ? "Light Vegetable Soup & Salad" : "Grilled Fish with Lemon Butter Sauce",
      },
    };

    exercisePlan = exercisePlan || {
      monday: {
        type: "Full Body Warm-up & Cardio",
        duration_minutes: 30,
        exercises: [
          { name: "Brisk Walk / Jog", duration: "20 mins", sets: 1 },
          { name: "Jumping Jacks", reps: 15, sets: 3 },
          { name: "Full Body Stretch", duration: "5 mins", sets: 1 },
        ],
      },
      tuesday: {
        type: "Lower Body & Core",
        duration_minutes: 35,
        exercises: [
          { name: "Bodyweight Squats", reps: 15, sets: 3 },
          { name: "Walking Lunges", reps: "10 per leg", sets: 3 },
          { name: "Plank Hold", duration: "30 seconds", sets: 3 },
        ],
      },
      wednesday: {
        type: "Active Recovery & Mobility",
        duration_minutes: 25,
        exercises: [
          { name: "Light Yoga / Mobility Flow", duration: "20 mins", sets: 1 },
          { name: "Deep Breathing", duration: "5 mins", sets: 1 },
        ],
      },
      thursday: {
        type: "Upper Body & Core Strength",
        duration_minutes: 35,
        exercises: [
          { name: "Incline Push-ups", reps: 12, sets: 3 },
          { name: "Dumbbell/Bottle Rows", reps: 12, sets: 3 },
          { name: "Bicycle Crunches", reps: 15, sets: 3 },
        ],
      },
      friday: {
        type: "HIIT & Fat Burn",
        duration_minutes: 30,
        exercises: [
          { name: "High Knees", duration: "45 secs", sets: 4 },
          { name: "Mountain Climbers", duration: "45 secs", sets: 4 },
          { name: "Burpees (Modified)", reps: 10, sets: 3 },
        ],
      },
      saturday: {
        type: "Legs & Abs Burnout",
        duration_minutes: 35,
        exercises: [
          { name: "Sumo Squats", reps: 15, sets: 3 },
          { name: "Glute Bridges", reps: 15, sets: 3 },
          { name: "Russian Twists", reps: 20, sets: 3 },
        ],
      },
      sunday: {
        type: "Rest & Stretches",
        duration_minutes: 20,
        exercises: [
          { name: "Gentle Evening Walk", duration: "15 mins", sets: 1 },
          { name: "Hamstring & Quad Stretches", duration: "5 mins", sets: 1 },
        ],
      },
    };
  }

  // Save health_profile, diet_plan, exercise_plan, and set doctor_review: false
  await saveUserPlans(userId, {
    health_profile: profile,
    diet_plan: dietPlan,
    exercise_plan: exercisePlan,
    doctor_review: false,
  });

  return { diet_plan: dietPlan, exercise_plan: exercisePlan };
}

// 11. Helper to update Doctor Review status
export async function updateDoctorReviewStatus(userId: string, approved: boolean): Promise<boolean> {
  return await saveUserPlans(userId, { doctor_review: approved });
}

// 12. Test Requests API Helpers
export async function fetchTestRequests(userId: string): Promise<BloodTestRequest[]> {
  try {
    const { data, error } = await supabase
      .from('test_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching test requests:', error);
      return [];
    }

    return (data as BloodTestRequest[]) || [];
  } catch (err) {
    console.error('Failed to fetch test requests:', err);
    return [];
  }
}

export async function createBloodTestRequest(
  userId: string,
  conditionText: string
): Promise<BloodTestRequest | null> {
  try {
    const { data, error } = await supabase
      .from('test_requests')
      .insert({
        user_id: userId,
        condition_text: conditionText,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting blood test request into Supabase:', error);
      return null;
    }

    return (data as BloodTestRequest) || null;
  } catch (err) {
    console.error('Failed to create blood test request:', err);
    return null;
  }
}

// 13. Fetch available Test Types for dropdown selection
export async function fetchTestTypes(): Promise<TestType[]> {
  try {
    const { data, error } = await supabase
      .from('test_types')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching test types:', error);
      return [];
    }

    return (data as TestType[]) || [];
  } catch (err) {
    console.error('Failed to fetch test types:', err);
    return [];
  }
}



