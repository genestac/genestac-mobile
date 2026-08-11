import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GameHeader } from '@/components/games/GameHeader';
import { GameResultModal } from '@/components/games/GameResultModal';
import { getUserGameData, recordGameCompletion } from '@/lib/games/gameStorage';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface ExerciseQuestion {
  exerciseName: string;
  iconName: string;
  options: {
    title: string;
    description: string;
    isCorrect: boolean;
    funnyReason: string;
  }[];
}

const QUESTIONS: ExerciseQuestion[] = [
  {
    exerciseName: 'Barbell Back Squat 🏋️‍♂️',
    iconName: 'barbell',
    options: [
      {
        title: 'Form A: The "Cat Back" Hump',
        description: 'Rounding the spine completely, knees caving inward, lifting heels off the floor.',
        isCorrect: false,
        funnyReason: 'Yikes! Your chiropractor just felt a disturbance in the Force!',
      },
      {
        title: 'Form B: Chest Up & Parallel Depth',
        description: 'Feet shoulder-width apart, knees tracking over toes, spine neutral, hips below knees.',
        isCorrect: true,
        funnyReason: 'Flawless form! Quad gainz unlocked safely!',
      },
      {
        title: 'Form C: The Disco Wobble',
        description: 'Squatting on tiptoes while twisting hips to music.',
        isCorrect: false,
        funnyReason: 'Great dance moves, but terrible for your knee joints!',
      },
    ],
  },
  {
    exerciseName: 'Push-Up 🏋️‍♀️',
    iconName: 'fitness',
    options: [
      {
        title: 'Form A: Plank Alignment',
        description: 'Core engaged, straight line from head to heels, elbows at a 45-degree angle.',
        isCorrect: true,
        funnyReason: 'Spot on! Solid core stability & chest engagement.',
      },
      {
        title: 'Form B: The Worm Wave',
        description: 'Sagging hips to the ground first, then arching neck up.',
        isCorrect: false,
        funnyReason: 'Nice ocean imitation, but not quite a push-up!',
      },
      {
        title: 'Form C: The T-Rex Touch',
        description: 'Moving your head down 1 inch while keeping arms completely straight.',
        isCorrect: false,
        funnyReason: 'Micro-movements don\'t count as full range of motion!',
      },
    ],
  },
  {
    exerciseName: 'Deadlift 🏋️',
    iconName: 'body',
    options: [
      {
        title: 'Form A: Fishing Pole Arch',
        description: 'Lifting heavy weight using pure lower back rounding without engaging glutes.',
        isCorrect: false,
        funnyReason: 'Danger zone! Brace your core and hinge at your hips!',
      },
      {
        title: 'Form B: Hip Hinge & Flat Back',
        description: 'Bar close to shins, lats engaged, flat back, driving through heels.',
        isCorrect: true,
        funnyReason: 'Textbook execution! Pure strength efficiency.',
      },
      {
        title: 'Form C: The Squat Lift',
        description: 'Sitting way too deep like a low squat and pushing bar away from shins.',
        isCorrect: false,
        funnyReason: 'Keep the bar path vertical over mid-foot!',
      },
    ],
  },
];

export default function SpotFormScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getUserGameData().then((data) => {
      setHighScore(data.games['spot-form']?.highScore || 0);
    });
  }, []);

  const currentQ = QUESTIONS[currentIndex];

  const handleSelect = (isCorrect: boolean, reason: string) => {
    const points = isCorrect ? 30 : 0;
    setScore((s) => s + points);
    setSelectedResult(reason);

    setTimeout(() => {
      setSelectedResult(null);
      if (currentIndex + 1 < QUESTIONS.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        finishGame(score + points);
      }
    }, 2000);
  };

  const finishGame = async (finalScore: number) => {
    setGameOver(true);
    const xp = Math.floor(finalScore * 1.6);
    setXpEarned(xp);
    await recordGameCompletion('spot-form', finalScore, xp);
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelectedResult(null);
    setGameOver(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <GameHeader
        title="Spot the Bad Form 🏋️"
        subtitle="Identify correct exercise execution"
        score={score}
        onExit={() => router.back()}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <View style={styles.headerBox}>
          <Text style={styles.exerciseName}>{currentQ.exerciseName}</Text>
          <Text style={styles.instruction}>Tap the technique with CORRECT & SAFE form:</Text>
        </View>

        {selectedResult ? (
          <View style={styles.resultBox}>
            <Ionicons name="sparkles" size={32} color={Colors.primary} />
            <Text style={styles.resultText}>{selectedResult}</Text>
          </View>
        ) : (
          <View style={styles.optionsContainer}>
            {currentQ.options.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.card}
                onPress={() => handleSelect(opt.isCorrect, opt.funnyReason)}
                activeOpacity={0.8}
              >
                <Text style={styles.cardTitle}>{opt.title}</Text>
                <Text style={styles.cardDesc}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <GameResultModal
        visible={gameOver}
        score={score}
        xpEarned={xpEarned}
        highScore={highScore}
        message="Master of Form! You know how to lift safely and effectively!"
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
  content: {
    padding: 16,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  instruction: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: Colors.primaryMuted,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryDark,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 14,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
