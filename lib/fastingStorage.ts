import AsyncStorage from '@react-native-async-storage/async-storage';
import { FastingProgramState, FastingProgramPhase } from './types';
import { getNotificationPreferences, saveNotificationPreferences } from './notificationStorage';
import { syncAllNotifications } from './notifications';

const STORAGE_KEY = '@genestac_fasting_program_state';

export const DEFAULT_FASTING_STATE: FastingProgramState = {
  phase: 'NOT_STARTED',
  waterIntakeMl: 0,
  fastDurationHours: 16,
};

export async function getFastingProgramState(): Promise<FastingProgramState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FASTING_STATE;
    const parsed = JSON.parse(raw);
    
    // Normalize any legacy blood sample phases to simple Intermittent Fasting phases
    let normalizedPhase: FastingProgramPhase = 'NOT_STARTED';
    if (parsed.phase === 'FASTING_ACTIVE' || parsed.phase === 'DAY_2_FASTING_ACTIVE') {
      normalizedPhase = 'FASTING_ACTIVE';
    }

    return {
      ...DEFAULT_FASTING_STATE,
      ...parsed,
      phase: normalizedPhase,
    };
  } catch (error) {
    console.error('Error reading fasting program state:', error);
    return DEFAULT_FASTING_STATE;
  }
}

export async function saveFastingProgramState(state: FastingProgramState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving fasting program state:', error);
  }
}

export async function advanceFastingPhase(currentPhase: FastingProgramPhase): Promise<FastingProgramState> {
  const state = await getFastingProgramState();
  const now = new Date().toISOString();

  let updated: FastingProgramState = { ...state };

  if (currentPhase === 'NOT_STARTED') {
    updated = {
      ...state,
      phase: 'FASTING_ACTIVE',
      startedAt: now,
      fastDurationHours: 16,
      waterIntakeMl: 500,
    };
    // Enable & Sync Hourly Fasting Notifications
    try {
      const prefs = await getNotificationPreferences();
      prefs.fastingRemindersEnabled = true;
      await saveNotificationPreferences(prefs);
      await syncAllNotifications(prefs);
    } catch (e) {
      console.error('Error activating fasting notifications:', e);
    }
  } else {
    // Reset to NOT_STARTED
    updated = {
      ...DEFAULT_FASTING_STATE,
      phase: 'NOT_STARTED',
    };
  }

  await saveFastingProgramState(updated);
  return updated;
}

export async function resetFastingProgramState(): Promise<FastingProgramState> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error resetting fasting program state:', err);
  }
  return DEFAULT_FASTING_STATE;
}
