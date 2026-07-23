import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Spacing, Radius } from '@/constants/colors';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface ParsedExercise {
  id: string;
  name: string;
  setsReps?: string;
  category?: string;
  notes?: string;
  details?: string[];
}

function formatExerciseItem(item: any, fallbackName: string = 'Exercise'): ParsedExercise {
  if (item === null || item === undefined) {
    return { id: Math.random().toString(), name: fallbackName };
  }

  if (typeof item === 'string' || typeof item === 'number') {
    return { id: Math.random().toString(), name: String(item) };
  }

  if (Array.isArray(item)) {
    const formattedList = item
      .map(i => (typeof i === 'object' && i !== null ? formatExerciseItem(i).name : String(i)))
      .filter(Boolean);
    return {
      id: Math.random().toString(),
      name: formattedList[0] || fallbackName,
      details: formattedList.length > 1 ? formattedList.slice(1) : undefined,
    };
  }

  if (typeof item === 'object') {
    const nameCandidates = [
      item.name, item.title, item.exercise, item.workout, item.activity,
      item.name_of_exercise, item.exercise_name, item.text, item.description
    ];

    let exName: string | undefined;
    for (const cand of nameCandidates) {
      if (cand && typeof cand === 'string') {
        exName = cand;
        break;
      } else if (cand && typeof cand === 'number') {
        exName = String(cand);
        break;
      }
    }

    const sets = item.sets ? (typeof item.sets === 'number' ? `${item.sets} sets` : item.sets) : '';
    const reps = item.reps ? (typeof item.reps === 'number' ? `${item.reps} reps` : item.reps) : '';
    const duration = item.duration || item.time || item.length;
    const weight = item.weight || item.load;

    let setsReps: string | undefined;
    if (sets && reps) setsReps = `${sets} × ${reps}`;
    else if (sets) setsReps = sets;
    else if (reps) setsReps = reps;
    else if (duration) setsReps = typeof duration === 'number' ? `${duration} mins` : String(duration);

    if (weight) {
      setsReps = setsReps ? `${setsReps} (${weight})` : String(weight);
    }

    const category = item.category || item.type || item.group || item.target || item.muscle;
    const notes = item.notes || item.instructions || (item.rest ? `Rest: ${item.rest}` : undefined);

    let details: string[] | undefined;
    if (Array.isArray(item.items) || Array.isArray(item.steps) || Array.isArray(item.exercises)) {
      const list = item.items || item.steps || item.exercises;
      details = list.map((sub: any) => (typeof sub === 'object' && sub !== null ? formatExerciseItem(sub).name : String(sub)));
    }

    if (!exName) {
      const entries = Object.entries(item)
        .filter(([k, v]) => v !== null && v !== undefined && typeof v !== 'function')
        .map(([k, v]) => {
          const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
          const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return `${formattedKey}: ${valStr}`;
        });

      if (entries.length > 0) {
        exName = entries[0];
        if (entries.length > 1 && !details) {
          details = entries.slice(1);
        }
      } else {
        exName = fallbackName;
      }
    }

    return {
      id: item.id || Math.random().toString(),
      name: exName,
      setsReps: setsReps || (typeof item.setsReps === 'string' ? item.setsReps : undefined),
      category: typeof category === 'string' ? category : undefined,
      notes: typeof notes === 'string' ? notes : undefined,
      details,
    };
  }

  return { id: Math.random().toString(), name: String(item) };
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
  return null;
}

function parseExercises(dayPlan: any): ParsedExercise[] {
  if (!dayPlan) return [];

  if (Array.isArray(dayPlan)) {
    return dayPlan.map((item, index) => formatExerciseItem(item, `Exercise ${index + 1}`));
  }

  if (typeof dayPlan === 'object') {
    const arrayKey = ['exercises', 'workout', 'items', 'routines', 'list'].find(k => Array.isArray(dayPlan[k]));
    if (arrayKey && Array.isArray(dayPlan[arrayKey])) {
      return dayPlan[arrayKey].map((item: any, index: number) => formatExerciseItem(item, `Exercise ${index + 1}`));
    }

    const result: ParsedExercise[] = [];
    Object.entries(dayPlan).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') return;

      if (Array.isArray(val)) {
        val.forEach((subItem, subIdx) => {
          const formatted = formatExerciseItem(subItem, `${key} ${subIdx + 1}`);
          if (!formatted.category) formatted.category = key.replace(/_/g, ' ');
          result.push(formatted);
        });
      } else if (typeof val === 'object') {
        const formatted = formatExerciseItem(val, key.replace(/_/g, ' '));
        result.push(formatted);
      } else {
        result.push({
          id: key,
          name: key.length > 2 && isNaN(Number(key)) ? `${key.replace(/_/g, ' ')}: ${String(val)}` : String(val),
        });
      }
    });

    return result;
  }

  if (typeof dayPlan === 'string') {
    const lines = dayPlan.split(/\n|;/).map(l => l.trim()).filter(Boolean);
    return lines.map((line, idx) => ({
      id: `ex-${idx}`,
      name: line,
    }));
  }

  return [];
}

