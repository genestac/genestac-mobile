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
