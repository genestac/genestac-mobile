// lib/painMap.ts
// Digital Pain Map & Outcome Tracking Data Store & Utilities for Genestac

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

export type BodyRegionId =
  | 'head'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'upper_back'
  | 'lower_back'
  | 'chest'
  | 'abdomen'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle'
  | 'left_foot'
  | 'right_foot';

export type BodyView = 'front' | 'back' | 'left' | 'right';

export interface BodyRegionDef {
  id: BodyRegionId;
  label: string;
  category: 'head_neck' | 'upper_limb' | 'torso' | 'lower_limb';
  views: BodyView[];
}

export const BODY_REGIONS: BodyRegionDef[] = [
  { id: 'head', label: 'Head & Neck', category: 'head_neck', views: ['front', 'back'] },
  { id: 'left_shoulder', label: 'Left Shoulder', category: 'upper_limb', views: ['front', 'back', 'left'] },
  { id: 'right_shoulder', label: 'Right Shoulder', category: 'upper_limb', views: ['front', 'back', 'right'] },
  { id: 'left_elbow', label: 'Left Elbow', category: 'upper_limb', views: ['front', 'back', 'left'] },
  { id: 'right_elbow', label: 'Right Elbow', category: 'upper_limb', views: ['front', 'back', 'right'] },
  { id: 'left_wrist', label: 'Left Wrist', category: 'upper_limb', views: ['front', 'back', 'left'] },
  { id: 'right_wrist', label: 'Right Wrist', category: 'upper_limb', views: ['front', 'back', 'right'] },
  { id: 'upper_back', label: 'Upper Back', category: 'torso', views: ['back'] },
  { id: 'lower_back', label: 'Lower Back', category: 'torso', views: ['back'] },
  { id: 'chest', label: 'Chest', category: 'torso', views: ['front'] },
  { id: 'abdomen', label: 'Abdomen', category: 'torso', views: ['front'] },
  { id: 'left_hip', label: 'Left Hip', category: 'lower_limb', views: ['front', 'back', 'left'] },
  { id: 'right_hip', label: 'Right Hip', category: 'lower_limb', views: ['front', 'back', 'right'] },
  { id: 'left_knee', label: 'Left Knee', category: 'lower_limb', views: ['front', 'back', 'left'] },
  { id: 'right_knee', label: 'Right Knee', category: 'lower_limb', views: ['front', 'back', 'right'] },
  { id: 'left_ankle', label: 'Left Ankle', category: 'lower_limb', views: ['front', 'back', 'left'] },
  { id: 'right_ankle', label: 'Right Ankle', category: 'lower_limb', views: ['front', 'back', 'right'] },
  { id: 'left_foot', label: 'Left Foot', category: 'lower_limb', views: ['front', 'back', 'left'] },
  { id: 'right_foot', label: 'Right Foot', category: 'lower_limb', views: ['front', 'back', 'right'] },
];

export type PainType =
  | 'Sharp'
  | 'Dull'
  | 'Burning'
  | 'Stabbing'
  | 'Throbbing'
  | 'Tingling'
  | 'Numbness';

export type PainDuration =
  | '1_week'
  | '2_weeks'
  | '1_month'
  | '3_months'
  | '1_year';

export type AggravatingFactor =
  | 'walking'
  | 'running'
  | 'standing'
  | 'sitting'
  | 'stairs'
  | 'sleeping';

export interface PatientPainMap {
  id: string;
  patient_id?: string;
  body_region: BodyRegionId;
  body_region_label: string;
  additional_regions?: BodyRegionId[];
  pain_score: number; // 0 to 10
  pain_type: PainType[];
  duration: PainDuration;
  aggravating_factors: AggravatingFactor[];
  notes?: string;
  created_at: string;
}

export interface ClinicalAssessment {
  id: string;
  patient_id?: string;
  doctor_id?: string;
  diagnosis: string;
  flexion_degrees: number; // Range of motion flexion (e.g. 95)
  extension_degrees: number; // Range of motion extension (e.g. 5)
  walking_distance_meters: number;
  stairs_difficulty: boolean;
  squat_difficulty: boolean;
  created_at: string;
}

export interface TreatmentOutcome {
  id?: string;
  user_id: string;
  treatment_given?: string; // Entered by doctor on review
  after_treatment_pain_score?: number; // Entered by doctor on review (0-10)
  pain_reduction_timeline?: string; // Entered by doctor on review (e.g. "3 Weeks", "1 Month")
  created_at?: string;
}

export interface PainOutcomeVisit {
  id: string;
  visit_name: string; // e.g. "Day 1 (Initial)", "3 Weeks Later", "6 Weeks Later"
  visit_date: string;
  pain_score: number;
  flexion_degrees: number;
  extension_degrees: number;
  walking_distance_meters: number;
  weight_kg: number;
  daily_steps: number;
  exercise_compliance_pct: number;
}

