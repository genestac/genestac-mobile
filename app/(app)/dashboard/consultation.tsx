import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Doctor {
  id: string;
  name: string;
  specialty: 'Nutritionist' | 'General Physician' | 'Lifestyle Medicine';
  rating: number;
  reviewsCount: number;
  image: string;
  experience: string;
  fee: string;
}

const DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Neha Sharma',
    specialty: 'Nutritionist',
    rating: 4.8,
    reviewsCount: 124,
    image: 'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg',
    experience: '8+ yrs exp',
    fee: '₹ 799',
  },
  {
    id: 'doc-2',
    name: 'Dr. Rohan Mehta',
    specialty: 'General Physician',
    rating: 4.7,
    reviewsCount: 98,
    image: 'https://images.pexels.com/photos/5452268/pexels-photo-5452268.jpeg',
    experience: '12+ yrs exp',
    fee: '₹ 999',
  },
  {
    id: 'doc-3',
    name: 'Dr. Priya Nair',
    specialty: 'Lifestyle Medicine',
    rating: 4.9,
    reviewsCount: 76,
    image: 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg',
    experience: '10+ yrs exp',
    fee: '₹ 899',
  },
  {
    id: 'doc-4',
    name: 'Dr. Amit Verma',
    specialty: 'Nutritionist',
    rating: 4.9,
    reviewsCount: 142,
    image: 'https://images.pexels.com/photos/6234634/pexels-photo-6234634.jpeg',
    experience: '9+ yrs exp',
    fee: '₹ 850',
  },
];

export default function BookConsultationScreen() {
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Nutritionist' | 'General Physician'>('All');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const filteredDoctors = DOCTORS.filter((doc) => {
    if (selectedFilter === 'All') return true;
    return doc.specialty === selectedFilter;
  });

  const handleBook = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setBookingSuccess(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Consultation</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introSection}>
          <Text style={styles.sectionHeading}>Choose a Doctor</Text>
          <Text style={styles.sectionSub}>Talk to our expert doctors</Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersRow}>
          {(['All', 'Nutritionist', 'General Physician'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                selectedFilter === filter && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === filter && styles.filterPillTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Doctor Cards */}
        <View style={styles.doctorsList}>
          {filteredDoctors.map((doc) => (
            <View key={doc.id} style={styles.doctorCard}>
              <Image source={{ uri: doc.image }} style={styles.doctorAvatar} />

              <View style={styles.doctorInfoCol}>
                <Text style={styles.doctorName}>{doc.name}</Text>
                <Text style={styles.doctorSpecialty}>{doc.specialty}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingScore}>{doc.rating}</Text>
                  <Text style={styles.ratingCount}>({doc.reviewsCount})</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => handleBook(doc)}
                activeOpacity={0.85}
              >
                <Text style={styles.bookBtnText}>Book</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Booking Confirmation Modal */}
      <Modal visible={bookingSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.checkIconBg}>
              <Ionicons name="checkmark-circle" size={48} color="#0A8554" />
            </View>
            <Text style={styles.modalTitle}>Consultation Requested</Text>
            <Text style={styles.modalSub}>
              We have scheduled your session with {selectedDoctor?.name}. A member of our clinical team will coordinate your call.
            </Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setBookingSuccess(false)}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  introSection: {
    gap: 2,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 13,
    color: '#64748B',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#0A8554',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  doctorsList: {
    gap: 12,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  doctorInfoCol: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#64748B',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  ratingCount: {
    fontSize: 11,
    color: '#94A3B8',
  },
  bookBtn: {
    backgroundColor: '#0A8554',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
    gap: 12,
  },
  checkIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
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
  modalCloseBtn: {
    backgroundColor: '#0A8554',
    paddingVertical: 12,
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
