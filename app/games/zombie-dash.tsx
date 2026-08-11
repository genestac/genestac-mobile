import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GameHeader } from '@/components/games/GameHeader';
import { getUserGameData, recordGameCompletion } from '@/lib/games/gameStorage';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface Milestone {
  stepsReq: number;
  rewardName: string;
  unlocked: boolean;
  icon: string;
}

export default function ZombieDashScreen() {
  const [steps, setSteps] = useState(3500);
  const [score, setScore] = useState(350);
  const [totalXP, setTotalXP] = useState(0);
  const insets = useSafeAreaInsets();

  const [milestones, setMilestones] = useState<Milestone[]>([
    { stepsReq: 1000, rewardName: 'Speedy Sneakers 👟', unlocked: true, icon: 'footsteps' },
    { stepsReq: 3000, rewardName: 'Zombie Shield 🛡️', unlocked: true, icon: 'shield-checkmark' },
    { stepsReq: 5000, rewardName: 'Jetpack Dash 🚀', unlocked: false, icon: 'rocket' },
    { stepsReq: 10000, rewardName: 'Golden Marathon Crown 👑', unlocked: false, icon: 'trophy' },
  ]);

  useEffect(() => {
    getUserGameData().then((data) => {
      const storedScore = data.games['zombie-dash']?.highScore || 350;
      setScore(storedScore);
    });
  }, []);

  const handleSimulateSteps = async (added: number) => {
    const newSteps = steps + added;
    setSteps(newSteps);
    const newScore = Math.floor(newSteps / 10);
    setScore(newScore);

    setMilestones((prev) =>
      prev.map((m) => ({
        ...m,
        unlocked: newSteps >= m.stepsReq,
      }))
    );

    const xp = Math.floor(added / 5);
    setTotalXP((x) => x + xp);
    await recordGameCompletion('zombie-dash', newScore, xp);
  };

  const zombieDistance = Math.max(5, 100 - Math.floor(steps / 100));

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <GameHeader
        title="Zombie Step Dash 🏃‍♂️"
        subtitle="Outrun Couch Potato Zombies with your daily steps!"
        score={score}
        onExit={() => router.back()}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <View style={styles.trackCard}>
          <Text style={styles.trackTitle}>🏃‍♂️ Zombie Distance Warning!</Text>
          <Text style={styles.zombieStatus}>
            {zombieDistance > 20
              ? `🧟 Couch Zombies are ${zombieDistance} meters behind you!`
              : `⚠️ DANGER! Zombies are right on your tail! Walk more steps!`}
          </Text>

          <View style={styles.stepBox}>
            <Ionicons name="walk" size={32} color={Colors.primary} />
            <View>
              <Text style={styles.stepCount}>{steps.toLocaleString()} Steps</Text>
              <Text style={styles.stepSub}>Daily motion distance logged</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dashBtn}
            onPress={() => handleSimulateSteps(500)}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={20} color={Colors.white} />
            <Text style={styles.dashBtnText}>Sprint +500 Steps (+100 XP)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>🏆 Milestone Rewards Unlocked:</Text>
        <View style={styles.milestoneList}>
          {milestones.map((m, idx) => (
            <View
              key={idx}
              style={[styles.milestoneCard, m.unlocked && styles.milestoneCardUnlocked]}
            >
              <Ionicons
                name={m.icon as any}
                size={28}
                color={m.unlocked ? Colors.primary : Colors.textMuted}
              />
              <View style={styles.milestoneInfo}>
                <Text style={[styles.milestoneName, m.unlocked && styles.milestoneNameUnlocked]}>
                  {m.rewardName}
                </Text>
                <Text style={styles.milestoneReq}>{m.stepsReq.toLocaleString()} steps required</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  m.unlocked ? styles.statusBadgeUnlocked : styles.statusBadgeLocked,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    m.unlocked ? styles.statusTextUnlocked : styles.statusTextLocked,
                  ]}
                >
                  {m.unlocked ? 'Unlocked' : 'Locked'}
                </Text>
              </View>
            </View>
          ))}
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
    padding: 16,
  },
  trackCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  zombieStatus: {
    fontSize: 14,
    color: '#c2410c',
    fontWeight: '600',
    marginBottom: 16,
  },
  stepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    gap: 14,
    marginBottom: 16,
  },
  stepCount: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
  },
  stepSub: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  dashBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    gap: 8,
  },
  dashBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  milestoneList: {
    gap: 12,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  milestoneCardUnlocked: {
    borderColor: Colors.primaryLight,
    backgroundColor: '#f0fdf4',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  milestoneNameUnlocked: {
    color: Colors.textPrimary,
  },
  milestoneReq: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeUnlocked: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeLocked: {
    backgroundColor: Colors.surface,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextUnlocked: {
    color: '#15803d',
  },
  statusTextLocked: {
    color: Colors.textMuted,
  },
});