export interface AICClinicalSummaryResult {
  summary: string;
  riskLevel: 'Low' | 'Moderate' | 'High';
  recommendations: string[];
  alerts: string[];
}

const STORAGE_KEY_MAPS = '@genestac_pain_maps_v1';
const STORAGE_KEY_VISITS = '@genestac_pain_visits_v1';

// Default initial outcome history for rich initial demonstration
export const INITIAL_DEMO_VISITS: PainOutcomeVisit[] = [
  {
    id: 'v1',
    visit_name: 'Day 1 (Initial Assessment)',
    visit_date: '2026-08-10',
    pain_score: 8,
    flexion_degrees: 95,
    extension_degrees: 15,
    walking_distance_meters: 200,
    weight_kg: 88,
    daily_steps: 2000,
    exercise_compliance_pct: 40,
  },
  {
    id: 'v2',
    visit_name: '3 Weeks Follow-up',
    visit_date: '2026-08-31',
    pain_score: 5,
    flexion_degrees: 110,
    extension_degrees: 10,
    walking_distance_meters: 800,
    weight_kg: 84,
    daily_steps: 5200,
    exercise_compliance_pct: 75,
  },
  {
    id: 'v3',
    visit_name: '6 Weeks Outcome',
    visit_date: '2026-09-21',
    pain_score: 3,
    flexion_degrees: 120,
    extension_degrees: 5,
    walking_distance_meters: 2000,
    weight_kg: 80,
    daily_steps: 8500,
    exercise_compliance_pct: 90,
  },
];

export async function loadPainMaps(): Promise<PatientPainMap[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_MAPS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load pain maps from storage:', e);
  }
  // Return default active pain map
  return [
    {
      id: 'pm-1',
      body_region: 'left_knee',
      body_region_label: 'Left Knee',
      pain_score: 8,
      pain_type: ['Sharp', 'Burning'],
      duration: '3_months',
      aggravating_factors: ['walking', 'stairs'],
      notes: 'Severe pain when ascending stairs or walking over 15 mins.',
      created_at: new Date().toISOString(),
    },
  ];
}

export async function savePainMap(map: PatientPainMap): Promise<PatientPainMap[]> {
  try {
    const existing = await loadPainMaps();
    const updated = [map, ...existing.filter((m) => m.id !== map.id)];
    await AsyncStorage.setItem(STORAGE_KEY_MAPS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save pain map:', e);
    return [];
  }
}

export async function loadPainVisits(): Promise<PainOutcomeVisit[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_VISITS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load pain visits from storage:', e);
  }
  return INITIAL_DEMO_VISITS;
}

export async function savePainVisit(visit: PainOutcomeVisit): Promise<PainOutcomeVisit[]> {
  try {
    const existing = await loadPainVisits();
    const updated = [...existing, visit];
    await AsyncStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save pain visit:', e);
    return [];
  }
}

/**
 * Generate AI Clinical Summary & Risk Prediction based on pain map & assessment history
 */
export function generateAIClinicalSummary(
  painMap: PatientPainMap,
  assessment?: ClinicalAssessment,
  visits: PainOutcomeVisit[] = INITIAL_DEMO_VISITS,
  allRegions?: BodyRegionId[]
): AICClinicalSummaryResult {
  const latestVisit = visits[visits.length - 1];
  const firstVisit = visits[0];

  const durationTextMap: Record<PainDuration, string> = {
    '1_week': '1 week',
    '2_weeks': '2 weeks',
    '1_month': '1 month',
    '3_months': '3 months',
    '1_year': '1 year or longer',
  };

  const regions = allRegions && allRegions.length > 0 ? allRegions : [painMap.body_region];
  const regionNames = regions.map(
    (id) => BODY_REGIONS.find((r) => r.id === id)?.label || id.replace('_', ' ')
  );
  const regionName = regionNames.join(', ');
  const typesStr = painMap.pain_type.length ? painMap.pain_type.join(', ') : 'Unspecified';
  const factorsStr = painMap.aggravating_factors.length ? painMap.aggravating_factors.join(', ') : 'general movement';

  let riskLevel: 'Low' | 'Moderate' | 'High' = 'Moderate';
  if (painMap.pain_score >= 8 || painMap.duration === '1_year' || painMap.duration === '3_months' || regions.length >= 3) {
    riskLevel = 'High';
  } else if (painMap.pain_score <= 4 && regions.length === 1) {
    riskLevel = 'Low';
  }

  const alerts: string[] = [];
  const recommendations: string[] = [];

  if (regions.length > 1) {
    alerts.push(`Multi-site pain detected across ${regions.length} anatomical zones (${regionName}). Kinetic chain assessment advised.`);
  }

  if (firstVisit && latestVisit && visits.length > 1) {
    if (latestVisit.pain_score > firstVisit.pain_score) {
      alerts.push('ALERT: Patient showing poor response to treatment. Pain score has increased.');
      riskLevel = 'High';
    } else if (latestVisit.pain_score < firstVisit.pain_score) {
      recommendations.push(`Positive trend detected: Pain reduced from ${firstVisit.pain_score}/10 to ${latestVisit.pain_score}/10.`);
    }

    if (latestVisit.flexion_degrees > firstVisit.flexion_degrees) {
      recommendations.push(`Range of Motion improved: Joint flexion improved from ${firstVisit.flexion_degrees}° to ${latestVisit.flexion_degrees}°.`);
    }
  }

  if (painMap.pain_score >= 7) {
    alerts.push('High pain score (≥7/10). Limit heavy weight-bearing activities.');
    recommendations.push('Schedule urgent orthopedic / regenerative specialist evaluation.');
    recommendations.push('Consider targeted PRP or joint regenerative therapy evaluation.');
  }

  recommendations.push(`Targeted physical therapy for ${regionName} mobilization and strength.`);
  recommendations.push('Monitor daily step count & exercise compliance in Genestac tracker.');

  const summary = `Patient reports ${typesStr.toLowerCase()} pain across ${regions.length} area(s) (${regionName}) persisting for ${durationTextMap[painMap.duration]}. Current pain severity rated at ${painMap.pain_score}/10. Symptoms are noticeably aggravated by ${factorsStr}. Functional assessment indicates ${assessment?.walking_distance_meters || latestVisit?.walking_distance_meters || 200}m walking tolerance with ${assessment?.stairs_difficulty ? 'difficulty climbing stairs' : 'moderate mobility'}.`;

  return {
    summary,
    riskLevel,
    recommendations,
    alerts,
  };
}

