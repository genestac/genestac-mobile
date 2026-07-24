// Shared TypeScript types for Genestac Mobile

export type WeightLog = {
  date: string;
  weight: number;
  note?: string;
  image_url?: string;
};

export type MealLog = {
  id: string;
  date: string;
  mealType?: 'Morning' | 'Lunch' | 'Snacks' | 'Dinner';
  description: string;
  calories: number;
  feedback: string;
};

export type WaterLog = {
  date: string;
  amount: number; // in Liters
};

export type SleepLog = {
  date: string;
  hours: number;
};

export type MeasurementLog = {
  date: string;
  waist?: number;
  hips?: number;
  chest?: number;
};

export type HabitLog = {
  date: string;
  habits: Record<string, boolean>;
};

export type WeightJourney = {
  targetGoal?: number;
  history: WeightLog[];
  meals?: MealLog[];
  waterGoal?: number;
  waterLogs?: WaterLog[];
  sleepLogs?: SleepLog[];
  measurements?: MeasurementLog[];
  habitLogs?: HabitLog[];
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  weight_loss_journey?: WeightJourney;
  referral_code?: string;
  referred_by_code?: string | null;
  referred_by_user_id?: string | null;
  wallet_balance?: number;
  total_referrals_count?: number;
  total_earned?: number;
};

export type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'EXPIRED' | 'FRAUD_FLAGGED';

export type Referral = {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_code_used: string;
  status: ReferralStatus;
  qualifying_event?: string | null;
  qualified_at?: string | null;
  rewarded_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  referee_name?: string;
};

export type RewardTransactionType = 'REFERRER_BONUS' | 'REFEREE_BONUS' | 'REVERSAL' | 'REDEMPTION';
export type RewardTransactionStatus = 'PENDING' | 'COMPLETED' | 'REVERSED';

export type RewardTransaction = {
  id: string;
  user_id: string;
  referral_id?: string | null;
  type: RewardTransactionType;
  amount: number;
  status: RewardTransactionStatus;
  notes?: string | null;
  created_at: string;
};

export type ReferralRule = {
  id: string;
  plan_id?: string | null;
  qualifying_event: string;
  referrer_reward: number;
  referee_reward: number;
  is_active: boolean;
  created_at: string;
};

export type ReferralSummary = {
  referralCode: string;
  walletBalance: number;
  totalEarned: number;
  totalReferralsCount: number;
  pendingCount: number;
  qualifiedCount: number;
  referralsList: Referral[];
  transactionsList: RewardTransaction[];
};

export type DietMeal = {
  meal: string;
  image?: string;
};

export type DayPlan = {
  breakfast?: string | DietMeal;
  lunch?: string | DietMeal;
  snacks?: string | DietMeal;
  dinner?: string | DietMeal;
};

export type DietPlan = Record<string, DayPlan>;

export type ExercisePlan = Record<string, any>;


