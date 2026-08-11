import AsyncStorage from '@react-native-async-storage/async-storage';

const GAME_STATS_KEY = '@genestac_game_stats_v1';

export interface GameStat {
  highScore: number;
  timesPlayed: number;
  lastPlayed?: string;
}

export interface UserGameData {
  totalXP: number;
  games: {
    'swipe-junk'?: GameStat;
    'glucose-defender'?: GameStat;
    'hunger-games'?: GameStat;
    'spot-form'?: GameStat;
    'hydration-pet'?: GameStat;
    'zombie-dash'?: GameStat;
  };
  petHappiness?: number; // 0 - 100 for Dramatic Hydration Pet
  petCustomization?: string; // hat style
}

const DEFAULT_GAME_DATA: UserGameData = {
  totalXP: 0,
  games: {},
  petHappiness: 80,
  petCustomization: 'classic',
};

export async function getUserGameData(): Promise<UserGameData> {
  try {
    const raw = await AsyncStorage.getItem(GAME_STATS_KEY);
    if (!raw) return DEFAULT_GAME_DATA;
    return { ...DEFAULT_GAME_DATA, ...JSON.parse(raw) };
  } catch (error) {
    console.error('Failed to load game data:', error);
    return DEFAULT_GAME_DATA;
  }
}

export async function recordGameCompletion(
  gameId: keyof UserGameData['games'],
  score: number,
  xpEarned: number
): Promise<UserGameData> {
  try {
    const current = await getUserGameData();
    const existingStat = current.games[gameId] || { highScore: 0, timesPlayed: 0 };

    const updatedStat: GameStat = {
      highScore: Math.max(existingStat.highScore, score),
      timesPlayed: existingStat.timesPlayed + 1,
      lastPlayed: new Date().toISOString(),
    };

    const updatedData: UserGameData = {
      ...current,
      totalXP: current.totalXP + xpEarned,
      games: {
        ...current.games,
        [gameId]: updatedStat,
      },
    };

    await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(updatedData));
    return updatedData;
  } catch (error) {
    console.error('Failed to record game completion:', error);
    return DEFAULT_GAME_DATA;
  }
}

export async function updatePetState(happinessDelta: number, hatStyle?: string): Promise<UserGameData> {
  try {
    const current = await getUserGameData();
    const newHappiness = Math.min(100, Math.max(0, (current.petHappiness ?? 80) + happinessDelta));

    const updatedData: UserGameData = {
      ...current,
      petHappiness: newHappiness,
      petCustomization: hatStyle ?? current.petCustomization ?? 'classic',
    };

    await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(updatedData));
    return updatedData;
  } catch (error) {
    console.error('Failed to update pet state:', error);
    return DEFAULT_GAME_DATA;
  }
}
