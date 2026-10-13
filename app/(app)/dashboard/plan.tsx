import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DietContent } from './diet';
import { ExerciseContent } from './exercise';

export default function TreatmentPlanScreen() {
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'Diet' | 'Exercise'>('Diet');

  useEffect(() => {
    if (params.tab === 'exercise') {
      setActiveTab('Exercise');
    } else if (params.tab === 'diet') {
      setActiveTab('Diet');
    }
  }, [params.tab]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('/(app)/dashboard')}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {activeTab === 'Diet' ? 'Diet & Nutrition' : 'Exercise Plan'}
        </Text>

        <View style={{ width: 36 }} />
      </View>

      {/* Segmented Tabs: Diet | Exercise */}
      <View style={styles.tabToggleRow}>
        {(['Diet', 'Exercise'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab === 'Diet' ? 'restaurant-outline' : 'barbell-outline'}
                size={16}
                color={isActive ? '#0A8554' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  isActive && styles.toggleBtnTextActive,
                ]}
              >
                {tab === 'Diet' ? 'Diet' : 'Exercise'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Views */}
      <View style={styles.contentContainer}>
        {activeTab === 'Diet' ? (
          <DietContent embedded={true} />
        ) : (
          <ExerciseContent embedded={true} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#0A8554',
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
});
