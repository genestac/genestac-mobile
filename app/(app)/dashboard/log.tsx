import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Spacing, Radius } from '@/constants/colors';
import { analyzeMeal } from '@/lib/api';
import { MealLog, WeightJourney } from '@/lib/types';

const MEAL_TYPES = ['Morning', 'Lunch', 'Snacks', 'Dinner'] as const;

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return "—";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      const monthName = d.toLocaleDateString("en-US", { month: "short" });
      return `${monthName} ${day}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const monthName = d.toLocaleDateString("en-US", { month: "short" });
  return `${monthName} ${d.getDate()}`;
};

const groupMealsByDate = (meals?: MealLog[]) => {
  if (!meals || meals.length === 0) return [];
  const groups: Record<
    string,
    {
      dateStr: string;
      rawDate: string;
      totalCals: number;
      items: {
        id?: string;
        type: string;
        cals: number;
        desc: string;
        feedback: string;
      }[];
    }
  > = {};

  meals.forEach((m) => {
    const dStr = formatDateShort(m.date);
    if (!groups[dStr]) {
      groups[dStr] = {
        dateStr: dStr,
        rawDate: m.date,
        totalCals: 0,
        items: [],
      };
    }
    groups[dStr].totalCals += m.calories || 0;
    groups[dStr].items.push({
      id: m.id,
      type: m.mealType || "Meal",
      cals: m.calories || 0,
      desc: m.description,
      feedback: m.feedback || "Balanced choice for your weight loss goals.",
    });
  });

  return Object.values(groups).sort(
    (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
  );
};

export default function LogScreen() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [journey, setJourney] = useState<WeightJourney>({ history: [] });

  // Meal Log Form State
  const [mealType, setMealType] = useState<'Morning' | 'Lunch' | 'Snacks' | 'Dinner'>('Lunch');
  const [mealDesc, setMealDesc] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [savingMeal, setSavingMeal] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<{ calories: number; feedback: string } | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setUser(session.user);

    const { data: userRes } = await supabase
      .from('users')
      .select('weight_loss_journey')
      .eq('id', session.user.id)
      .maybeSingle();

    const j = (userRes?.weight_loss_journey as WeightJourney) || { history: [] };
    setJourney(j);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveJourney = async (newJ: WeightJourney) => {
    await supabase.from('users').update({ weight_loss_journey: newJ }).eq('id', user.id);
    setJourney(newJ);
  };

  const handleSaveMeal = async () => {
    if (!mealDesc.trim()) {
      Alert.alert('Error', 'Please enter a meal description.');
      return;
    }
    setSavingMeal(true);

    try {
      // Call Genestac Backend AI API for meal analysis
      const analysis = await analyzeMeal(mealDesc.trim());

      const newMeal: MealLog = {
        id: Math.random().toString(36).substring(7),
        date: new Date().toISOString(),
        mealType,
        description: mealDesc.trim(),
        calories: mealCalories ? parseInt(mealCalories) : analysis.calories,
        feedback: analysis.feedback,
      };
      const meals = [...(journey.meals || []), newMeal];
      const newJ = { ...journey, meals };
      await saveJourney(newJ);
      setLatestAnalysis({ calories: newMeal.calories, feedback: newMeal.feedback });
      setMealDesc('');
      setMealCalories('');
      Alert.alert('Meal Logged!', `Estimated ${newMeal.calories} kcal.\n\nAI Insight: ${newMeal.feedback}`);
    } catch {
      Alert.alert('Error', 'Unable to log meal. Please try again.');
    } finally {
      setSavingMeal(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right"]}>
        <ActivityIndicator color={Colors.primaryLight} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Meal Log</Text>
            <Text style={styles.subtitle}>Log meals & get instant AI suggestions</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal Logging Card */}
        <View style={styles.section}>
          <Text style={styles.sectionHead}>Log a Meal</Text>

          <Text style={styles.inputLabel}>Meal Time</Text>
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.mealTypeBtn, mealType === m && styles.mealTypeBtnActive]}
                onPress={() => setMealType(m)}
              >
                <Text style={[styles.mealTypeBtnText, mealType === m && styles.mealTypeBtnTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.textIn}
            value={mealDesc}
            onChangeText={setMealDesc}
            placeholder="e.g. 2 Oats roti with paneer curry and salad"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.inputLabel}>
            Est. Calories (kcal) <Text style={{ color: Colors.textLight }}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.textIn}
            value={mealCalories}
            onChangeText={setMealCalories}
            keyboardType="numeric"
            placeholder="e.g. 450"
            placeholderTextColor={Colors.textLight}
          />

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSaveMeal}
            disabled={savingMeal}
            activeOpacity={0.8}
          >
            {savingMeal ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Log Meal</Text>
            )}
          </TouchableOpacity>

          {/* Instant AI Suggestion Box */}
          {latestAnalysis && (
            <View style={styles.latestAiCard}>
              <View style={styles.aiCardHeaderRow}>
                <Ionicons name="sparkles" size={16} color="#D97706" />
                <Text style={styles.latestAiTitle}>AI Meal Analysis</Text>
                <View style={styles.orangeCalsBadgePill}>
                  <Text style={styles.orangeCalsBadgeText}>
                    ~{latestAnalysis.calories} kcal
                  </Text>
                </View>
              </View>
              <Text style={styles.latestAiFeedback}>
                {latestAnalysis.feedback}
              </Text>
            </View>
          )}

          {/* Meal History Categorized By Date */}
          {journey.meals && journey.meals.length > 0 && (
            <View style={{ marginTop: Spacing.md }}>
              <Text style={[styles.sectionHead, { marginBottom: Spacing.sm }]}>Recent Meals by Date</Text>
              {groupMealsByDate(journey.meals).map((group, idx) => (
                <View key={idx} style={styles.pastMealDateGroup}>
                  <View style={styles.pastMealDateHeaderRow}>
                    <Text style={styles.pastMealDateTitle}>{group.dateStr}</Text>
                    <View style={styles.orangeCalsBadgePill}>
                      <Text style={styles.orangeCalsBadgeText}>
                        {group.totalCals} kcal
                      </Text>
                    </View>
                  </View>
                  {group.items.map((item, iIdx) => (
                    <View key={item.id || iIdx} style={styles.pastMealItemRow}>
                      <View style={styles.pastMealItemTopRow}>
                        <Text style={styles.pastMealItemType}>{item.type}</Text>
                        {item.cals > 0 && (
                          <Text style={styles.pastMealItemCals}>{item.cals} kcal</Text>
                        )}
                      </View>
                      <Text style={styles.pastMealItemDesc}>{item.desc}</Text>
                      {item.feedback ? (
                        <View style={styles.aiQuoteBox}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <Ionicons name="sparkles" size={12} color="#D97706" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>AI Suggestion</Text>
                          </View>
                          <Text style={styles.aiQuoteText}>{item.feedback}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  content: { padding: Spacing.md, gap: 12 },
  section: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border },
  sectionHead: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  inputLabel: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  mealTypeRow: { flexDirection: 'row', gap: Spacing.xs },
  mealTypeBtn: { flex: 1, paddingVertical: 7, borderRadius: Radius.md, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  mealTypeBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  mealTypeBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  mealTypeBtnTextActive: { color: Colors.white },
  textIn: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10, fontSize: Fonts.sizes.sm, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.borderLight },
  primaryBtn: { backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: 12, alignItems: 'center', marginTop: Spacing.xs },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.sizes.sm },
  latestAiCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    gap: 8,
  },
  aiCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  latestAiTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
    flex: 1,
  },
  latestAiFeedback: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500',
  },
  pastMealDateGroup: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
  },
  pastMealDateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 4,
  },
  pastMealDateTitle: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  orangeCalsBadgePill: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  orangeCalsBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  pastMealItemRow: {
    paddingVertical: 4,
    gap: 2,
  },
  pastMealItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastMealItemType: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pastMealItemCals: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  pastMealItemDesc: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  aiQuoteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.sm,
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 2,
  },
  aiQuoteText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 15,
  },
});
