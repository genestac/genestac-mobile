import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { saveUserWaterHistory, saveUserSleepHistory, fetchUserPlans } from '@/lib/api';

interface QuickLogModalProps {
  visible: boolean;
  onClose: () => void;
  onLoggedSuccess?: (type: string, data?: any) => void;
}

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

      // Read existing weight_loss_journey
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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {activeTab !== 'menu' && (
                <TouchableOpacity
                  onPress={() => setActiveTab('menu')}
                  style={styles.backIconBtn}
                >
                  <Ionicons name="arrow-back" size={20} color="#0F172A" />
                </TouchableOpacity>
              )}
              <Text style={styles.sheetTitle}>
                {activeTab === 'menu' && 'Quick Health Log'}
                {activeTab === 'weight' && 'Log Your Weight'}
                {activeTab === 'water' && 'Log Water Intake'}
                {activeTab === 'meal' && 'Log a Meal'}
                {activeTab === 'sleep' && 'Log Sleep Duration'}
              </Text>
            </View>

            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* MENU VIEW */}
          {activeTab === 'menu' && (
            <View style={styles.menuGrid}>
              <TouchableOpacity
                style={[styles.menuItemCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                onPress={() => setActiveTab('weight')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconBg, { backgroundColor: '#0A8554' }]}>
                  <Ionicons name="scale-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.menuItemTitle}>Weight</Text>
                <Text style={styles.menuItemSubtitle}>Record daily kg</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItemCard, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}
                onPress={() => setActiveTab('water')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconBg, { backgroundColor: '#0284C7' }]}>
                  <Ionicons name="water-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.menuItemTitle}>Water</Text>
                <Text style={styles.menuItemSubtitle}>Track hydration</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItemCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                onPress={() => setActiveTab('meal')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconBg, { backgroundColor: '#D97706' }]}>
                  <Ionicons name="nutrition-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.menuItemTitle}>Meal</Text>
                <Text style={styles.menuItemSubtitle}>Breakfast, lunch...</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItemCard, { backgroundColor: '#F3E8FF', borderColor: '#DDD6FE' }]}
                onPress={() => setActiveTab('sleep')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconBg, { backgroundColor: '#7C3AED' }]}>
                  <Ionicons name="moon-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.menuItemTitle}>Sleep</Text>
                <Text style={styles.menuItemSubtitle}>Hours & recovery</Text>
              </TouchableOpacity>
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
              <Text style={styles.inputLabel}>Select Volume</Text>
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
                      +{amt} L
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#0284C7' }]}
                onPress={handleSaveWater}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Add +{waterAmount}L Water</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* MEAL FORM */}
          {activeTab === 'meal' && (
            <View style={styles.formContent}>
              <Text style={styles.inputLabel}>Meal Time</Text>
              <View style={styles.quickPillsRow}>
                {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.quickPill,
                      mealType === m && styles.quickPillActive,
                    ]}
                    onPress={() => setMealType(m)}
                  >
                    <Text
                      style={[
                        styles.quickPillText,
                        mealType === m && styles.quickPillTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Meal Description</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="e.g. Oats with Greek Yogurt & Blueberries"
                placeholderTextColor="#94A3B8"
                multiline
                value={mealDesc}
                onChangeText={setMealDesc}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#D97706' }]}
                onPress={handleSaveMeal}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Save {mealType}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* SLEEP FORM */}
          {activeTab === 'sleep' && (
            <View style={styles.formContent}>
              <Text style={styles.inputLabel}>Last Night's Sleep (Hours)</Text>
              <View style={styles.quickPillsRow}>
                {['6.0', '7.0', '7.5', '8.0', '9.0'].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.quickPill,
                      sleepHours === h && styles.quickPillActive,
                    ]}
                    onPress={() => setSleepHours(h)}
                  >
                    <Text
                      style={[
                        styles.quickPillText,
                        sleepHours === h && styles.quickPillTextActive,
                      ]}
                    >
                      {h} h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#7C3AED' }]}
                onPress={handleSaveSleep}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Record {sleepHours}h Sleep</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backIconBtn: {
    padding: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
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
    justifyContent: 'space-between',
  },
  menuItemCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  menuIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  formContent: {
    gap: 12,
    paddingVertical: 8,
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
