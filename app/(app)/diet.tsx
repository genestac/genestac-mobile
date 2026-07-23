import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Spacing, Radius } from '@/constants/colors';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_META: Record<string, { icon: string; color: string; bg: string; time: string }> = {
  breakfast: { icon: 'sunny-outline', color: '#F2A340', bg: '#FDF2E1', time: '7:30 AM' },
  lunch: { icon: 'partly-sunny-outline', color: '#E8604C', bg: '#FCE7E3', time: '1:00 PM' },
  snacks: { icon: 'cafe-outline', color: '#7C9070', bg: '#EAEFE4', time: '4:30 PM' },
  dinner: { icon: 'moon-outline', color: '#0B6B54', bg: '#E1EFEA', time: '8:00 PM' },
};

interface FormattedMeal {
  title: string;
  subtitle?: string;
  details?: string[];
  calories?: string;
}

interface ParsedMeal extends FormattedMeal {
  id: string;
  typeLabel: string;
  meta: { icon: string; color: string; bg: string; time: string };
}

function formatMealItem(data: any): FormattedMeal {
  if (data === null || data === undefined) {
    return { title: 'Not specified' };
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return { title: String(data) };
  }

  if (Array.isArray(data)) {
    const items = data
      .map(item => (typeof item === 'object' && item !== null ? formatMealItem(item).title : String(item)))
      .filter(Boolean);
    return {
      title: items[0] || 'Meal items',
      details: items.length > 1 ? items.slice(1) : undefined,
    };
  }

  if (typeof data === 'object') {
    // Look for primary title property
    const titleCandidates = [
      data.meal, data.name, data.title, data.dish, data.food,
      data.meal_name, data.item, data.description, data.text
    ];
    let titleStr: string | undefined;

    for (const cand of titleCandidates) {
      if (cand && typeof cand === 'string') {
        titleStr = cand;
        break;
      } else if (cand && typeof cand === 'number') {
        titleStr = String(cand);
        break;
      } else if (cand && typeof cand === 'object') {
        const nested = formatMealItem(cand);
        titleStr = nested.title;
        break;
      }
    }

    // Extract calories / macros
    let caloriesStr: string | undefined;
    if (data.calories || data.kcal || data.cals) {
      const c = data.calories || data.kcal || data.cals;
      caloriesStr = typeof c === 'number' ? `${c} kcal` : String(c);
    }

    // Extract subtitle or portion
    const subCandidates = [data.portion, data.quantity, data.servings, data.description, data.notes, data.summary];
    let subtitleStr: string | undefined;
    for (const sub of subCandidates) {
      if (sub && typeof sub === 'string' && sub !== titleStr) {
        subtitleStr = sub;
        break;
      }
    }

    // Extract ingredients or items array
    let details: string[] | undefined;
    const arrayCandidates = [data.items, data.ingredients, data.foods, data.components];
    for (const arr of arrayCandidates) {
      if (Array.isArray(arr) && arr.length > 0) {
        details = arr.map(i => (typeof i === 'object' && i !== null ? (i.name || i.title || JSON.stringify(i)) : String(i)));
        break;
      }
    }

    // Fallback if no specific title key found
    if (!titleStr) {
      const entries = Object.entries(data)
        .filter(([k, v]) => v !== null && v !== undefined && typeof v !== 'function')
        .map(([k, v]) => {
          const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
          const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return `${formattedKey}: ${valStr}`;
        });

      if (entries.length > 0) {
        titleStr = entries[0];
        if (entries.length > 1 && !details) {
          details = entries.slice(1);
        }
      } else {
        titleStr = 'Meal details';
      }
    }

    return {
      title: titleStr,
      subtitle: subtitleStr,
      details,
      calories: caloriesStr,
    };
  }

  return { title: String(data) };
}

function getDayPlan(plan: any, day: string): any {
  if (!plan || typeof plan !== 'object') return null;
  const dayLower = day.toLowerCase();
  const dayShort = dayLower.slice(0, 3);

  for (const key of Object.keys(plan)) {
    const k = key.toLowerCase();
    if (k === dayLower || k === dayShort) {
      return plan[key];
    }
  }

  const keys = Object.keys(plan).map(k => k.toLowerCase());
  const hasMealKeys = keys.some(k => ['breakfast', 'lunch', 'snacks', 'snack', 'dinner', 'meals'].includes(k));
  if (hasMealKeys) {
    return plan;
  }

  return null;
}

function parseMeals(dayData: any): ParsedMeal[] {
  if (!dayData) return [];

  if (typeof dayData === 'object' && !Array.isArray(dayData)) {
    const parsed: ParsedMeal[] = [];
    const keys = Object.keys(dayData);

    const mealOrder = ['breakfast', 'lunch', 'snacks', 'snack', 'dinner'];
    const sortedKeys = keys.sort((a, b) => {
      const ia = mealOrder.indexOf(a.toLowerCase());
      const ib = mealOrder.indexOf(b.toLowerCase());
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return 0;
    });

    for (const key of sortedKeys) {
      const rawMeal = dayData[key];
      if (rawMeal === null || rawMeal === undefined || rawMeal === '') continue;

      const kLower = key.toLowerCase();
      let meta = MEAL_META[kLower];
      if (!meta) {
        if (kLower.includes('snack')) meta = MEAL_META['snacks'];
        else if (kLower.includes('break') || kLower.includes('morn')) meta = MEAL_META['breakfast'];
        else if (kLower.includes('lunch') || kLower.includes('noon')) meta = MEAL_META['lunch'];
        else if (kLower.includes('din') || kLower.includes('night')) meta = MEAL_META['dinner'];
        else meta = { icon: 'restaurant-outline', color: '#4A6572', bg: '#ECEFF1', time: '' };
      }

      const formatted = formatMealItem(rawMeal);
      parsed.push({
        id: key,
        typeLabel: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        title: formatted.title,
        subtitle: formatted.subtitle,
        details: formatted.details,
        calories: formatted.calories,
        meta,
      });
    }
    return parsed;
  }

  if (Array.isArray(dayData)) {
    const metaKeys = ['breakfast', 'lunch', 'snacks', 'dinner'];
    return dayData.map((item, index) => {
      const formatted = formatMealItem(item);
      const meta = MEAL_META[metaKeys[index % metaKeys.length]];
      return {
        id: `meal-${index}`,
        typeLabel: item?.type || `Meal ${index + 1}`,
        title: formatted.title,
        subtitle: formatted.subtitle,
        details: formatted.details,
        calories: formatted.calories,
        meta,
      };
    });
  }

  if (typeof dayData === 'string') {
    return [
      {
        id: 'meal-1',
        typeLabel: 'Daily Diet Plan',
        title: dayData,
        meta: MEAL_META['breakfast'],
      },
    ];
  }

  return [];
}

