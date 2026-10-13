import { supabase } from './supabase';

export interface PrimaryGoalOption {
  id: string;
  title: string;
  route: string;
  iconName: string;
  iconType: 'ionicons' | 'mci';
  tagline: string;
  description: string;
  image?: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * The 6 Primary Goal Options (Clinical Services & Protocol Hubs)
 */
export const PRIMARY_GOAL_OPTIONS: PrimaryGoalOption[] = [
  {
    id: 'weight-loss',
    title: 'Weight Loss',
    route: '/(app)/dashboard',
    iconName: 'barbell',
    iconType: 'ionicons',
    tagline: 'Fatloss & Metabolic Health',
    description: 'Track weight loss graph, calories, water, sleep & measurements',
    image: 'https://images.pexels.com/photos/5714344/pexels-photo-5714344.jpeg',
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  {
    id: 'longevity',
    title: 'Longevity',
    route: '/(app)/longevity',
    iconName: 'dna',
    iconType: 'mci',
    tagline: 'Cellular Age & Vitality',
    description: 'Cellular age, NAD+ optimization & anti-aging protocols',
    image: 'https://images.pexels.com/photos/8939936/pexels-photo-8939936.jpeg',
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  {
    id: 'heart-diabetes',
    title: 'Heart & Diabetes',
    route: '/(app)/heart-diabetes',
    iconName: 'heart',
    iconType: 'ionicons',
    tagline: 'Cardiometabolic Health',
    description: 'Blood glucose monitoring, blood pressure & cardiovascular health',
    image: 'https://images.pexels.com/photos/5207102/pexels-photo-5207102.jpeg',
    color: '#E11D48',
    bgColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  {
    id: 'hair-treatment',
    title: 'Hair Treatment',
    route: '/(app)/hair-treatment',
    iconName: 'sparkles',
    iconType: 'ionicons',
    tagline: 'Scalp & Follicle Care',
    description: 'Hair-loss assessment, scalp care & hair restoration solutions',
    image: 'https://images.pexels.com/photos/7755460/pexels-photo-7755460.jpeg',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    borderColor: '#FBCFE8',
  },
  {
    id: 'skin-laser-treatment',
    title: 'Skin Laser Treatment',
    route: '/(app)/skin-laser-treatment',
    iconName: 'sparkles',
    iconType: 'ionicons',
    tagline: 'Aesthetic Dermatology',
    description: 'Advanced skincare, laser resurfacing & aesthetic dermatological care',
    image: 'https://images.pexels.com/photos/4586750/pexels-photo-4586750.jpeg',
    color: '#0284C7',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  {
    id: 'pain-regeneration',
    title: 'Pain & Regeneration',
    route: '/(app)/pain-regeneration',
    iconName: 'bandage',
    iconType: 'mci',
    tagline: 'Joint & Muscle Rehab',
    description: 'Joint pain management, muscle recovery & physical rehab',
    image: 'https://images.pexels.com/photos/4506109/pexels-photo-4506109.jpeg',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
];

/**
 * Map goal title to corresponding router destination
 */
export function getRouteForPrimaryGoal(goal: string | null | undefined): string {
  if (!goal) return '/(app)/dashboard';
  const clean = goal.trim().toLowerCase();

  if (
    clean.includes('weight') ||
    clean.includes('fatloss') ||
    clean.includes('fat loss') ||
    clean === 'weight loss'
  ) {
    return '/(app)/dashboard';
  }

  if (clean.includes('longevity')) {
    return '/(app)/longevity';
  }

  if (
    clean.includes('heart') ||
    clean.includes('diabetes') ||
    clean.includes('heat')
  ) {
    return '/(app)/heart-diabetes';
  }

  if (clean.includes('hair') || clean.includes('hai')) {
    return '/(app)/hair-treatment';
  }

  if (clean.includes('skin') || clean.includes('laser')) {
    return '/(app)/skin-laser-treatment';
  }

  if (clean.includes('pain') || clean.includes('regeneration')) {
    return '/(app)/pain-regeneration';
  }

  return '/(app)/dashboard';
}

/**
 * Check if the given goal represents Weight Loss
 */
export function isWeightLossGoal(goal: string | null | undefined): boolean {
  if (!goal) return true;
  const clean = goal.trim().toLowerCase();
  return (
    clean.includes('weight') ||
    clean.includes('fatloss') ||
    clean.includes('fat loss')
  );
}

/**
 * Get the full PrimaryGoalOption object for a goal string
 */
export function getPrimaryGoalInfo(goal: string | null | undefined): PrimaryGoalOption {
  if (!goal) return PRIMARY_GOAL_OPTIONS[0];
  const route = getRouteForPrimaryGoal(goal);
  const found = PRIMARY_GOAL_OPTIONS.find((opt) => opt.route === route);
  return found || PRIMARY_GOAL_OPTIONS[0];
}

/**
 * Fetch the user's saved primary goal from Supabase users table
 */
export async function fetchUserPrimaryGoal(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('primary_goal')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching primary_goal from users table:', error.message || error);
      return null;
    }

    return (data?.primary_goal as string) || null;
  } catch (err) {
    console.error('Exception fetching primary_goal:', err);
    return null;
  }
}

/**
 * Save / Update the user's primary goal in Supabase users table
 */
export async function saveUserPrimaryGoal(userId: string, goalTitle: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ primary_goal: goalTitle })
      .eq('id', userId);

    if (error) {
      console.error('Error saving primary_goal to users table:', error.message || error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception saving primary_goal:', err);
    return false;
  }
}