export default function ExerciseScreen() {
  const [exercisePlan, setExercisePlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const [selectedDay, setSelectedDay] = useState(today);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setError('Not logged in'); setLoading(false); return; }
      const { data, error: e } = await supabase.from('user_plans').select('exercise_plan').eq('user_id', session.user.id).single();
      if (e || !data?.exercise_plan || Object.keys(data.exercise_plan).length === 0) setError('No exercise plan assigned yet.');
      else setExercisePlan(data.exercise_plan);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <SafeAreaView style={s.center} edges={["top", "left", "right"]}><ActivityIndicator color={Colors.primaryLight} size="large" /></SafeAreaView>;

  const dayPlan = getDayPlan(exercisePlan, selectedDay);
  const exercises = parseExercises(dayPlan);

  return (
    <SafeAreaView style={s.flex} edges={["top", "left", "right"]}>
      <ScrollView style={s.flex} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerIcon}><Ionicons name="barbell" size={22} color={Colors.white} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Exercise Plan</Text>
            <Text style={s.subtitle}>Your weekly workout guide</Text>
          </View>
        </View>

        {/* Day Selector */}
        {exercisePlan && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayScroll}>
            {DAYS.map(d => {
              const active = selectedDay === d;
              return (
                <TouchableOpacity key={d} style={[s.dayBtn, active && s.dayBtnActive]} onPress={() => setSelectedDay(d)}>
                  <Text style={[s.dayBtnText, active && s.dayBtnTextActive]}>{d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)}</Text>
                  {d === today && <View style={[s.todayDot, active && { backgroundColor: Colors.white }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Content */}
        {error ? (
          <View style={s.emptyState}>
            <Ionicons name="barbell-outline" size={48} color={Colors.textLight} />
            <Text style={s.emptyTitle}>No Exercise Plan</Text>
            <Text style={s.emptyText}>{error}</Text>
          </View>
        ) : exercises.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="bed-outline" size={48} color={Colors.textLight} />
            <Text style={s.emptyTitle}>Rest Day 🛌</Text>
            <Text style={s.emptyText}>No exercises scheduled for {selectedDay}. Enjoy your recovery!</Text>
          </View>
        ) : (
          <View style={s.exerciseList}>
            <Text style={s.dayHeader}>{selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}'s Workout</Text>
            {exercises.map((ex, i) => (
              <View key={ex.id || i} style={s.exerciseCard}>
                <View style={s.exerciseNum}>
                  <Text style={s.exerciseNumText}>{i + 1}</Text>
                </View>
                <View style={s.exerciseInfo}>
                  <View style={s.titleRow}>
                    <Text style={s.exerciseName}>{ex.name}</Text>
                    {ex.category ? (
                      <View style={s.categoryTag}>
                        <Text style={s.categoryText}>{ex.category}</Text>
                      </View>
                    ) : null}
                  </View>
                  {ex.setsReps ? (
                    <View style={s.badgeRow}>
                      <Ionicons name="repeat-outline" size={14} color={Colors.primaryLight} />
                      <Text style={s.setsRepsText}>{ex.setsReps}</Text>
                    </View>
                  ) : null}
                  {ex.notes ? <Text style={s.notesText}>{ex.notes}</Text> : null}
                  {ex.details && ex.details.length > 0 ? (
                    <View style={s.detailsBox}>
                      {ex.details.map((d, idx) => (
                        <Text key={idx} style={s.detailText}>• {d}</Text>
                      ))}
                    </View>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>
            ))}
            <View style={s.tipCard}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.primaryLight} />
              <Text style={s.tipText}>Complete each exercise with proper form. Rest 60–90s between sets.</Text>
            </View>
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
  dayScroll: { gap: 6, paddingVertical: 4 },
  dayBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 2 },
  dayBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  dayBtnText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textMuted },
  dayBtnTextActive: { color: Colors.white },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primaryLight },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  exerciseList: { gap: 8 },
  dayHeader: { fontSize: Fonts.sizes.md, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  exerciseCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border },
  exerciseNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  exerciseNumText: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.primary },
  exerciseInfo: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  exerciseName: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  categoryTag: { backgroundColor: Colors.primaryMuted, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  categoryText: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'capitalize' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  setsRepsText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.primaryLight },
  notesText: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, fontStyle: 'italic', marginTop: 1 },
  detailsBox: { marginTop: 4, gap: 2 },
  detailText: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  tipCard: { flexDirection: 'row', gap: 8, backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: 12, alignItems: 'flex-start', marginTop: 6 },
  tipText: { flex: 1, fontSize: Fonts.sizes.xs, color: Colors.primary, lineHeight: 18 },
});
