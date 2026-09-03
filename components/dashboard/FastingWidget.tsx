import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors, Radius } from '@/constants/colors';
import { getFastingProgramState } from '@/lib/fastingStorage';
import { FastingProgramState } from '@/lib/types';

export function FastingWidget() {
  const [fastingState, setFastingState] = useState<FastingProgramState | null>(null);

  const fetchState = async () => {
    const state = await getFastingProgramState();
    setFastingState(state);
  };

  useEffect(() => {
    fetchState();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchState();
    }, [])
  );

  const phase = fastingState?.phase || 'NOT_STARTED';

  const getPhaseDetails = () => {
    if (phase === 'FASTING_ACTIVE') {
      return {
        title: '16:8 Intermittent Fasting Active',
        subtitle: 'Eating Window: 11:00 AM – 7:00 PM (Hourly Reminders Active)',
        badge: 'FASTING ACTIVE',
        badgeColor: '#DCFCE7',
        badgeTextColor: '#15803D',
      };
    }

    return {
      title: 'Intermittent Fasting',
      subtitle: 'Eating Window: 11:00 AM – 7:00 PM (Hourly Reminders)',
      badge: '',
      badgeColor: 'transparent',
      badgeTextColor: 'transparent',
    };
  };

  const details = getPhaseDetails();

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.contentBox}>
          {!!details.badge && (
            <View style={[styles.badge, { backgroundColor: details.badgeColor }]}>
              <Text style={[styles.badgeText, { color: details.badgeTextColor }]}>
                {details.badge}
              </Text>
            </View>
          )}
          <Text style={styles.title}>{details.title}</Text>
          {!!details.subtitle && (
            <Text style={styles.subtitle}>{details.subtitle}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/fasting')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>
            {phase === 'FASTING_ACTIVE' ? 'Open' : 'Start'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  contentBox: {
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 3,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
