import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

interface GameHeaderProps {
  title: string;
  score?: number;
  timer?: number;
  subtitle?: string;
  onExit?: () => void;
  backgroundColor?: string;
  hideBorder?: boolean;
}

export function GameHeader({
  title,
  score,
  timer,
  subtitle,
  onExit,
  backgroundColor,
  hideBorder,
}: GameHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onExit) {
      onExit();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 12) },
        backgroundColor ? { backgroundColor } : null,
        hideBorder ? { borderBottomWidth: 0 } : null,
      ]}
    >
      <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.statsContainer}>
        {timer !== undefined && (
          <View style={styles.badge}>
            <Ionicons name="time-outline" size={16} color="#d97706" />
            <Text style={styles.timerText}>{timer}s</Text>
          </View>
        )}
        {score !== undefined && (
          <View style={[styles.badge, styles.scoreBadge]}>
            <Ionicons name="star" size={16} color="#eab308" />
            <Text style={styles.scoreText}>{score}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  scoreBadge: {
    backgroundColor: '#fef08a',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#854d0e',
  },
});
