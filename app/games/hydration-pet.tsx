import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GameHeader } from '@/components/games/GameHeader';
import { getUserGameData, updatePetState, recordGameCompletion } from '@/lib/games/gameStorage';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

const HATS = [
  { id: 'classic', name: 'Classic', icon: 'water' },
  { id: 'crown', name: 'Royal Crown 👑', icon: 'trophy' },
  { id: 'shades', name: 'Cool Shades 🕶️', icon: 'glasses' },
  { id: 'party', name: 'Party Hat 🥳', icon: 'ribbon' },
];

export default function HydrationPetScreen() {
  const [happiness, setHappiness] = useState(80);
  const [hat, setHat] = useState('classic');
  const [dialogue, setDialogue] = useState('Glub glub! I am feeling refreshed!');
  const [totalXP, setTotalXP] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getUserGameData().then((data) => {
      setHappiness(data.petHappiness ?? 80);
      setHat(data.petCustomization ?? 'classic');
    });
  }, []);

  const handleFeedWater = async () => {
    const newHappy = Math.min(100, happiness + 15);
    setHappiness(newHappy);
    setDialogue('💦 Mmm! Crisp, cold water! My cellular hydration is at 100%!');
    await updatePetState(15, hat);
    await recordGameCompletion('hydration-pet', newHappy, 15);
    setTotalXP((x) => x + 15);
  };

  const handlePokePet = () => {
    if (happiness > 50) {
      setDialogue('😄 Tee-hee! Stop tickling my water droplets!');
    } else {
      setDialogue('😫 I am too dehydrated to play! Quick, feed me water!');
    }
  };

  const handleSelectHat = async (hatId: string) => {
    setHat(hatId);
    await updatePetState(0, hatId);
    setDialogue(`✨ Ooh la la! Look at my new style!`);
  };

  const getPetMoodEmoji = () => {
    if (happiness >= 80) return '💧😄';
    if (happiness >= 40) return '💧😐';
    return '🌵😵';
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <GameHeader
        title="Hydration Water-Pal 💧"
        subtitle="Keep your virtual water pet happy & hydrated"
        onExit={() => router.back()}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <View style={styles.statsBar}>
          <Text style={styles.statLabel}>Hydration Meter:</Text>
          <View style={styles.meterTrack}>
            <View style={[styles.meterFill, { width: `${happiness}%` }]} />
          </View>

          <Text style={styles.meterText}>{happiness}%</Text>
        </View>

        <View style={styles.speechBubble}>
          <Text style={styles.speechText}>{dialogue}</Text>
        </View>

        <TouchableOpacity style={styles.petStage} onPress={handlePokePet} activeOpacity={0.8}>
          {hat === 'crown' && <Text style={styles.hatOverlay}>👑</Text>}
          {hat === 'shades' && <Text style={styles.hatOverlay}>🕶️</Text>}
          {hat === 'party' && <Text style={styles.hatOverlay}>🥳</Text>}
          <Text style={styles.petEmoji}>{getPetMoodEmoji()}</Text>
          <Text style={styles.petName}>Hydro-Buddy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.feedBtn} onPress={handleFeedWater} activeOpacity={0.8}>
          <Ionicons name="water" size={24} color={Colors.white} />
          <Text style={styles.feedBtnText}>Feed 250ml Water (+15 XP)</Text>
        </TouchableOpacity>

        <View style={styles.hatSection}>
          <Text style={styles.hatTitle}>Customize Hydro-Buddy Style:</Text>
          <View style={styles.hatRow}>
            {HATS.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={[styles.hatBtn, hat === h.id && styles.hatBtnActive]}
                onPress={() => handleSelectHat(h.id)}
              >
                <Text style={styles.hatBtnText}>{h.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 16,
    gap: 10,
    marginBottom: 20,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  meterTrack: {
    flex: 1,
    height: 14,
    backgroundColor: Colors.borderLight,
    borderRadius: 7,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 7,
  },
  meterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  speechBubble: {
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#93c5fd',
    width: '100%',
    marginBottom: 24,
  },
  speechText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e40af',
    textAlign: 'center',
  },
  petStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  hatOverlay: {
    fontSize: 44,
    marginBottom: -20,
    zIndex: 10,
  },
  petEmoji: {
    fontSize: 110,
  },
  petName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  feedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    width: '100%',
    height: 54,
    borderRadius: 16,
    gap: 8,
    marginTop: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  feedBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  hatSection: {
    marginTop: 28,
    width: '100%',
  },
  hatTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 10,
  },
  hatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hatBtn: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hatBtnActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  hatBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
