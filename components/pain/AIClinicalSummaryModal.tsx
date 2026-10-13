// components/pain/AIClinicalSummaryModal.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AICClinicalSummaryResult } from '@/lib/painMap';

interface AIClinicalSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  result: AICClinicalSummaryResult | null;
  onRequestDoctor: () => void;
}

export const AIClinicalSummaryModal: React.FC<AIClinicalSummaryModalProps> = ({
  visible,
  onClose,
  result,
  onRequestDoctor,
}) => {
  if (!result) return null;

  const getRiskColor = (level: 'Low' | 'Moderate' | 'High') => {
    if (level === 'High') return '#DC2626';
    if (level === 'Moderate') return '#F59E0B';
    return '#10B981';
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBox}>
              <View style={styles.sparkleBg}>
                <Ionicons name="sparkles" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.headerTitle}>AI Clinical Assessment Summary</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ gap: 14 }}>
            {/* Risk Indicator */}
            <View style={styles.riskRow}>
              <Text style={styles.riskLabel}>Calculated Clinical Risk Profile:</Text>
              <View
                style={[
                  styles.riskBadge,
                  { backgroundColor: getRiskColor(result.riskLevel) },
                ]}
              >
                <Text style={styles.riskBadgeText}>{result.riskLevel} Risk</Text>
              </View>
            </View>

            {/* Narrative Box */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryBoxTitle}>Structured Clinical Note</Text>
              <Text style={styles.summaryText}>{result.summary}</Text>
            </View>

            {/* Alerts */}
            {result.alerts.length > 0 && (
              <View style={styles.alertsBox}>
                <View style={styles.alertHeader}>
                  <Ionicons name="warning-outline" size={16} color="#DC2626" />
                  <Text style={styles.alertTitle}>Clinical Alerts & Risk Factors</Text>
                </View>
                {result.alerts.map((alert, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.alertText}>{alert}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            <View style={styles.recsBox}>
              <View style={styles.recHeader}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#0D9488" />
                <Text style={styles.recTitle}>Regenerative & Treatment Recommendations</Text>
              </View>
              {result.recommendations.map((rec, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#0D9488" style={{ marginTop: 2 }} />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.doctorBtn}
                onPress={() => {
                  onClose();
                  onRequestDoctor();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="medical-outline" size={16} color="#FFFFFF" />
                <Text style={styles.doctorBtnText}>Request Specialist Evaluation</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkleBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  riskLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  summaryBox: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 12,
  },
  summaryBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B21A8',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13,
    color: '#3B0764',
    lineHeight: 18,
  },
  alertsBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 2,
  },
  bulletDot: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  alertText: {
    fontSize: 12,
    color: '#7F1D1D',
    flex: 1,
  },
  recsBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    padding: 12,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  recTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  recText: {
    fontSize: 12,
    color: '#115E59',
    flex: 1,
  },
  buttonRow: {
    marginTop: 8,
  },
  doctorBtn: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  doctorBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
