import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { saveUserWaterHistory, saveUserSleepHistory, fetchUserPlans } from '@/lib/api';

interface QuickLogModalProps {
  visible: boolean;
  onClose: () => void;
  onLoggedSuccess?: (type: string, data?: any) => void;
}

interface QuickLogItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  cardGradient: [string, string];
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  themeColor: string;
  shadowColor: string;
  onPress: () => void;
}

const AnimatedQuickCard: React.FC<{
  item: QuickLogItem;
  index: number;
  visible: boolean;
}> = ({ item, index, visible }) => {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      enterAnim.setValue(0);
      Animated.spring(enterAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        delay: index * 60,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, index]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.93,
      speed: 40,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      speed: 25,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  const translateY = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });

  const enterScale = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });

  const opacity = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity,
          transform: [
            { translateY },
            { scale: Animated.multiply(pressScale, enterScale) },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={item.onPress}
        style={[styles.cardTouchable, { shadowColor: item.shadowColor }]}
      >
        <LinearGradient
          colors={item.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cardGradient, { borderColor: item.borderColor }]}
        >
          {/* Top row: Icon Badge & Status Pill */}
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.cardIconBox,
                {
                  borderColor: item.themeColor,
                  borderWidth: 1.5,
                  backgroundColor: 'transparent',
                },
              ]}
            >
              <Ionicons name={item.icon as any} size={22} color={item.themeColor} />
            </View>
            <View style={[styles.badgePill, { backgroundColor: item.badgeBg }]}>
              <Text style={[styles.badgePillText, { color: item.badgeText }]}>
                {item.badge}
              </Text>
            </View>
          </View>

          {/* Bottom row: Title, Subtitle, and mini Action Arrow */}
          <View style={styles.cardBottomRow}>
            <View style={{ flex: 1, paddingRight: 4 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>
            <View style={[styles.miniArrowCircle, { backgroundColor: item.badgeBg }]}>
              <Ionicons name="arrow-forward" size={13} color={item.badgeText} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  visible,
  onClose,
  onLoggedSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'menu' | 'weight' | 'water' | 'meal' | 'sleep'>('menu');
  const [loading, setLoading] = useState(false);

  // Form states
  const [weightInput, setWeightInput] = useState('');
  const [waterAmount, setWaterAmount] = useState('0.5'); // in Liters
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'>('Breakfast');
  const [mealDesc, setMealDesc] = useState('');
  const [sleepHours, setSleepHours] = useState('7.5');

  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      sheetAnim.setValue(0);
      Animated.spring(sheetAnim, {
        toValue: 1,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const handleClose = () => {
    setActiveTab('menu');
    setWeightInput('');
    setMealDesc('');
    onClose();
  };

  const handleSaveWeight = async () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 20 || val >= 300) {
      Alert.alert('Invalid Weight', 'Please enter a realistic weight in kg (e.g. 72.4).');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Sign in Required', 'Please sign in to log your weight.');
        return;
      }

      const uid = session.user.id;
      const today = new Date().toISOString();

      const { data: userData } = await supabase
        .from('users')
        .select('weight_loss_journey')
        .eq('id', uid)
        .maybeSingle();

      const journey = userData?.weight_loss_journey || { history: [] };
      const history = Array.isArray(journey.history) ? [...journey.history] : [];
      history.unshift({ date: today, weight: val });

      await supabase
        .from('users')
        .update({ weight_loss_journey: { ...journey, history } })
        .eq('id', uid);

      Alert.alert('Weight Logged', `Successfully recorded ${val.toFixed(1)} kg!`);
      onLoggedSuccess?.('weight', val);
      handleClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save weight log.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWater = async () => {
    const val = parseFloat(waterAmount);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter water amount in liters.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;

      const plan = await fetchUserPlans(uid);
      const waterHistory = plan?.water_history || [];
      const todayStr = new Date().toISOString().split('T')[0];

      const existingIdx = waterHistory.findIndex((w) => w.date?.startsWith(todayStr));
      let updated = [...waterHistory];
      if (existingIdx >= 0) {
        updated[existingIdx].amount = Number((updated[existingIdx].amount + val).toFixed(1));
      } else {
        updated.unshift({ date: new Date().toISOString(), amount: val });
      }

      await saveUserWaterHistory(uid, updated);
      Alert.alert('Water Logged', `Added +${val}L to today's hydration!`);
      onLoggedSuccess?.('water', val);
      handleClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not log water.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!mealDesc.trim()) {
      Alert.alert('Missing Description', 'Please type what you ate (e.g. Oats with fruits & nuts).');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;

      const { data: userData } = await supabase
        .from('users')
        .select('weight_loss_journey')
        .eq('id', uid)
        .maybeSingle();

      const journey = userData?.weight_loss_journey || { history: [] };
      const meals = Array.isArray(journey.meals) ? [...journey.meals] : [];

      meals.unshift({
        id: `meal_${Date.now()}`,
        date: new Date().toISOString(),
        mealType: mealType as any,
        description: mealDesc.trim(),
        calories: 350,
        feedback: 'Healthy balanced meal supporting your weight loss goal.',
      });

      await supabase
        .from('users')
        .update({ weight_loss_journey: { ...journey, meals } })
        .eq('id', uid);

      Alert.alert('Meal Logged', `${mealType} recorded successfully!`);
      onLoggedSuccess?.('meal', mealDesc);
      handleClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not log meal.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSleep = async () => {
    const val = parseFloat(sleepHours);
    if (isNaN(val) || val <= 0 || val > 24) {
      Alert.alert('Invalid Sleep', 'Please enter hours between 1 and 24.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;

      const plan = await fetchUserPlans(uid);
      const sleepHistory = plan?.sleep_history || [];
      const todayStr = new Date().toISOString().split('T')[0];

      const existingIdx = sleepHistory.findIndex((s) => s.date?.startsWith(todayStr));
      let updated = [...sleepHistory];
      if (existingIdx >= 0) {
        updated[existingIdx].hours = val;
      } else {
        updated.unshift({ date: new Date().toISOString(), hours: val });
      }

      await saveUserSleepHistory(uid, updated);
      Alert.alert('Sleep Logged', `Recorded ${val}h of recovery sleep!`);
      onLoggedSuccess?.('sleep', val);
      handleClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not log sleep.');
    } finally {
      setLoading(false);
    }
  };

  const menuItems: QuickLogItem[] = [
    {
      id: 'weight',
      title: 'Weight',
      subtitle: 'Daily check-in',
      badge: '🎯 GOAL',
      icon: 'scale-outline',
      cardGradient: ['#F0FDF4', '#DCFCE7'],
      borderColor: '#86EFAC',
      badgeBg: '#DCFCE7',
      badgeText: '#15803D',
      themeColor: '#0A8554',
      shadowColor: '#059669',
      onPress: () => {
        handleClose();
        router.push(`/(app)/dashboard/track?tab=weight&log=weight&t=${Date.now()}` as any);
      },
    },
    {
      id: 'water',
      title: 'Water',
      subtitle: 'Track hydration',
      badge: '💧 3.0L',
      icon: 'water-outline',
      cardGradient: ['#F0F9FF', '#E0F2FE'],
      borderColor: '#7DD3FC',
      badgeBg: '#E0F2FE',
      badgeText: '#0369A1',
      themeColor: '#0284C7',
      shadowColor: '#0284C7',
      onPress: () => {
        handleClose();
        router.push('/(app)/dashboard/track?tab=water' as any);
      },
    },
    {
      id: 'meal',
      title: 'Meal Log',
      subtitle: 'AI suggestions',
      badge: '✨ AI MAGIC',
      icon: 'restaurant-outline',
      cardGradient: ['#FFFBEB', '#FEF3C7'],
      borderColor: '#FCD34D',
      badgeBg: '#FEF3C7',
      badgeText: '#B45309',
      themeColor: '#D97706',
      shadowColor: '#D97706',
      onPress: () => {
        handleClose();
        router.push('/(app)/dashboard/log' as any);
      },
    },
    {
      id: 'sleep',
      title: 'Sleep',
      subtitle: 'Rest & recovery',
      badge: '🌙 RECHARGE',
      icon: 'moon-outline',
      cardGradient: ['#FAF5FF', '#F3E8FF'],
      borderColor: '#D8B4FE',
      badgeBg: '#F3E8FF',
      badgeText: '#6B21A8',
      themeColor: '#7C3AED',
      shadowColor: '#7C3AED',
      onPress: () => {
        handleClose();
        router.push('/(app)/dashboard/track?tab=sleep' as any);
      },
    },
  ];

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap */}
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.sheetContainer,
            {
              paddingBottom: Math.max(insets.bottom + 16, 28),
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Drag Pill Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              {activeTab !== 'menu' && (
                <TouchableOpacity
                  onPress={() => setActiveTab('menu')}
                  style={styles.backIconBtn}
                >
                  <Ionicons name="arrow-back" size={20} color="#0F172A" />
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  {activeTab === 'menu' && 'Quick Health Log'}
                  {activeTab === 'weight' && 'Log Your Weight'}
                  {activeTab === 'water' && 'Log Water Intake'}
                  {activeTab === 'meal' && 'Log a Meal'}
                  {activeTab === 'sleep' && 'Log Sleep Duration'}
                </Text>
                {activeTab === 'menu' && (
                  <Text style={styles.sheetSubtitle}>
                    Choose a metric to log or track
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* MENU VIEW */}
          {activeTab === 'menu' && (
            <View style={styles.menuGrid}>
              {menuItems.map((item, index) => (
                <AnimatedQuickCard
                  key={item.id}
                  item={item}
                  index={index}
                  visible={visible}
                />
              ))}
            </View>
          )}

          {/* WEIGHT FORM */}
          {activeTab === 'weight' && (
            <View style={styles.formContent}>
              <Text style={styles.inputLabel}>Current Weight Measurement (kg)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 72.4"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  value={weightInput}
                  onChangeText={setWeightInput}
                  autoFocus
                />
                <Text style={styles.unitText}>kg</Text>
              </View>

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleSaveWeight}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Save Weight</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* WATER FORM */}
          {activeTab === 'water' && (
            <View style={styles.formContent}>
              <Text style={styles.inputLabel}>Select Intake Amount</Text>
              <View style={styles.quickPillsRow}>
                {['0.25', '0.5', '0.75', '1.0'].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickPill,
                      waterAmount === amt && styles.quickPillActive,
                    ]}
                    onPress={() => setWaterAmount(amt)}
                  >
                    <Text
                      style={[
                        styles.quickPillText,
                        waterAmount === amt && styles.quickPillTextActive,
                      ]}
                    >
                      +{amt}L
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleSaveWater}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Log Water</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* MEAL FORM */}
          {activeTab === 'meal' && (
            <View style={styles.formContent}>
              <Text style={styles.inputLabel}>Meal Time</Text>
              <View style={styles.quickPillsRow}>
                {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.quickPill,
                      mealType === t && styles.quickPillActive,
                    ]}
                    onPress={() => setMealType(t)}
                  >
                    <Text
                      style={[
                        styles.quickPillText,
                        mealType === t && styles.quickPillTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 8 }]}>What did you eat?</Text>
              <View style={[styles.inputRow, { height: 'auto', minHeight: 64, paddingVertical: 8 }]}>
                <TextInput
                  style={[styles.textInput, { height: 'auto' }]}
                  placeholder="e.g. 2 Chapatis, dal, mixed green salad"
                  placeholderTextColor="#94A3B8"
                  value={mealDesc}
                  onChangeText={setMealDesc}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleSaveMeal}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Save Meal</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* SLEEP FORM */}
          {activeTab === 'sleep' && (
            <View style={styles.formContent}>
              <Text style={styles.inputLabel}>Sleep Duration</Text>
              <View style={styles.quickPillsRow}>
                {['6.0', '7.0', '7.5', '8.0', '9.0'].map((hrs) => (
                  <TouchableOpacity
                    key={hrs}
                    style={[
                      styles.quickPill,
                      sleepHours === hrs && styles.quickPillActive,
                    ]}
                    onPress={() => setSleepHours(hrs)}
                  >
                    <Text
                      style={[
                        styles.quickPillText,
                        sleepHours === hrs && styles.quickPillTextActive,
                      ]}
                    >
                      {hrs}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleSaveSleep}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Save Sleep</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 20,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 16,
    paddingBottom: 4,
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '48%',
  },
  cardTouchable: {
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  miniArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    gap: 12,
    paddingVertical: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
  },
  unitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 8,
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPillActive: {
    backgroundColor: '#0A8554',
    borderColor: '#0A8554',
  },
  quickPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  quickPillTextActive: {
    color: '#FFFFFF',
  },
  primaryActionBtn: {
    backgroundColor: '#0A8554',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0A8554',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
