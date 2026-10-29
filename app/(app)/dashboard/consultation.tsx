import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { trackViewDoctorConsultation, trackBookConsultation } from '@/lib/metaPixel';
import { SafeLinearGradient as LinearGradient } from '@/components/ui/SafeLinearGradient';

// Quick common health concerns for quick selection
const COMMON_CONCERNS = [
  'Weight Loss & Metabolism',
  'Hair Fall & Thinning',
  'Acne & Skin Conditions',
  'Chronic Fatigue & Low Energy',
  'Blood Sugar / Pre-Diabetes',
  'Gut & Digestion Problems',
  'Joint & Muscle Pain',
  'Sleep Disorder & Insomnia',
  'Hormonal Imbalance / Thyroid',
  'General Physician Consultation',
];

const TIME_SLOTS = [
  'Morning (09:00 AM – 12:00 PM)',
  'Afternoon (12:00 PM – 04:00 PM)',
  'Evening (04:00 PM – 08:00 PM)',
  'Earliest Available Slot',
];

export default function BookConsultationScreen() {
  const params = useLocalSearchParams<{ plan?: string; category?: string; concern?: string }>();
  const [issue, setIssue] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [consultationMode, setConsultationMode] = useState<'video' | 'phone'>('video');

  useEffect(() => {
    if (params.plan && !issue) {
      setIssue(`Interested in Treatment Plan: ${params.plan}`);
    } else if (params.concern && !issue) {
      setIssue(params.concern);
    }
  }, [params.plan, params.concern]);

  // User state
  const [userId, setUserId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<{
    id?: string;
    title?: string;
    scheduledAt?: string;
    doctorName?: string;
  } | null>(null);

  // Load user data on mount
  const loadUserData = useCallback(async () => {
    try {
      setIsLoadingUser(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setIsLoadingUser(false);
        return;
      }

      const uid = session.user.id;
      setUserId(uid);

      // Pre-fill from auth metadata
      const meta = session.user.user_metadata || {};
      const fallbackName = meta.full_name || meta.name || '';
      const fallbackEmail = session.user.email || '';
      const fallbackPhone = session.user.phone || meta.phone || '';

      if (fallbackName) setPatientName(fallbackName);
      if (fallbackEmail) setPatientEmail(fallbackEmail);
      if (fallbackPhone) setPatientPhone(fallbackPhone);

      // Query users table for complete details
      const { data: userData } = await supabase
        .from('users')
        .select('name, email, phone')
        .eq('id', uid)
        .maybeSingle();

      if (userData) {
        if (userData.name) setPatientName(userData.name);
        if (userData.email) setPatientEmail(userData.email);
        if (userData.phone) setPatientPhone(userData.phone);
      }
    } catch (err) {
      console.warn('Error loading user profile for consultation:', err);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
    // Track "View Doctor Consultation"
    trackViewDoctorConsultation().catch(() => {});
  }, [loadUserData]);

  // Handle quick concern chip click
  const handleSelectConcern = (concern: string) => {
    if (!issue.trim()) {
      setIssue(concern);
    } else if (issue.toLowerCase().includes(concern.toLowerCase())) {
      // Already selected; do nothing or toggle off
    } else {
      setIssue((prev) => `${prev.trim()}, ${concern}`);
    }
  };

  // Helper to get assigned doctor from staffs table
  const fetchAssignedDoctor = async (): Promise<{ id: string; name: string }> => {
    try {
      // 1. Try to find an active staff with doctor role
      const { data: doctorStaff } = await supabase
        .from('staffs')
        .select('id, full_name')
        .eq('role_id', '6b387f72-40f7-43a2-8f65-34b4f93e92ce')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (doctorStaff?.id) {
        return {
          id: doctorStaff.id,
          name: doctorStaff.full_name || 'Dr. Dhara',
        };
      }

      // 2. Fallback to any active staff
      const { data: anyStaff } = await supabase
        .from('staffs')
        .select('id, full_name')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (anyStaff?.id) {
        return {
          id: anyStaff.id,
          name: anyStaff.full_name || 'Genestac Medical Doctor',
        };
      }
    } catch (e) {
      console.warn('Could not query staffs table:', e);
    }

    // Default doctor ID fallback
    return {
      id: '2692d4be-b4d5-407d-ad60-6f035d8e4d37',
      name: 'Dr. Dhara',
    };
  };

  const handleBookConsultation = async () => {
    const trimmedIssue = issue.trim();

    if (!trimmedIssue) {
      Alert.alert(
        'Health Issue Required',
        'Please describe what health issue or symptoms you are suffering from.'
      );
      return;
    }

    let activeUserId = userId;
    if (!activeUserId) {
      const { data: sessionData } = await supabase.auth.getSession();
      activeUserId = sessionData?.session?.user?.id || null;
      if (activeUserId) {
        setUserId(activeUserId);
      }
    }

    if (!activeUserId) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to book your doctor consultation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Fetch assigned doctor staff ID
      const assignedDoctor = await fetchAssignedDoctor();
      const scheduledAt = new Date().toISOString();

      // Ensure user profile in users table is populated with phone/name if provided
      if (patientPhone.trim() || patientName.trim()) {
        try {
          await supabase
            .from('users')
            .update({
              name: patientName.trim() || undefined,
              phone: patientPhone.trim() || undefined,
            })
            .eq('id', activeUserId);
        } catch (_) {
          // ignore profile update failure
        }
      }

      const notesContent = [
        `Issue / Symptoms: ${trimmedIssue}`,
        additionalNotes.trim() ? `Additional Context: ${additionalNotes.trim()}` : null,
        patientName.trim() ? `Patient Name: ${patientName.trim()}` : null,
        patientPhone.trim() ? `Contact Phone: ${patientPhone.trim()}` : null,
        patientEmail.trim() ? `Email: ${patientEmail.trim()}` : null,
        `Preferred Mode: ${consultationMode === 'video' ? 'Video Consultation' : 'Phone Call'}`,
        `Preferred Slot: ${selectedSlot}`,
      ]
        .filter(Boolean)
        .join('\n');

      const appointmentPayload: Record<string, any> = {
        patient_id: activeUserId,
        doctor_id: assignedDoctor.id,
        scheduled_at: scheduledAt,
        duration_minutes: 30,
        status: 'pending',
        title: trimmedIssue, // Stored inside title column as requested
        type: 'Doctor Consultation',
        related_to: 'Medical Consultation',
        notes: notesContent,
        plan_details: {
          issue: trimmedIssue,
          additional_notes: additionalNotes.trim() || null,
          patient_name: patientName.trim() || null,
          phone: patientPhone.trim() || null,
          email: patientEmail.trim() || null,
          preferred_mode: consultationMode,
          preferred_slot: selectedSlot,
          booked_from: 'mobile_app',
        },
      };

      let insertResult = await supabase
        .from('appointments')
        .insert([appointmentPayload])
        .select()
        .single();

      if (insertResult.error && (insertResult.error.code === '23503' || insertResult.error.message?.includes('foreign key'))) {
        delete appointmentPayload.doctor_id;
        insertResult = await supabase
          .from('appointments')
          .insert([appointmentPayload])
          .select()
          .single();
      }

      const { data, error } = insertResult;

      if (error) {
        console.error('Error inserting into appointments table:', error);
        let errorMsg = error.message;
        if (error.code === '42501') {
          errorMsg =
            'Row-Level Security (RLS) restricted this booking. Please ensure your account has active booking access.';
        }
        Alert.alert('Booking Error', errorMsg);
        return;
      }

      // Track Meta Pixel event
      trackBookConsultation({
        doctorId: assignedDoctor.id,
        doctorName: assignedDoctor.name,
        fee: 0,
        specialty: 'Clinical Doctor Consultation',
        appointmentDate: scheduledAt,
      }).catch(() => {});

      setBookedDetails({
        id: data?.id,
        title: trimmedIssue,
        scheduledAt,
        doctorName: assignedDoctor.name,
      });

      setBookingSuccess(true);
    } catch (err: any) {
      console.error('Failed to book consultation:', err);
      Alert.alert('Error', err?.message || 'Failed to submit consultation request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setBookingSuccess(false);
    setIssue('');
    setAdditionalNotes('');
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Consultation</Text>
        <View style={styles.headerRightPlaceholder}>
          <Ionicons name="shield-checkmark" size={18} color="#0A8554" />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Banner Card */}
          <LinearGradient
            colors={['#065F46', '#0A8554', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroIconCircle}>
                <Ionicons name="medical" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>Doctor Consultation</Text>
            </View>
            <Text style={styles.heroSub}>
              Share the symptoms or health condition you are facing. Our clinical team will assess and connect you with a specialist.
            </Text>
            <View style={styles.trustBadgesRow}>
              <View style={styles.trustBadge}>
                <Ionicons name="checkmark-done" size={14} color="#A7F3D0" />
                <Text style={styles.trustBadgeText}>Verified Doctors</Text>
              </View>
              <View style={styles.trustBadge}>
                <Ionicons name="lock-closed" size={12} color="#A7F3D0" />
                <Text style={styles.trustBadgeText}>100% Confidential</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Patient Details Summary */}
          <View style={styles.patientInfoCard}>
            <View style={styles.patientCardHeader}>
              <Ionicons name="person-circle-outline" size={20} color="#0A8554" />
              <Text style={styles.patientCardTitle}>Patient Information</Text>
            </View>

            {isLoadingUser ? (
              <ActivityIndicator size="small" color="#0A8554" style={{ marginVertical: 8 }} />
            ) : (
              <View style={styles.patientFieldsGrid}>
                <View style={styles.patientField}>
                  <Text style={styles.patientFieldLabel}>Name</Text>
                  <TextInput
                    style={styles.patientInput}
                    value={patientName}
                    onChangeText={setPatientName}
                    placeholder="Your Full Name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.patientField}>
                  <Text style={styles.patientFieldLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.patientInput}
                    value={patientPhone}
                    onChangeText={setPatientPhone}
                    placeholder="Mobile for doctor to call"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Primary Issue Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>What issue are you suffering from?</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
            <Text style={styles.fieldHint}>
              Describe your health condition, symptoms, or what you need medical guidance for:
            </Text>

            {/* Quick Suggestion Chips */}
            <Text style={styles.quickSelectLabel}>Quick tap common concerns:</Text>
            <View style={styles.chipsContainer}>
              {COMMON_CONCERNS.map((concern) => {
                const isSelected = issue.toLowerCase().includes(concern.toLowerCase());
                return (
                  <TouchableOpacity
                    key={concern}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => handleSelectConcern(concern)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={14}
                      color={isSelected ? '#FFFFFF' : '#0A8554'}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {concern}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Main Issue Text Area */}
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                value={issue}
                onChangeText={setIssue}
                placeholder="e.g., Experiencing sudden hair loss and severe fatigue for the past 4 weeks, with digestive discomfort after meals..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.textAreaFooter}>
                <Text style={styles.charCount}>{issue.length} characters</Text>
                {issue.length > 0 && (
                  <TouchableOpacity onPress={() => setIssue('')} hitSlop={8}>
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Additional Medical History / Context (Optional) */}
          <View style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Additional Notes or Duration (Optional)</Text>
            <Text style={styles.fieldHint}>
              Mention any ongoing medications, how long you've had this, or previous diagnoses:
            </Text>
            <TextInput
              style={[styles.textArea, { minHeight: 70 }]}
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              placeholder="e.g., Taking thyroid medication since 2023, symptoms get worse during mornings..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          {/* Consultation Preferences */}
          <View style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Consultation Mode</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  consultationMode === 'video' && styles.modeOptionActive,
                ]}
                onPress={() => setConsultationMode('video')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="videocam"
                  size={20}
                  color={consultationMode === 'video' ? '#0A8554' : '#64748B'}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modeOptionTitle,
                      consultationMode === 'video' && styles.modeOptionTitleActive,
                    ]}
                  >
                    Video Call
                  </Text>
                  <Text style={styles.modeOptionSub}>Face-to-face visual consult</Text>
                </View>
                {consultationMode === 'video' && (
                  <Ionicons name="checkmark-circle" size={18} color="#0A8554" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeOption,
                  consultationMode === 'phone' && styles.modeOptionActive,
                ]}
                onPress={() => setConsultationMode('phone')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="call"
                  size={19}
                  color={consultationMode === 'phone' ? '#0A8554' : '#64748B'}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modeOptionTitle,
                      consultationMode === 'phone' && styles.modeOptionTitleActive,
                    ]}
                  >
                    Phone Call
                  </Text>
                  <Text style={styles.modeOptionSub}>Direct audio call to your phone</Text>
                </View>
                {consultationMode === 'phone' && (
                  <Ionicons name="checkmark-circle" size={18} color="#0A8554" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Preferred Time Window</Text>
            <View style={styles.slotsCol}>
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotRow, isSelected && styles.slotRowActive]}
                    onPress={() => setSelectedSlot(slot)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? '#0A8554' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.slotText,
                        isSelected && styles.slotTextActive,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit Action Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!issue.trim() || isSubmitting) && styles.submitBtnDisabled,
            ]}
            onPress={handleBookConsultation}
            disabled={!issue.trim() || isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <View style={styles.submittingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Scheduling Consultation...</Text>
              </View>
            ) : (
              <View style={styles.submittingRow}>
                <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Request Doctor Consultation</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#64748B" />
            <Text style={styles.securityNoteText}>
              Your information is securely encrypted and accessible solely by our clinical medical team.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Booking Confirmation Modal */}
      <Modal visible={bookingSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.checkIconBg}>
              <Ionicons name="checkmark-circle" size={52} color="#0A8554" />
            </View>
            <Text style={styles.modalTitle}>Consultation Requested</Text>
            <Text style={styles.modalSub}>
              Your doctor consultation request has been received and scheduled with our clinical team.
            </Text>

            {bookedDetails && (
              <View style={styles.modalSummaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Health Issue:</Text>
                  <Text style={styles.summaryVal} numberOfLines={2}>
                    {bookedDetails.title}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Assigned Doctor:</Text>
                  <Text style={styles.summaryVal}>{bookedDetails.doctorName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Status:</Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending Confirmation</Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.modalFollowupNotice}>
              Our clinical coordinator will contact you at {patientPhone || 'your registered number'} to confirm your exact meeting time.
            </Text>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={handleModalClose}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerRightPlaceholder: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 48,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: '#0A8554',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    color: '#E6F4EA',
    lineHeight: 18,
  },
  trustBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  patientInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  patientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patientCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientFieldsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  patientField: {
    flex: 1,
    gap: 4,
  },
  patientFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  patientInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  requiredBadge: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignSelf: 'flex-start',
    marginTop: -2,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  quickSelectLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  chipActive: {
    backgroundColor: '#0A8554',
    borderColor: '#0A8554',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0A8554',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  textAreaContainer: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  textArea: {
    minHeight: 110,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  textAreaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  modeRow: {
    gap: 8,
    marginTop: 2,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeOptionActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0A8554',
  },
  modeOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  modeOptionTitleActive: {
    color: '#0A8554',
  },
  modeOptionSub: {
    fontSize: 11,
    color: '#64748B',
  },
  slotsCol: {
    gap: 8,
    marginTop: 4,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotRowActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#0A8554',
  },
  slotText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  slotTextActive: {
    color: '#0A8554',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#0A8554',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A8554',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  securityNoteText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  checkIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    gap: 8,
    marginVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  modalFollowupNotice: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalCloseBtn: {
    backgroundColor: '#0A8554',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
