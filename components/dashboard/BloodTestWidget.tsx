import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BloodTestRequest } from '@/lib/types';
import { BloodTestRequestModal } from '@/components/BloodTestRequestModal';
import { Colors, Fonts, Spacing, Radius } from '@/constants/colors';

interface BloodTestWidgetProps {
  requests: BloodTestRequest[];
  onRequestSubmitted: (conditionText: string) => Promise<void>;
  loading?: boolean;
}

export const BloodTestWidget: React.FC<BloodTestWidgetProps> = ({
  requests = [],
  onRequestSubmitted,
  loading = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const latestRequest = requests.length > 0 ? requests[0] : null;

  const handleFormSubmit = async (conditionText: string) => {
    setSubmitting(true);
    try {
      await onRequestSubmitted(conditionText);
      setModalVisible(false);
    } catch (err) {
      console.error('Failed to submit blood test request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (!latestRequest || latestRequest.status === 'dismissed') {
      return (
        <View style={styles.actionCard}>
          <View style={styles.iconRing}>
            <Ionicons name="flask-outline" size={24} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.titleText}>Need a Doctor Blood Test?</Text>
            <Text style={styles.subText}>
              Describe your symptoms and get doctor-recommended lab tests.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.requestBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.requestBtnText}>Request</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (latestRequest.status === 'pending') {
      return (
        <View style={styles.pendingCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.pendingIconCircle}>
                <Ionicons name="time-outline" size={20} color="#D97706" />
              </View>
              <Text style={styles.cardHeaderTitle}>Blood Test Request</Text>
            </View>

            <View style={styles.pendingStatusBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.pendingStatusText}>Doctor Review Pending</Text>
            </View>
          </View>

          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={20} color="#B45309" />
            <Text style={styles.messageBoxText}>
              Doctor will review your request and get back to you shortly.
            </Text>
          </View>

          <View style={styles.conditionDetailBox}>
            <Text style={styles.conditionLabel}>Submitted Condition / Symptoms:</Text>
            <Text style={styles.conditionVal}>"{latestRequest.condition_text}"</Text>
          </View>
        </View>
      );
    }

    if (latestRequest.status === 'reviewed') {
      const rawTests = Array.isArray(latestRequest.suggested_tests)
        ? latestRequest.suggested_tests
        : typeof latestRequest.suggested_tests === 'object' && latestRequest.suggested_tests !== null
        ? Object.values(latestRequest.suggested_tests)
        : ['Lipid Profile', 'HbA1c', 'Complete Blood Count (CBC)'];

      const suggestedTestsList: string[] = rawTests.map((item: any) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          return item.name || item.test_name || item.title || JSON.stringify(item);
        }
        return String(item);
      });

      return (
        <View style={styles.reviewedCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.reviewedIconCircle}>
                <Ionicons name="checkmark-done-circle" size={22} color="#059669" />
              </View>
              <Text style={styles.cardHeaderTitle}>Doctor Recommendation</Text>
            </View>

            <View style={styles.reviewedStatusBadge}>
              <Text style={styles.reviewedStatusText}>Reviewed by Doctor</Text>
            </View>
          </View>

          {latestRequest.doctor_notes ? (
            <View style={styles.doctorNotesBox}>
              <Text style={styles.doctorNotesLabel}>Doctor's Note:</Text>
              <Text style={styles.doctorNotesText}>{latestRequest.doctor_notes}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 8 }}>
            <Text style={styles.suggestedLabel}>Suggested Lab Tests:</Text>
            <View style={styles.testPillsContainer}>
              {suggestedTestsList.map((testName, idx) => (
                <View key={idx} style={styles.testPill}>
                  <Ionicons name="beaker-outline" size={14} color="#047857" />
                  <Text style={styles.testPillText}>{testName}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.newRequestLink}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={14} color="#2563EB" />
            <Text style={styles.newRequestLinkText}>Request Another Test</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <BloodTestRequestModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleFormSubmit}
        loading={submitting}
      />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="small" />
        </View>
      ) : (
        renderContent()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  loadingBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  subText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  requestBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap:6
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  pendingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  pendingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  messageBoxText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 16,
  },
  conditionDetailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  conditionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  conditionVal: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    fontStyle: 'italic',
  },
  reviewedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewedStatusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewedStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  doctorNotesBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  doctorNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  doctorNotesText: {
    fontSize: 12,
    color: '#065F46',
    marginTop: 2,
    lineHeight: 17,
  },
  suggestedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  testPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  testPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  testPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  newRequestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
    paddingVertical: 4,
  },
  newRequestLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
});

export default BloodTestWidget;