export default function DietScreen() {
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const [selectedDay, setSelectedDay] = useState(today);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setError('Not logged in'); setLoading(false); return; }
      const { data, error: e } = await supabase.from('user_plans').select('diet_plan').eq('user_id', session.user.id).single();
      if (e || !data?.diet_plan || Object.keys(data.diet_plan).length === 0) { setError('No diet plan assigned yet.'); }
      else setDietPlan(data.diet_plan);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <SafeAreaView style={s.center} edges={["top", "left", "right"]}><ActivityIndicator color={Colors.primaryLight} size="large" /></SafeAreaView>;

  const todayPlan = getDayPlan(dietPlan, selectedDay);
  const meals = parseMeals(todayPlan);

  return (
    <SafeAreaView style={s.flex} edges={["top", "left", "right"]}>
      <ScrollView style={s.flex} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerIcon}><Ionicons name="nutrition" size={22} color={Colors.white} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Diet Plan</Text>
            <Text style={s.subtitle}>Your personalized nutrition guide</Text>
          </View>
          {dietPlan && <View style={s.activePill}><Text style={s.activePillText}>● Active</Text></View>}
        </View>

        {/* Day Selector */}
        {dietPlan && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayScroll}>
            {DAYS.map(d => {
              const active = selectedDay === d;
              const isToday = d === today;
              return (
                <TouchableOpacity key={d} style={[s.dayBtn, active && s.dayBtnActive]} onPress={() => setSelectedDay(d)}>
                  <Text style={[s.dayBtnText, active && s.dayBtnTextActive]}>{d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)}</Text>
                  {isToday && <View style={[s.todayDot, active && { backgroundColor: Colors.white }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Meals or Error */}
        {error ? (
          <View style={s.emptyState}>
            <Ionicons name="leaf-outline" size={48} color={Colors.textLight} />
            <Text style={s.emptyTitle}>No Diet Plan Yet</Text>
            <Text style={s.emptyText}>{error}</Text>
          </View>
        ) : meals.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.textLight} />
            <Text style={s.emptyTitle}>Nothing scheduled</Text>
            <Text style={s.emptyText}>No meals planned for {selectedDay}.</Text>
          </View>
        ) : (
          <View style={s.timeline}>
            {meals.map((meal, i) => {
              const meta = meal.meta;
              return (
                <View key={meal.id} style={s.timelineItem}>
                  {i < meals.length - 1 && <View style={s.timelineLine} />}
                  <View style={[s.timelineDot, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                  </View>
                  <View style={[s.mealCard, { borderLeftColor: meta.color }]}>
                    <View style={s.mealCardTop}>
                      <Text style={s.mealType}>{meal.typeLabel}</Text>
                      {meal.calories ? (
                        <View style={[s.timePill, { backgroundColor: '#FFEDD5' }]}>
                          <Text style={[s.timePillText, { color: '#EA580C' }]}>{meal.calories}</Text>
                        </View>
                      ) : meta.time ? (
                        <View style={[s.timePill, { backgroundColor: meta.bg }]}>
                          <Text style={[s.timePillText, { color: meta.color }]}>{meta.time}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={s.mealText}>{meal.title}</Text>
                    {meal.subtitle ? <Text style={s.mealSubtitle}>{meal.subtitle}</Text> : null}
                    {meal.details && meal.details.length > 0 ? (
                      <View style={s.detailsBox}>
                        {meal.details.map((detail, idx) => (
                          <Text key={idx} style={s.detailItem}>• {detail}</Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  headerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: Fonts.sizes.xs, color: Colors.textMuted },
  activePill: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.full, paddingHorizontal: Spacing.xs, paddingVertical: 3 },
  activePillText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  dayScroll: { gap: 6, paddingVertical: 4 },
  dayBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 2 },
  dayBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  dayBtnText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textMuted },
  dayBtnTextActive: { color: Colors.white },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primaryLight },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  timeline: { gap: 14, paddingLeft: 44 },
  timelineItem: { position: 'relative' },
  timelineLine: { position: 'absolute', left: -27, top: 36, bottom: -14, width: 2, backgroundColor: Colors.borderLight },
  timelineDot: { position: 'absolute', left: -44, top: 0, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  mealCard: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  mealCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mealType: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary, textTransform: 'capitalize' },
  timePill: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  timePillText: { fontSize: 11, fontWeight: '700' },
  mealText: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textPrimary, lineHeight: 19 },
  mealSubtitle: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 3, lineHeight: 16 },
  detailsBox: { marginTop: 6, gap: 3, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  detailItem: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, lineHeight: 16 },
});

