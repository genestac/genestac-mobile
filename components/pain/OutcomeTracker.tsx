// components/pain/OutcomeTracker.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PainOutcomeVisit, TreatmentOutcome } from '@/lib/painMap';

interface OutcomeTrackerProps {
  visits: PainOutcomeVisit[];
  outcomes?: TreatmentOutcome[];
  onAddVisit: (visit: PainOutcomeVisit) => void;
  onAddOutcome?: (outcome: Omit<TreatmentOutcome, 'id' | 'user_id'>) => Promise<void>;
}

export const OutcomeTracker: React.FC<OutcomeTrackerProps> = ({
  visits,
  outcomes = [],
  onAddVisit,
  onAddOutcome,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [visitName, setVisitName] = useState('8 Weeks Follow-up');
  const [painScore, setPainScore] = useState('2');
  const [flexion, setFlexion] = useState('125');
  const [walkingDist, setWalkingDist] = useState('2500');
  const [weight, setWeight] = useState('78');
  const [steps, setSteps] = useState('9000');

  const firstVisit = visits[0] || {
    visit_name: 'Day 1',
    pain_score: 8,
    flexion_degrees: 95,
    walking_distance_meters: 200,
    weight_kg: 88,
    daily_steps: 2000,
  };

  const latestVisit = visits[visits.length - 1] || firstVisit;

  const handleSaveVisit = () => {
    const newVisit: PainOutcomeVisit = {
      id: `v-${Date.now()}`,
      visit_name: visitName,
      visit_date: new Date().toISOString().split('T')[0],
      pain_score: parseInt(painScore, 10) || 2,
      flexion_degrees: parseInt(flexion, 10) || 120,
      extension_degrees: 0,
      walking_distance_meters: parseInt(walkingDist, 10) || 2000,
      weight_kg: parseFloat(weight) || 80,
      daily_steps: parseInt(steps, 10) || 8500,
      exercise_compliance_pct: 95,
    };
    onAddVisit(newVisit);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      

      {/* ── NEW: Treatment Outcomes (Supabase Table Data) ─────────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.outcomesSectionHeader}>
          <Ionicons name="medkit-outline" size={16} color="#DC2626" />
          <Text style={styles.sectionCardTitle}>History</Text>
        </View>

        {outcomes.length === 0 ? (
          <View style={styles.emptyOutcomeState}>
            <Text style={styles.emptyOutcomeText}>No treatment outcomes recorded yet.</Text>
            <Text style={styles.emptyOutcomeSub}>Submit a pain assessment to log outcomes directly to Supabase.</Text>
          </View>
        ) : (
          <View style={styles.outcomesList}>
            {outcomes.map((item, idx) => {
              const hasScore = item.after_treatment_pain_score !== undefined && item.after_treatment_pain_score !== null;
              const scoreVal = item.after_treatment_pain_score ?? 0;
              const scoreColor = !hasScore ? '#64748B' : scoreVal <= 3 ? '#10B981' : scoreVal <= 6 ? '#F59E0B' : '#EF4444';

              return (
                <View key={item.id || `to-${idx}`} style={styles.treatmentOutcomeCard}>
                  <View style={styles.toHeaderRow}>
                    <View style={styles.toTitleBox}>
                      <Ionicons
                        name={item.treatment_given ? "shield-checkmark" : "time-outline"}
                        size={15}
                        color={item.treatment_given ? "#DC2626" : "#64748B"}
                      />
                      <Text style={styles.toTreatmentTitle} numberOfLines={2}>
                        {item.treatment_given || 'Pending Doctor Review'}
                      </Text>
                    </View>
                    <View style={[styles.toScoreBadge, { backgroundColor: scoreColor }]}>
                      <Text style={styles.toScoreBadgeText}>
                        {hasScore ? `After: ${scoreVal}/10` : 'Pending Review'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.toDetailsRow}>
                    <View style={styles.toMetaPill}>
                      <Ionicons name="time-outline" size={12} color="#64748B" />
                      <Text style={styles.toMetaText}>
                        Timeline: {item.pain_reduction_timeline || 'Awaiting Review'}
                      </Text>
                    </View>

                    
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Log Visit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Follow-up Visit</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <View>
                <Text style={styles.fieldLabel}>Visit Label</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={visitName}
                  onChangeText={setVisitName}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Pain Score (0 - 10)</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  value={painScore}
                  onChangeText={setPainScore}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Joint Flexion (°)</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  value={flexion}
                  onChangeText={setFlexion}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Max Walking Distance (Meters)</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  value={walkingDist}
                  onChangeText={setWalkingDist}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Current Weight (kg)</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Daily Average Steps</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  value={steps}
                  onChangeText={setSteps}
                />
              </View>

              <TouchableOpacity
                style={styles.submitVisitBtn}
                onPress={handleSaveVisit}
                activeOpacity={0.8}
              >
                <Text style={styles.submitVisitBtnText}>Save Follow-up Entry</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 10,
    color: '#64748B',
  },
  addVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addVisitText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  comparisonBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  comparisonGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comparisonItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  comparisonItemGood: {
    borderColor: '#86EFAC',
    backgroundColor: '#F7FEE7',
  },
  compLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  compLabelGood: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 2,
  },
  compValueBad: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  compValueGood: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
  },
  compSub: {
    fontSize: 11,
    color: '#64748B',
  },
  compSubGood: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  arrowBox: {
    paddingHorizontal: 6,
  },
  sectionCard: {
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  barLabel: {
    width: 95,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 40,
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  matrixCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matrixTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
  },
  matrixSubtitle: {
    fontSize: 10,
    color: '#0284C7',
    marginBottom: 10,
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  matrixCell: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  cellTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  cellValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  cellDiff: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  cellDiffGood: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  submitVisitBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitVisitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  outcomesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  emptyOutcomeState: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOutcomeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyOutcomeSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  outcomesList: {
    gap: 10,
    marginTop: 4,
  },
  treatmentOutcomeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  toTitleBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toTreatmentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  toScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toScoreBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  toDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
});
