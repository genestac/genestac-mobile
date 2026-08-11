import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getUserGameData, UserGameData } from '@/lib/games/gameStorage';

interface GameCardDef {
  id: keyof UserGameData['games'];
  route: string;
  title: string;
  subtitle: string;
  iconName: string;
  badgeText: string;
  accentColor: string;
  softColor: string;
}

// Palette derived from a soft glass-card reference: muted pastel tints,
// a single saturated accent per card, and consistent ink/mute text colors.
const GAME_CARDS: GameCardDef[] = [
  {
    id: 'swipe-junk',
    route: '/games/swipe-junk',
    title: 'Swipe the Junk',
    subtitle: 'Reflex sorting — catch the healthy food, flick away the junk.',
    iconName: 'nutrition',
    badgeText: 'Arcade',
    accentColor: '#16a34a',
    softColor: '#eafaf1',
  },
  {
    id: 'glucose-defender',
    route: '/games/glucose-defender',
    title: 'Glucose Defender',
    subtitle: 'Flatten blood sugar spikes with smart metabolic buffers.',
    iconName: 'pulse',
    badgeText: 'Metabolic',
    accentColor: '#0891b2',
    softColor: '#eafbfc',
  },
  {
    id: 'hunger-games',
    route: '/games/hunger-games',
    title: 'The Hunger Games',
    subtitle: 'Save your hungry avatar by making the smarter call.',
    iconName: 'fast-food',
    badgeText: 'Scenario Quiz',
    accentColor: '#ca8a04',
    softColor: '#fdf8ec',
  },
];

function tierFor(xp: number) {
  if (xp > 500) return { label: 'Master', icon: '🥇' };
  if (xp > 200) return { label: 'Pro', icon: '🥈' };
  return { label: 'Rookie', icon: '🥉' };
}

export default function GamesHubScreen() {
  const [gameData, setGameData] = useState<UserGameData | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getUserGameData().then(setGameData);
  }, []);

  const totalXP = gameData?.totalXP || 0;
  const gamesPlayed = GAME_CARDS.filter((c) => (gameData?.games[c.id]?.highScore || 0) > 0).length;
  const tier = tierFor(totalXP);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Arcade & Mini-Games</Text>
          <Text style={styles.headerSubtitle}>Learn while you play</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 20, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile-style progress card */}
        <View style={styles.glassCard}>
          <View style={styles.glassCardTopRow}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarEmoji}>{tier.icon}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.iconGhostBtn} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.glassCardName}>Your Progress</Text>
          <Text style={styles.glassCardRole}>{tier.label} · Keep playing to level up</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>⭐ {totalXP}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{gamesPlayed}/{GAME_CARDS.length}</Text>
              <Text style={styles.statLabel}>Played</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{tier.icon}</Text>
              <Text style={styles.statLabel}>{tier.label}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Select a game to play & learn</Text>

        <View style={styles.grid}>
          {GAME_CARDS.map((card) => {
            const stat = gameData?.games[card.id];
            const highScore = stat?.highScore || 0;

            return (
              <View key={card.id} style={styles.glassCard}>
                <View style={styles.glassCardTopRow}>
                  <View style={[styles.avatarRing, { borderColor: card.accentColor + '33' }]}>
                    <View style={[styles.avatarInner, { backgroundColor: card.softColor }]}>
                      <Ionicons name={card.iconName as any} size={22} color={card.accentColor} />
                    </View>
                  </View>
                  <View style={[styles.pillTag, { backgroundColor: card.softColor }]}>
                    <Text style={[styles.pillTagText, { color: card.accentColor }]}>{card.badgeText}</Text>
                  </View>
                </View>

                <Text style={styles.glassCardName}>{card.title}</Text>
                <Text style={styles.glassCardRole} numberOfLines={2}>{card.subtitle}</Text>

                <View style={styles.statsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.statValue}>{highScore}</Text>
                    <Text style={styles.statLabel}>High score</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCol}>
                    <Text style={styles.statValue}>{highScore > 0 ? 'Played' : 'New'}</Text>
                    <Text style={styles.statLabel}>Status</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.playBtn, { backgroundColor: Colors.textPrimary }]}
                    onPress={() => router.push(card.route as any)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.playBtnText}>{highScore > 0 ? 'Play again' : 'Play now'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconGhostBtnLg}
                    onPress={() => router.push(card.route as any)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-forward" size={18} color={card.accentColor} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F2FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
  },

  // Shared "glass card" shell, echoing the reference profile card:
  // soft rounded corners, translucent-feeling border, gentle shadow.
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#5b5b8f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  glassCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  avatarInner: {
    flex: 1,
    borderRadius: 21,
    backgroundColor: '#F3F2FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  iconGhostBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  iconGhostBtnLg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  pillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pillTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  glassCardName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  glassCardRole: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  statValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  grid: {
    gap: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  playBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});