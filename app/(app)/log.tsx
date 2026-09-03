import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Spacing, Radius } from '@/constants/colors';
import {
  analyzeMeal,
  fetchUserPlans,
  saveUserWaterHistory,
  saveUserSleepHistory,
  saveUserMeasurementHistory,
} from '@/lib/api';
import { MealLog, WeightJourney } from '@/lib/types';


const WATER_STEPS = [0.25, 0.5, 1.0];
const HABITS = [
  { key: 'vitamins', label: 'Vitamins', icon: 'fitness-outline' },
  { key: 'walk', label: '30-min Walk', icon: 'walk-outline' },
  { key: 'noSugar', label: 'No Sugar', icon: 'nutrition-outline' },
];
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

  const [activeTab, setActiveTab] = useState<'steps' | 'meals' | 'water' | 'sleep' | 'measurements' | 'habits'>('meals');

  // Meal Log Form State
  const [mealType, setMealType] = useState<'Morning' | 'Lunch' | 'Snacks' | 'Dinner'>('Lunch');
  const [mealDesc, setMealDesc] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [savingMeal, setSavingMeal] = useState(false);

  // Water Log Form State
  const [waterToday, setWaterToday] = useState(0);
  const [savingWater, setSavingWater] = useState(false);

  // Sleep Log Form State
  const [sleepHours, setSleepHours] = useState('7.5');
  const [savingSleep, setSavingSleep] = useState(false);

  // Measurements
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [chest, setChest] = useState('');
  const [savingMeasurements, setSavingMeasurements] = useState(false);

  // Habits
  const [habits, setHabits] = useState({ vitamins: false, walk: false, noSugar: false });
  const [savingHabits, setSavingHabits] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setUser(session.user);

    const [userRes, planData] = await Promise.all([
      supabase.from('users').select('weight_loss_journey').eq('id', session.user.id).maybeSingle(),
      fetchUserPlans(session.user.id),
    ]);

    const j = (userRes.data?.weight_loss_journey as WeightJourney) || { history: [] };
    const waterLogs = planData?.water_history || j.waterLogs || [];
    const sleepLogs = planData?.sleep_history || j.sleepLogs || [];
    const measurements = planData?.measurement_history || j.measurements || [];
    const stepLogs = planData?.steps_history || j.stepLogs || [];

    const updatedJ: WeightJourney = {
      ...j,
      waterLogs,
      sleepLogs,
      measurements,
      stepLogs,
    };
    setJourney(updatedJ);

    const today = new Date().toISOString().split('T')[0];
    const waterLog = waterLogs.find(w => w.date === today);
    setWaterToday(waterLog?.amount ?? 0);
    const todayHabit = j.habitLogs?.find(h => h.date === today);
    if (todayHabit) setHabits({ ...habits, ...todayHabit.habits as any });

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveJourney = async (newJ: WeightJourney) => {
    await supabase.from('users').update({ weight_loss_journey: newJ }).eq('id', user.id);
    setJourney(newJ);
  };

  const handleSaveMeal = async () => {
    if (!mealDesc.trim()) { Alert.alert('Error', 'Please enter a meal description.'); return; }
    setSavingMeal(true);
    
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
    setMealDesc('');
    setMealCalories('');
    setSavingMeal(false);
    Alert.alert('Meal Logged!', `Estimated ${newMeal.calories} kcal. ${newMeal.feedback}`);
  };

  const handleWater = async (amount: number) => {
    setSavingWater(true);
    const today = new Date().toISOString().split('T')[0];
    const newTotal = parseFloat((waterToday + amount).toFixed(2));
    setWaterToday(newTotal);
    const waterLogs = [...(journey.waterLogs || [])];
    const idx = waterLogs.findIndex(w => w.date === today);
    if (idx >= 0) waterLogs[idx].amount = newTotal;
    else waterLogs.push({ date: today, amount: newTotal });
    const newJ = { ...journey, waterLogs };
    setJourney(newJ);
    if (user) {
      await saveUserWaterHistory(user.id, waterLogs);
    }
    setSavingWater(false);
  };

  const handleSaveSleep = async () => {
    setSavingSleep(true);
    const today = new Date().toISOString().split('T')[0];
    const sleepLogs = [...(journey.sleepLogs || [])];
    const idx = sleepLogs.findIndex(s => s.date === today);
    const hrs = parseFloat(sleepHours);
    if (idx >= 0) sleepLogs[idx].hours = hrs;
    else sleepLogs.push({ date: today, hours: hrs });
    const newJ = { ...journey, sleepLogs };
    setJourney(newJ);
    if (user) {
      await saveUserSleepHistory(user.id, sleepLogs);
    }
    setSavingSleep(false);
    Alert.alert('Saved', `Logged ${hrs} hrs of sleep.`);
  };

  const handleSaveMeasurements = async () => {
    setSavingMeasurements(true);
    const today = new Date().toISOString().split('T')[0];
    const measurements = [...(journey.measurements || [])];
    const idx = measurements.findIndex(m => m.date === today);
    const entry = {
      date: today,
      waist: waist ? parseFloat(waist) : undefined,
      hips: hips ? parseFloat(hips) : undefined,
      chest: chest ? parseFloat(chest) : undefined,
    };
    if (idx >= 0) measurements[idx] = entry;
    else measurements.push(entry);
    const newJ = { ...journey, measurements };
    setJourney(newJ);
    if (user) {
      await saveUserMeasurementHistory(user.id, measurements);
    }
    setSavingMeasurements(false);
    Alert.alert('Saved', 'Measurements saved successfully.');
  };

  const handleSaveHabits = async () => {
    setSavingHabits(true);
    const today = new Date().toISOString().split('T')[0];
    const habitLogs = [...(journey.habitLogs || [])];
    const idx = habitLogs.findIndex(h => h.date === today);
    if (idx >= 0) habitLogs[idx].habits = habits;
    else habitLogs.push({ date: today, habits });
    const newJ = { ...journey, habitLogs };
    await saveJourney(newJ);
    setSavingHabits(false);
    Alert.alert('Saved', 'Habits saved.');
  };

  const TABS = [
    { key: 'steps', label: 'Steps', icon: 'walk-outline' },
    { key: 'meals', label: 'Meals', icon: 'restaurant-outline' },
    { key: 'water', label: 'Water', icon: 'water-outline' },
    { key: 'sleep', label: 'Sleep', icon: 'moon-outline' },
    { key: 'measurements', label: 'Measurements', icon: 'resize-outline' },
    { key: 'habits', label: 'Habits', icon: 'checkbox-outline' },
  ] as const;


  if (loading) return <SafeAreaView style={styles.center} edges={["top", "left", "right"]}><ActivityIndicator color={Colors.primaryLight} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Track & Log</Text>
        <Text style={styles.subtitle}>Log your daily health metrics & meals</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key)}>
            <Ionicons name={t.icon as any} size={16} color={activeTab === t.key ? Colors.white : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Steps */}
        {activeTab === 'steps' && (
          <View style={styles.section}>
            <Text style={styles.sectionHead}>Pedometer & Step Calculator</Text>
            <Text style={styles.subtitle}>
              Track real-time steps, distance walked, active duration, and calories burned.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(app)/steps')}
            >
              <Text style={styles.primaryBtnText}>Open Live Step Tracker</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Meals */}
        {activeTab === 'meals' && (

          <View style={styles.section}>
            <Text style={styles.sectionHead}>Log a Meal</Text>
            
            <Text style={styles.inputLabel}>Meal Time</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map(m => (
                <TouchableOpacity key={m} style={[styles.mealTypeBtn, mealType === m && styles.mealTypeBtnActive]} onPress={() => setMealType(m)}>
                  <Text style={[styles.mealTypeBtnText, mealType === m && styles.mealTypeBtnTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={styles.textIn} value={mealDesc} onChangeText={setMealDesc} placeholder="e.g. 2 Oats roti with paneer curry and salad" placeholderTextColor={Colors.textLight} />

            <Text style={styles.inputLabel}>Est. Calories (kcal) <Text style={{ color: Colors.textLight }}>(optional)</Text></Text>
            <TextInput style={styles.textIn} value={mealCalories} onChangeText={setMealCalories} keyboardType="numeric" placeholder="e.g. 450" placeholderTextColor={Colors.textLight} />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveMeal} disabled={savingMeal}>
              {savingMeal ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Log Meal</Text>}
            </TouchableOpacity>

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
                            <Text style={styles.aiQuoteText}>⚡ {item.feedback}</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Water */}
        {activeTab === 'water' && (
          <View style={styles.section}>
            <View style={styles.bigMetric}>
              <Ionicons name="water" size={40} color="#3b82f6" />
              <Text style={[styles.bigValue, { color: '#3b82f6' }]}>{waterToday.toFixed(2)} L</Text>
              <Text style={styles.bigLabel}>Today's intake</Text>
            </View>
            <View style={styles.waterBtns}>
              {WATER_STEPS.map(step => (
                <TouchableOpacity key={step} style={styles.waterBtn} onPress={() => handleWater(step)} disabled={savingWater}>
                  <Text style={styles.waterBtnText}>+{step}L</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.resetBtn} onPress={() => handleWater(-waterToday)} disabled={savingWater || waterToday === 0}>
              <Text style={styles.resetText}>Reset to 0</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sleep */}
        {activeTab === 'sleep' && (
          <View style={styles.section}>
            <View style={styles.bigMetric}>
              <Ionicons name="moon" size={40} color="#8b5cf6" />
              <Text style={[styles.bigValue, { color: '#8b5cf6' }]}>{sleepHours}h</Text>
              <Text style={styles.bigLabel}>Last night's sleep</Text>
            </View>
            <View style={styles.sliderRow}>
              {[4,5,6,7,8,9,10].map(h => (
                <TouchableOpacity key={h} style={[styles.hourBtn, sleepHours === String(h) && styles.hourBtnActive]} onPress={() => setSleepHours(String(h))}>
                  <Text style={[styles.hourBtnText, sleepHours === String(h) && styles.hourBtnTextActive]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.textIn} value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" placeholder="Custom hours..." placeholderTextColor={Colors.textLight} />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveSleep} disabled={savingSleep}>
              {savingSleep ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Save Sleep</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Measurements */}
        {activeTab === 'measurements' && (
          <View style={styles.section}>
            <Text style={styles.sectionHead}>Body Measurements (cm)</Text>
            {[
              { label: 'Waist', value: waist, set: setWaist },
              { label: 'Hips', value: hips, set: setHips },
              { label: 'Chest', value: chest, set: setChest },
            ].map(f => (
              <View key={f.label}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput style={styles.textIn} value={f.value} onChangeText={f.set} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={Colors.textLight} />
              </View>
            ))}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveMeasurements} disabled={savingMeasurements}>
              {savingMeasurements ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Save Measurements</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Habits */}
        {activeTab === 'habits' && (
          <View style={styles.section}>
            <Text style={styles.sectionHead}>Daily Habits Checklist</Text>
            {HABITS.map(h => (
              <TouchableOpacity key={h.key} style={styles.habitRow} onPress={() => setHabits(p => ({ ...p, [h.key]: !p[h.key as keyof typeof p] }))}>
                <View style={[styles.habitCheck, habits[h.key as keyof typeof habits] && styles.habitCheckActive]}>
                  {habits[h.key as keyof typeof habits] && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                </View>
                <Ionicons name={h.icon as any} size={20} color={habits[h.key as keyof typeof habits] ? Colors.primaryLight : Colors.textMuted} />
                <Text style={[styles.habitLabel, habits[h.key as keyof typeof habits] && { color: Colors.primaryLight, fontWeight: '700' }]}>{h.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveHabits} disabled={savingHabits}>
              {savingHabits ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Log Habits</Text>}
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: 4 },
  title: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  tabsScroll: { maxHeight: 46 },
  tabs: { paddingHorizontal: Spacing.md, gap: 6, paddingVertical: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  tabText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.white },
  content: { padding: Spacing.md, gap: 12 },
  section: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border },
  mealTypeRow: { flexDirection: 'row', gap: Spacing.xs },
  mealTypeBtn: { flex: 1, paddingVertical: 7, borderRadius: Radius.md, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  mealTypeBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  mealTypeBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  mealTypeBtnTextActive: { color: Colors.white },
  mealHistoryCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10, marginTop: Spacing.xs },
  mealHistoryTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  mealHistoryType: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textPrimary },
  mealHistoryCals: { fontSize: 12, fontWeight: '700', color: Colors.primaryLight },
  mealHistoryDesc: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  bigMetric: { alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  bigValue: { fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  bigLabel: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, fontWeight: '500' },
  waterBtns: { flexDirection: 'row', gap: Spacing.sm },
  waterBtn: { flex: 1, backgroundColor: '#eff6ff', borderRadius: Radius.md, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
  waterBtnText: { fontWeight: '700', color: '#3b82f6', fontSize: Fonts.sizes.sm },
  resetBtn: { alignSelf: 'center', paddingVertical: Spacing.xs },
  resetText: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, fontWeight: '600' },
  sliderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hourBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  hourBtnActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  hourBtnText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textMuted },
  hourBtnTextActive: { color: Colors.white },
  sectionHead: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  inputLabel: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  textIn: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10, fontSize: Fonts.sizes.sm, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.borderLight },
  primaryBtn: { backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: 12, alignItems: 'center', marginTop: Spacing.xs },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.sizes.sm },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: Colors.surface, borderRadius: Radius.md },
  habitCheck: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  habitCheckActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  habitLabel: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: '500' },
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

