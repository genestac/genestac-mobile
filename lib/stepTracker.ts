import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

const { StepTrackerModule } = NativeModules;
if (StepTrackerModule) {
  if (typeof StepTrackerModule.addListener !== 'function') {
    StepTrackerModule.addListener = () => {};
  }
  if (typeof StepTrackerModule.removeListeners !== 'function') {
    StepTrackerModule.removeListeners = () => {};
  }
}
const stepTrackerEmitter = StepTrackerModule ? new NativeEventEmitter(StepTrackerModule) : null;

export interface StepTrackerStatus {
  isAvailable: boolean;
  stepsToday: number;
}

/**
 * Get total steps taken today, including steps taken while app was closed.
 * - Android: Uses native hardware Sensor.TYPE_STEP_COUNTER midnight baseline delta.
 * - iOS: Queries CMPedometer date range (start of day to now).
 */
export async function getTodayStepsCount(): Promise<number> {
  try {
    if (Platform.OS === 'android' && StepTrackerModule) {
      const isAvailable = await StepTrackerModule.isStepCounterAvailable();
      if (isAvailable) {
        const data = await StepTrackerModule.getStepCount();
        // Start background service to ensure continuous hardware tracking & boot recovery
        StepTrackerModule.startStepService().catch(() => {});
        return Math.round(data?.stepsToday ?? 0);
      }
    }

    if (Platform.OS === 'ios') {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (isAvailable) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const end = new Date();

        const result = await Pedometer.getStepCountAsync(startOfDay, end);
        return result?.steps ?? 0;
      }
    }
  } catch (err) {
    console.warn('[StepTracker] Error fetching today step count:', err);
  }

  return 0;
}

/**
 * Subscribe to real-time native hardware step updates.
 * Fires instantly on Android whenever hardware step counter advances (0 latency).
 */
export function subscribeToStepUpdates(callback: (stepsToday: number) => void): { remove: () => void } | null {
  if (Platform.OS === 'android' && stepTrackerEmitter) {
    try {
      const sub = stepTrackerEmitter.addListener('onStepUpdated', (event: { stepsToday: number }) => {
        if (typeof event?.stepsToday === 'number') {
          callback(Math.round(event.stepsToday));
        }
      });
      return sub;
    } catch (e) {
      console.warn('[StepTracker] Listener subscription error:', e);
    }
  }
  return null;
}

/**
 * Request necessary step tracking permissions and initialize background tracking service.
 */
export async function initStepTracker(): Promise<boolean> {
  try {
    const { status } = await Pedometer.requestPermissionsAsync();
    const isGranted = status === 'granted';

    if (Platform.OS === 'android' && StepTrackerModule) {
      const isAvailable = await StepTrackerModule.isStepCounterAvailable();
      if (isAvailable) {
        await StepTrackerModule.startStepService().catch(() => {});
      }
      return isAvailable && isGranted;
    }

    return isGranted;
  } catch (err) {
    console.warn('[StepTracker] Permission or service init error:', err);
    return false;
  }
}
