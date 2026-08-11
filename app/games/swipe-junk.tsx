import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GameHeader } from '@/components/games/GameHeader';
import { GameResultModal } from '@/components/games/GameResultModal';
import { getUserGameData, recordGameCompletion } from '@/lib/games/gameStorage';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  type: 'healthy' | 'junk';
  fact: string;
}

const FOOD_ITEMS: Omit<FoodItem, 'id'>[] = [
  { name: 'Avocado', emoji: '🥑', type: 'healthy', fact: 'Healthy fats fuel your brain power!' },
  { name: 'Broccoli', emoji: '🥦', type: 'healthy', fact: 'Packed with vitamin C & fiber!' },
  { name: 'Donut', emoji: '🍩', type: 'junk', fact: 'Bust that sugar spike!' },
  { name: 'Fries', emoji: '🍟', type: 'junk', fact: 'Flick away trans fats!' },
  { name: 'Watermelon', emoji: '🍉', type: 'healthy', fact: 'Super hydrating & refreshing!' },
  { name: 'Soda', emoji: '🥤', type: 'junk', fact: 'Empty liquid calories removed!' },
  { name: 'Salmon', emoji: '🐟', type: 'healthy', fact: 'Rich in Omega-3 fatty acids!' },
  { name: 'Pizza', emoji: '🍕', type: 'junk', fact: 'Save pizza for cheat day!' },
];

export default function SwipeJunkGame() {
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(30);
  const [lives, setLives] = useState(3);
  const [activeItem, setActiveItem] = useState<FoodItem | null>(null);
  const [currentFact, setCurrentFact] = useState<string>('Swipe healthy foods down to basket, flick junk up!');
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getUserGameData().then((data) => {
      setHighScore(data.games['swipe-junk']?.highScore || 0);
    });
    spawnNextItem();
  }, []);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver]);

  const spawnNextItem = () => {
    const randomFood = FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)];
    const newItem: FoodItem = {
      ...randomFood,
      id: Math.random().toString(),
    };
    setActiveItem(newItem);
  };

  const handleAction = (direction: 'basket' | 'flick') => {
    if (!activeItem || gameOver) return;

    const isHealthy = activeItem.type === 'healthy';
    const correct = (direction === 'basket' && isHealthy) || (direction === 'flick' && !isHealthy);

    if (correct) {
      setScore((s) => s + 10);
      setCurrentFact(`✅ ${activeItem.fact}`);
    } else {
      setLives((l) => {
        const nextLives = l - 1;
        if (nextLives <= 0) {
          finishGame();
        }
        return nextLives;
      });
      setCurrentFact(`❌ Oops! ${isHealthy ? 'Healthy food goes to basket!' : 'Junk food must be flicked away!'}`);
    }

    spawnNextItem();
  };

  const finishGame = async () => {
    setGameOver(true);
    const xp = Math.floor(score * 1.5) + 20;
    setXpEarned(xp);
    await recordGameCompletion('swipe-junk', score, xp);
  };

  const restartGame = () => {
    setScore(0);
    setTimer(30);
    setLives(3);
    setGameOver(false);
    setCurrentFact('Swipe healthy foods down to basket, flick junk up!');
    spawnNextItem();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <GameHeader
        title="Swipe the Junk"
        subtitle="Sort foods into basket vs. trash"
        score={score}
        timer={timer}
        onExit={() => router.back()}
      />

      <View style={styles.livesBar}>
        <Text style={styles.livesText}>Lives: </Text>
        {[1, 2, 3].map((heart) => (
          <Ionicons
            key={heart}
            name={heart <= lives ? 'heart' : 'heart-outline'}
            size={22}
            color={heart <= lives ? '#ef4444' : Colors.textMuted}
          />
        ))}
      </View>

      <View style={styles.factBanner}>
        <Text style={styles.factText}>{currentFact}</Text>
      </View>

      <View style={styles.gameArea}>
        {activeItem && (
          <View style={styles.itemCard}>
            <Text style={styles.itemEmoji}>{activeItem.emoji}</Text>
            <Text style={styles.itemName}>{activeItem.name}</Text>
          </View>
        )}
      </View>

      <View style={[styles.actionRow, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.flickBtn]}
          onPress={() => handleAction('flick')}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-bin-outline" size={24} color="#ef4444" />
          <Text style={styles.flickBtnText}>Flick Junk</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.basketBtn]}
          onPress={() => handleAction('basket')}
          activeOpacity={0.8}
        >
          <Ionicons name="nutrition-outline" size={24} color={Colors.primary} />
          <Text style={styles.basketBtnText}>Catch Healthy</Text>
        </TouchableOpacity>
      </View>

      <GameResultModal
        visible={gameOver}
        score={score}
        xpEarned={xpEarned}
        highScore={highScore}
        message="Awesome sorting skills! You know your healthy fuels!"
        onRestart={restartGame}
        onExit={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  livesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  livesText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginRight: 6,
  },
  factBanner: {
    margin: 16,
    padding: 14,
    backgroundColor: '#e0f2fe',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  factText: {
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '600',
    textAlign: 'center',
  },
  gameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCard: {
    width: 200,
    height: 200,
    backgroundColor: Colors.white,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  itemEmoji: {
    fontSize: 80,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 10,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  flickBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  flickBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
  },
  basketBtn: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  basketBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
});
