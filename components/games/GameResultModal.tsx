import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface GameResultModalProps {
  visible: boolean;
  score: number;
  xpEarned: number;
  highScore: number;
  message?: string;
  onRestart: () => void;
  onExit: () => void;
}

export function GameResultModal({
  visible,
  score,
  xpEarned,
  highScore,
  message = 'Great job keeping up your health habit!',
  onRestart,
  onExit,
}: GameResultModalProps) {
  const isNewHigh = score >= highScore && score > 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name={isNewHigh ? 'trophy' : 'sparkles'} size={44} color="#f59e0b" />
          </View>

          <Text style={styles.title}>{isNewHigh ? '🎉 NEW HIGH SCORE!' : 'GAME OVER!'}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.scoreBox}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={styles.statValue}>{score}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>XP Earned</Text>
              <Text style={styles.statValue}>+{xpEarned}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Best</Text>
              <Text style={styles.statValue}>{Math.max(score, highScore)}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.btn, styles.exitBtn]} onPress={onExit} activeOpacity={0.8}>
              <Text style={styles.exitBtnText}>Games Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.restartBtn]} onPress={onRestart} activeOpacity={0.8}>
              <Ionicons name="reload" size={18} color={Colors.white} />
              <Text style={styles.restartBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 31, 23, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  scoreBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  exitBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  restartBtn: {
    backgroundColor: Colors.primary,
  },
  restartBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});
