import { Ionicons } from "@expo/vector-icons";

export interface Badge {
  id: string;
  category: "weight" | "streaks" | "hydration" | "fitness" | "nutrition" | "steps" | "mindfulness";
  categoryLabel: string;
  title: string;
  subtitle: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  badgeBg: string;
  iconColor: string;
  borderColor: string;
  tierBg: string;
  tierTextColor: string;
  tierLabel: string;
  isUnlocked: boolean;
  unlockedDate?: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  xp: number;
}

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return "Today";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function evaluateUserBadges(data: any = {}): Badge[] {
  const safeData = data || {};

  // 1. Calculate Weight Loss Metric
  const history = Array.isArray(safeData.history) ? safeData.history : [];
  let lostKg = 0;
  let latestWeightDate = "Today";
  if (history.length > 0) {
    const firstWeight = history[0].weight || 85;
    const lastWeight = history[history.length - 1].weight || firstWeight;
    lostKg = Math.max(0, parseFloat((firstWeight - lastWeight).toFixed(1)));
    latestWeightDate = formatDateShort(history[history.length - 1].date);
  }

  // 2. Calculate Streaks Metric
  const habitLogs = Array.isArray(safeData.habitLogs) ? safeData.habitLogs : [];
  const streakDays = habitLogs.length;

  // 3. Calculate Water Metric
  const waterLogs = Array.isArray(safeData.waterLogs) ? safeData.waterLogs : [];
  const totalWaterLogs = waterLogs.filter((w: any) => w && Number(w.amount) > 0).length;
  const targetWaterDays = waterLogs.filter((w: any) => w && Number(w.amount) >= 2.5).length;

  // 4. Calculate Meals Metric
  const meals = Array.isArray(safeData.meals) ? safeData.meals : [];
  const totalMealsLogged = meals.length;
  const mealDatesMap: Record<string, number> = {};
  meals.forEach((m: any) => {
    if (m && m.date) {
      const day = String(m.date).split("T")[0];
      mealDatesMap[day] = (mealDatesMap[day] || 0) + 1;
    }
  });
  const maxMealsInSingleDay = Math.max(0, ...Object.values(mealDatesMap));
  const highProteinDays = meals.filter((m: any) => m && Number(m.protein) >= 25).length;

  // 5. Calculate Steps Metric
  const stepLogs = Array.isArray(safeData.stepLogs) ? safeData.stepLogs : [];
  const maxDailySteps = Math.max(0, ...stepLogs.map((s: any) => Number(s.steps || 0)));
  const totalSteps = stepLogs.reduce((acc: number, s: any) => acc + Number(s.steps || 0), 0);

  // 6. Calculate Sleep Metric
  const sleepLogs = Array.isArray(safeData.sleepLogs) ? safeData.sleepLogs : [];
  const sleepCount = sleepLogs.length;

  const badges: Badge[] = [
    // WEIGHT LOSS BADGES
    {
      id: "badge_3",
      category: "weight",
      categoryLabel: "Weight Loss",
      title: "Bronze Dropper",
      subtitle: "3 kg Lost",
      description: "Shed your first 3 kg! You've proven your commitment to a healthier lifestyle.",
      iconName: "flame",
      badgeBg: "#FFFBEB",
      iconColor: "#D97706",
      borderColor: "#FCD34D",
      tierBg: "#FEF3C7",
      tierTextColor: "#B45309",
      tierLabel: "Bronze",
      isUnlocked: lostKg >= 3,
      unlockedDate: latestWeightDate,
      currentValue: Number(lostKg),
      targetValue: 3,
      unit: "kg",
      xp: 200,
    },
    {
      id: "badge_5",
      category: "weight",
      categoryLabel: "Weight Loss",
      title: "Silver Striker",
      subtitle: "5 kg Lost",
      description: "5 kg milestone reached! Momentum is building and your body is transforming.",
      iconName: "trophy",
      badgeBg: "#F8FAFC",
      iconColor: "#475569",
      borderColor: "#CBD5E1",
      tierBg: "#E2E8F0",
      tierTextColor: "#334155",
      tierLabel: "Silver",
      isUnlocked: lostKg >= 5,
      unlockedDate: latestWeightDate,
      currentValue: Number(lostKg),
      targetValue: 5,
      unit: "kg",
      xp: 400,
    },
    {
      id: "badge_10",
      category: "weight",
      categoryLabel: "Weight Loss",
      title: "Gold Master",
      subtitle: "10 kg Lost",
      description: "Double digit loss! 10 kg shed is a major transformation achievement.",
      iconName: "ribbon",
      badgeBg: "#FEFCE8",
      iconColor: "#EAB308",
      borderColor: "#FDE047",
      tierBg: "#FEF08A",
      tierTextColor: "#854D0E",
      tierLabel: "Gold",
      isUnlocked: lostKg >= 10,
      unlockedDate: latestWeightDate,
      currentValue: Number(lostKg),
      targetValue: 10,
      unit: "kg",
      xp: 800,
    },
    {
      id: "badge_15",
      category: "weight",
      categoryLabel: "Weight Loss",
      title: "Platinum Crusher",
      subtitle: "15 kg Lost",
      description: "15 kg down! An incredible feat of consistency and iron discipline.",
      iconName: "diamond",
      badgeBg: "#ECFEFF",
      iconColor: "#06B6D4",
      borderColor: "#67E8F9",
      tierBg: "#CFFAFE",
      tierTextColor: "#0E7490",
      tierLabel: "Platinum",
      isUnlocked: lostKg >= 15,
      unlockedDate: latestWeightDate,
      currentValue: Number(lostKg),
      targetValue: 15,
      unit: "kg",
      xp: 1500,
    },
    {
      id: "badge_20",
      category: "weight",
      categoryLabel: "Weight Loss",
      title: "Titan Legend",
      subtitle: "20 kg Lost",
      description: "Elite 20 kg milestone! Your dedication is inspiring everyone around you.",
      iconName: "sparkles",
      badgeBg: "#F5F3FF",
      iconColor: "#8B5CF6",
      borderColor: "#C4B5FD",
      tierBg: "#DDD6FE",
      tierTextColor: "#6D28D9",
      tierLabel: "Diamond",
      isUnlocked: lostKg >= 20,
      unlockedDate: latestWeightDate,
      currentValue: Number(lostKg),
      targetValue: 20,
      unit: "kg",
      xp: 2500,
    },
    {
      id: "badge_25",
      category: "weight",
      categoryLabel: "Weight Loss",
      title: "Grandmaster",
      subtitle: "25 kg Lost",
      description: "25+ kg conquered! Ultimate legend status achieved on your wellness journey.",
      iconName: "star",
      badgeBg: "#ECFDF5",
      iconColor: "#10B981",
      borderColor: "#6EE7B7",
      tierBg: "#A7F3D0",
      tierTextColor: "#047857",
      tierLabel: "Legend",
      isUnlocked: lostKg >= 25,
      unlockedDate: latestWeightDate,
      currentValue: Number(lostKg),
      targetValue: 25,
      unit: "kg",
      xp: 5000,
    },

    // STREAKS
    {
      id: "streak_1",
      category: "streaks",
      categoryLabel: "Streaks",
      title: "First Step",
      subtitle: "1-Day Streak",
      description: "Logged your first habit or activity! The longest journey begins with a single step.",
      iconName: "flame-outline",
      badgeBg: "#FFF7ED",
      iconColor: "#EA580C",
      borderColor: "#FDBA74",
      tierBg: "#FFEDD5",
      tierTextColor: "#C2410C",
      tierLabel: "Bronze",
      isUnlocked: streakDays >= 1,
      unlockedDate: "Today",
      currentValue: streakDays,
      targetValue: 1,
      unit: "day",
      xp: 100,
    },
    {
      id: "streak_7",
      category: "streaks",
      categoryLabel: "Streaks",
      title: "7-Day Habit Starter",
      subtitle: "7-Day Streak",
      description: "Maintained a perfect 7-day streak! You are building real discipline.",
      iconName: "flame",
      badgeBg: "#FEF2F2",
      iconColor: "#EF4444",
      borderColor: "#FCA5A5",
      tierBg: "#FEE2E2",
      tierTextColor: "#B91C1C",
      tierLabel: "Silver",
      isUnlocked: streakDays >= 7,
      unlockedDate: "Today",
      currentValue: streakDays,
      targetValue: 7,
      unit: "days",
      xp: 250,
    },
    {
      id: "streak_14",
      category: "streaks",
      categoryLabel: "Streaks",
      title: "14-Day Momentum \n Master",
      subtitle: "14-Day Streak",
      description: "Two full weeks of continuous tracking! Consistency is officially your super power.",
      iconName: "flash",
      badgeBg: "#FFFBEB",
      iconColor: "#D97706",
      borderColor: "#FCD34D",
      tierBg: "#FEF3C7",
      tierTextColor: "#B45309",
      tierLabel: "Gold",
      isUnlocked: streakDays >= 14,
      unlockedDate: "Today",
      currentValue: streakDays,
      targetValue: 14,
      unit: "days",
      xp: 500,
    },
    {
      id: "streak_30",
      category: "streaks",
      categoryLabel: "Streaks",
      title: "30-Day Unstoppable",
      subtitle: "30-Day Streak",
      description: "Log your activities for 30 consecutive days to unlock this elite status.",
      iconName: "trophy",
      badgeBg: "#F5F3FF",
      iconColor: "#8B5CF6",
      borderColor: "#C4B5FD",
      tierBg: "#DDD6FE",
      tierTextColor: "#6D28D9",
      tierLabel: "Platinum",
      isUnlocked: streakDays >= 30,
      unlockedDate: "Today",
      currentValue: streakDays,
      targetValue: 30,
      unit: "days",
      xp: 1000,
    },

    // HYDRATION
    {
      id: "hydr_1",
      category: "hydration",
      categoryLabel: "Hydration",
      title: "First Sip",
      subtitle: "First Water Log",
      description: "Logged your water intake for the very first time! Keep your cells happy.",
      iconName: "water-outline",
      badgeBg: "#F0F9FF",
      iconColor: "#0284C7",
      borderColor: "#7DD3FC",
      tierBg: "#E0F2FE",
      tierTextColor: "#0369A1",
      tierLabel: "Bronze",
      isUnlocked: totalWaterLogs >= 1,
      unlockedDate: "Today",
      currentValue: totalWaterLogs,
      targetValue: 1,
      unit: "log",
      xp: 100,
    },
    {
      id: "hydr_7",
      category: "hydration",
      categoryLabel: "Hydration",
      title: "Hydration Hero",
      subtitle: "7-Day Goal Met",
      description: "Hit your daily water intake target for 7 consecutive days!",
      iconName: "water",
      badgeBg: "#ECFEFF",
      iconColor: "#06B6D4",
      borderColor: "#67E8F9",
      tierBg: "#CFFAFE",
      tierTextColor: "#0E7490",
      tierLabel: "Silver",
      isUnlocked: targetWaterDays >= 7,
      unlockedDate: "Today",
      currentValue: targetWaterDays,
      targetValue: 7,
      unit: "days",
      xp: 350,
    },
    {
      id: "hydr_30",
      category: "hydration",
      categoryLabel: "Hydration",
      title: "Aqua Master",
      subtitle: "30 Days Optimal",
      description: "Reach 30 total days of optimal hydration tracking.",
      iconName: "color-fill",
      badgeBg: "#EFF6FF",
      iconColor: "#2563EB",
      borderColor: "#93C5FD",
      tierBg: "#DBEAFE",
      tierTextColor: "#1D4ED8",
      tierLabel: "Gold",
      isUnlocked: targetWaterDays >= 30,
      unlockedDate: "Today",
      currentValue: targetWaterDays,
      targetValue: 30,
      unit: "days",
      xp: 800,
    },

    // DIET & NUTRITION
    {
      id: "diet_1",
      category: "nutrition",
      categoryLabel: "Nutrition",
      title: "Daily Fuel",
      subtitle: "3 Meals Logged",
      description: "Logged Breakfast, Lunch, and Dinner in a single day!",
      iconName: "restaurant-outline",
      badgeBg: "#F0FDF4",
      iconColor: "#16A34A",
      borderColor: "#86EFAC",
      tierBg: "#DCFCE7",
      tierTextColor: "#15803D",
      tierLabel: "Bronze",
      isUnlocked: maxMealsInSingleDay >= 3,
      unlockedDate: "Today",
      currentValue: maxMealsInSingleDay,
      targetValue: 3,
      unit: "meals",
      xp: 100,
    },
    {
      id: "diet_7",
      category: "nutrition",
      categoryLabel: "Nutrition",
      title: "Balanced Gourmet",
      subtitle: "7 Days Healthy",
      description: "Stuck to your custom diet plan for 7 total meal tracking days!",
      iconName: "nutrition",
      badgeBg: "#ECFDF5",
      iconColor: "#059669",
      borderColor: "#6EE7B7",
      tierBg: "#D1FAE5",
      tierTextColor: "#047857",
      tierLabel: "Silver",
      isUnlocked: totalMealsLogged >= 7,
      unlockedDate: "Today",
      currentValue: totalMealsLogged,
      targetValue: 7,
      unit: "meals",
      xp: 400,
    },
    {
      id: "diet_protein",
      category: "nutrition",
      categoryLabel: "Nutrition",
      title: "Protein Master",
      subtitle: "5 High-Protein Meals",
      description: "Hit your daily protein goal for 5 high-protein meals.",
      iconName: "egg",
      badgeBg: "#FFF7ED",
      iconColor: "#C2410C",
      borderColor: "#FDBA74",
      tierBg: "#FFEDD5",
      tierTextColor: "#9A3412",
      tierLabel: "Gold",
      isUnlocked: highProteinDays >= 5,
      unlockedDate: "Today",
      currentValue: highProteinDays,
      targetValue: 5,
      unit: "meals",
      xp: 500,
    },

    // STEP TRACKING
    {
      id: "step_5k",
      category: "steps",
      categoryLabel: "Steps",
      title: "Step Pioneer",
      subtitle: "5,000 Steps Day",
      description: "Walked 5,000 steps in a single day! Great foundation for daily movement.",
      iconName: "walk-outline",
      badgeBg: "#F0FDF4",
      iconColor: "#15803D",
      borderColor: "#86EFAC",
      tierBg: "#DCFCE7",
      tierTextColor: "#166534",
      tierLabel: "Bronze",
      isUnlocked: maxDailySteps >= 5000,
      unlockedDate: "Today",
      currentValue: maxDailySteps,
      targetValue: 5000,
      unit: "steps",
      xp: 150,
    },
    {
      id: "step_10k",
      category: "steps",
      categoryLabel: "Steps",
      title: "10K Conqueror",
      subtitle: "10,000 Steps Day",
      description: "Crushed 10,000 steps in a single day! Peak cardio endurance.",
      iconName: "walk",
      badgeBg: "#ECFDF5",
      iconColor: "#047857",
      borderColor: "#6EE7B7",
      tierBg: "#D1FAE5",
      tierTextColor: "#065F46",
      tierLabel: "Silver",
      isUnlocked: maxDailySteps >= 10000,
      unlockedDate: "Today",
      currentValue: maxDailySteps,
      targetValue: 10000,
      unit: "steps",
      xp: 400,
    },
    {
      id: "step_50k",
      category: "steps",
      categoryLabel: "Steps",
      title: "Marathoner",
      subtitle: "50,000 Steps Total",
      description: "Accumulate 50,000 total steps across your activity log.",
      iconName: "footsteps",
      badgeBg: "#FEFCE8",
      iconColor: "#CA8A04",
      borderColor: "#FDE047",
      tierBg: "#FEF08A",
      tierTextColor: "#854D0E",
      tierLabel: "Gold",
      isUnlocked: totalSteps >= 50000,
      unlockedDate: "Today",
      currentValue: totalSteps,
      targetValue: 50000,
      unit: "steps",
      xp: 1000,
    },

    // MINDFULNESS & SLEEP
    {
      id: "mind_zen",
      category: "mindfulness",
      categoryLabel: "Mindfulness",
      title: "Zen Master",
      subtitle: "5 Sessions Done",
      description: "Completed 5 sleep or deep breathing relaxation logs.",
      iconName: "leaf",
      badgeBg: "#F0FDF4",
      iconColor: "#16A34A",
      borderColor: "#86EFAC",
      tierBg: "#DCFCE7",
      tierTextColor: "#15803D",
      tierLabel: "Bronze",
      isUnlocked: sleepCount >= 5,
      unlockedDate: "Today",
      currentValue: sleepCount,
      targetValue: 5,
      unit: "logs",
      xp: 300,
    },
    {
      id: "mind_rest",
      category: "mindfulness",
      categoryLabel: "Mindfulness",
      title: "Recovery Champion",
      subtitle: "7 Rest Logs",
      description: "Logged proper recovery and sleep logs to let muscle fibers repair.",
      iconName: "moon",
      badgeBg: "#F5F3FF",
      iconColor: "#7C3AED",
      borderColor: "#C4B5FD",
      tierBg: "#DDD6FE",
      tierTextColor: "#5B21B6",
      tierLabel: "Silver",
      isUnlocked: sleepCount >= 7,
      unlockedDate: "Today",
      currentValue: sleepCount,
      targetValue: 7,
      unit: "logs",
      xp: 300,
    },
  ];

  return badges;
}

export function getClosestLockedBadge(badges: Badge[]): Badge | null {
  const locked = badges.filter((b) => !b.isUnlocked);
  if (locked.length === 0) return null;

  return locked.reduce((closest, current) => {
    const closestProgress = closest.currentValue / closest.targetValue;
    const currentProgress = current.currentValue / current.targetValue;
    return currentProgress > closestProgress ? current : closest;
  });
}