/**
 * Supabase API: Save Patient Pain Map directly to Supabase table `patient_pain_maps`
 */
export async function savePainMapSupabase(
  map: Omit<PatientPainMap, 'id'> | PatientPainMap
): Promise<PatientPainMap | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const patientId = sessionData?.session?.user?.id;

    const payload = {
      patient_id: patientId,
      body_region: map.body_region,
      body_region_label: map.body_region_label,
      pain_score: map.pain_score,
      pain_type: map.pain_type,
      duration: map.duration,
      aggravating_factors: map.aggravating_factors,
      notes: map.notes || '',
    };

    const { data, error } = await supabase
      .from('patient_pain_maps')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase patient_pain_maps insert error:', error.message);
      Alert.alert('Supabase DB Error', `Failed to insert into patient_pain_maps: ${error.message}`);
      await savePainMap(map as PatientPainMap);
      return null;
    }

    const saved = data as PatientPainMap;
    await savePainMap(saved);

    // Automatically insert treatment_outcomes record with user_id (doctor fills details on review)
    if (patientId) {
      const outcomePayload = {
        user_id: patientId,
      };

      const { error: outcomeError } = await supabase
        .from('treatment_outcomes')
        .insert(outcomePayload);

      if (outcomeError) {
        console.warn('Supabase treatment_outcomes info:', outcomeError.message);
      }
    }

    return saved;
  } catch (err: any) {
    console.error('savePainMapSupabase error:', err);
    Alert.alert('Supabase Error', err?.message || 'Failed to insert record into Supabase');
    await savePainMap(map as PatientPainMap);
    return null;
  }
}

/**
 * Supabase API: Fetch Pain Maps for currently authenticated user from `patient_pain_maps`
 */
export async function loadPainMapsSupabase(): Promise<PatientPainMap[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (userId) {
      const { data, error } = await supabase
        .from('patient_pain_maps')
        .select('*')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as PatientPainMap[];
      }
    }
  } catch (err) {
    console.warn('loadPainMapsSupabase error, falling back to local:', err);
  }
  return loadPainMaps();
}

/**
 * Supabase API: Save Treatment Outcome directly to Supabase table `treatment_outcomes`
 */
export async function saveTreatmentOutcomeSupabase(
  outcome: Omit<TreatmentOutcome, 'id' | 'user_id'>
): Promise<TreatmentOutcome | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      console.warn('Supabase outcome save: User is not authenticated');
    }

    const payload = {
      user_id: userId,
      treatment_given: outcome.treatment_given,
      after_treatment_pain_score: outcome.after_treatment_pain_score,
      pain_reduction_timeline: outcome.pain_reduction_timeline,
    };

    const { data, error } = await supabase
      .from('treatment_outcomes')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase treatment_outcomes insert error:', error.message);
      return null;
    }

    return data as TreatmentOutcome;
  } catch (err) {
    console.error('saveTreatmentOutcomeSupabase error:', err);
    return null;
  }
}

/**
 * Supabase API: Fetch Treatment Outcomes for current user from `treatment_outcomes`
 */
export async function loadTreatmentOutcomesSupabase(): Promise<TreatmentOutcome[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (userId) {
      const { data, error } = await supabase
        .from('treatment_outcomes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as TreatmentOutcome[];
      }
    }
  } catch (err) {
    console.warn('loadTreatmentOutcomesSupabase error:', err);
  }
  return [];
}

