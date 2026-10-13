// app/(app)/pain-regeneration.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import TopNavbar from '@/components/dashboard/TopNavbar';
import { CategoryCards } from '@/components/CategoryCards';
import { DigitalBodyMap } from '@/components/pain/DigitalBodyMap';
import { PainAssessmentForm } from '@/components/pain/PainAssessmentForm';
import { OutcomeTracker } from '@/components/pain/OutcomeTracker';
import { AIClinicalSummaryModal } from '@/components/pain/AIClinicalSummaryModal';
import { VerticalGoalBottomNav } from '@/components/dashboard/VerticalGoalBottomNav';
import { getPrimaryGoalInfo, fetchUserPrimaryGoal } from '@/lib/primaryGoal';
import { supabase } from '@/lib/supabase';
import {
  BodyRegionId,
  PatientPainMap,
  ClinicalAssessment,
  PainOutcomeVisit,
  TreatmentOutcome,
  AICClinicalSummaryResult,
  loadPainMapsSupabase,
  savePainMapSupabase,
  loadTreatmentOutcomesSupabase,
  saveTreatmentOutcomeSupabase,
  loadPainVisits,
  savePainVisit,
  generateAIClinicalSummary,
} from '@/lib/painMap';

const PAIN_REGENERATION_PLANS = [
  'Knee and joint pain',
  'Back and neck pain',
  'Sports injuries',
  'Arthritis',
  'Physiotherapy',
  'PRP and approved regenerative procedures',
  'Post-surgical rehabilitation',
];

type PainModuleView = 'map' | 'outcomes' | 'compact';

export default function PainRegenerationScreen() {
  const [painView, setPainView] = useState<PainModuleView>('map');
  const [selectedRegions, setSelectedRegions] = useState<BodyRegionId[]>(['left_knee']);
  
  const [painMaps, setPainMaps] = useState<PatientPainMap[]>([]);
  const [visits, setVisits] = useState<PainOutcomeVisit[]>([]);
  const [outcomes, setOutcomes] = useState<TreatmentOutcome[]>([]);
  
  const [aiSummaryModalVisible, setAiSummaryModalVisible] = useState(false);
  const [aiSummaryResult, setAiSummaryResult] = useState<AICClinicalSummaryResult | null>(null);
  const [isUserPrimaryGoal, setIsUserPrimaryGoal] = useState(false);
  const painGoalInfo = getPrimaryGoalInfo('Pain & Regeneration');

  useEffect(() => {
    async function initData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const goal = await fetchUserPrimaryGoal(session.user.id);
        const isGoal = !!goal && (goal.toLowerCase().includes('pain') || goal.toLowerCase().includes('regeneration'));
        setIsUserPrimaryGoal(isGoal);
      }
      const maps = await loadPainMapsSupabase();
      const vList = await loadPainVisits();
      const oList = await loadTreatmentOutcomesSupabase();
      setPainMaps(maps);
      setVisits(vList);
      setOutcomes(oList);
      if (maps.length > 0) {
        setSelectedRegions([maps[0].body_region]);
      }
    }
    initData();
  }, []);

  const handleToggleRegion = (regionId: BodyRegionId) => {
    setSelectedRegions((prev) => {
      if (prev.includes(regionId)) {
        return prev.filter((id) => id !== regionId);
      } else {
        return [...prev, regionId];
      }
    });
  };

  const handleClearRegions = () => {
    setSelectedRegions([]);
  };

  const handleSaveAssessment = async (
    map: PatientPainMap,
    assessment: ClinicalAssessment,
    allRegions?: BodyRegionId[]
  ) => {
    const regionsToSave = allRegions && allRegions.length > 0 ? allRegions : [map.body_region];

    for (const rId of regionsToSave) {
      const rLabel = BODY_REGIONS.find((r) => r.id === rId)?.label || rId;
      await savePainMapSupabase({
        ...map,
        id: `pm-${Date.now()}-${rId}`,
        body_region: rId,
        body_region_label: rLabel,
        additional_regions: regionsToSave.length > 1 ? regionsToSave : undefined,
      });
    }

    const updatedMaps = await loadPainMapsSupabase();
    const updatedOutcomes = await loadTreatmentOutcomesSupabase();
    setPainMaps(updatedMaps);
    setOutcomes(updatedOutcomes);

    const regionNames = regionsToSave
      .map((rId) => BODY_REGIONS.find((r) => r.id === rId)?.label || rId)
      .join(', ');

    Alert.alert(
      'Pain Assessment Saved',
      `Assessment recorded for ${regionsToSave.length} ${regionsToSave.length === 1 ? 'area' : 'areas'} (${regionNames}) successfully.`
    );
  };

  const handleGenerateAISummary = (
    map: PatientPainMap,
    assessment: ClinicalAssessment,
    allRegions?: BodyRegionId[]
  ) => {
    const summaryResult = generateAIClinicalSummary(map, assessment, visits, allRegions);
    setAiSummaryResult(summaryResult);
    setAiSummaryModalVisible(true);
  };

  const handleAddVisit = async (newVisit: PainOutcomeVisit) => {
    const updatedVisits = await savePainVisit(newVisit);
    setVisits(updatedVisits);
    Alert.alert(
      'Outcome Logged',
      `Progress entry for "${newVisit.visit_name}" added.`
    );
  };

  const handleAddOutcome = async (outcomeData: Omit<TreatmentOutcome, 'id' | 'user_id'>) => {
    await saveTreatmentOutcomeSupabase(outcomeData);
    const updatedOutcomes = await loadTreatmentOutcomesSupabase();
    setOutcomes(updatedOutcomes);
    Alert.alert('Outcome Saved', 'Treatment outcome record saved to Supabase.');
  };

  return (
    <View style={styles.rootContainer}>
      <TopNavbar userName="User" />

      {/* Header Navigation */}
      <View style={styles.subHeaderNavRow}>
        {!isUserPrimaryGoal ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(app)')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#0F172A" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 8 }} />
        )}
        
        <View style={styles.headerCategoryPill}>
          <Ionicons name="fitness-outline" size={14} color="#DC2626" />
          <Text style={styles.headerCategoryTitle}>Pain & Regeneration</Text>
        </View>

        {isUserPrimaryGoal ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(app)/dashboard/profile')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color="#DC2626" />
            <Text style={[styles.backButtonText, { color: '#DC2626' }]}>Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 8 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Featured Interactive Digital Pain Map & Clinical Module */}
        <View style={styles.featuredModuleCard}>
          <View style={styles.featuredHeaderRow}>
            <View style={styles.badgeRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="body" size={15} color="#DC2626" />
              </View>
              <View>
                <Text style={styles.featuredTitle}>Digital Pain Map & History</Text>
                
              </View>
            </View>
          </View>

          {/* Navigation Switcher Tabs */}
          <View style={styles.moduleNavRow}>
            <TouchableOpacity
              style={[styles.moduleTab, painView === 'map' && styles.moduleTabActive]}
              onPress={() => setPainView('map')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="body-outline"
                size={14}
                color={painView === 'map' ? '#DC2626' : '#64748B'}
              />
              <Text
                style={[
                  styles.moduleTabText,
                  painView === 'map' && styles.moduleTabTextActive,
                ]}
              >
                Pain
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.moduleTab, painView === 'outcomes' && styles.moduleTabActive]}
              onPress={() => setPainView('outcomes')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="time-outline"
                size={14}
                color={painView === 'outcomes' ? '#DC2626' : '#64748B'}
              />
              <Text
                style={[
                  styles.moduleTabText,
                  painView === 'outcomes' && styles.moduleTabTextActive,
                ]}
              >
                History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.moduleTab, painView === 'compact' && styles.moduleTabActive]}
              onPress={() => setPainView(painView === 'compact' ? 'map' : 'compact')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={painView === 'compact' ? 'chevron-down' : 'chevron-up'}
                size={14}
                color="#64748B"
              />
              <Text style={styles.moduleTabText}>
                {painView === 'compact' ? 'Expand' : 'Minimize'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Module Inner Content */}
          {painView === 'map' && (
            <View style={styles.moduleInnerContent}>
              <DigitalBodyMap
                selectedRegions={selectedRegions}
                onToggleRegion={handleToggleRegion}
                onClearRegions={handleClearRegions}
                painScore={painMaps[0]?.pain_score || 8}
              />

              <PainAssessmentForm
                selectedRegions={selectedRegions}
                onSubmitAssessment={handleSaveAssessment}
                onGenerateAISummary={handleGenerateAISummary}
              />
            </View>
          )}

          {painView === 'outcomes' && (
            <View style={styles.moduleInnerContent}>
              <OutcomeTracker
                visits={visits}
                outcomes={outcomes}
                onAddVisit={handleAddVisit}
                onAddOutcome={handleAddOutcome}
              />
            </View>
          )}

          {painView === 'compact' && (
            <View style={styles.compactBanner}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.compactBannerText}>
                Active Pain Assessment: Left Knee (8/10 Pain Score) — 3 Visits Tracked.
              </Text>
              <TouchableOpacity onPress={() => setPainView('map')}>
                <Text style={styles.compactOpenLink}>Open Pain Map →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ORIGINAL PAIN & REGENERATION CATEGORY CARDS & CONSULTATIONS */}
        <CategoryCards
          categoryTitle="Pain & Regenerative"
          categoryTagline="Joint relief, stem cell therapy & tissue regeneration strategies."
          consultationSubtitle="Book a consultation with pain management specialists & orthopedic regenerative doctors."
          productsSubtitle="Shop collagen peptides, joint recovery formulas, topical gels & support braces."
          accentColor="#DC2626"
          consultationIcon="medkit"
          productsIcon="cart"
          treatmentPlans={PAIN_REGENERATION_PLANS}
        />
      </ScrollView>

      {/* AI Clinical Summary Modal */}
      <AIClinicalSummaryModal
        visible={aiSummaryModalVisible}
        onClose={() => setAiSummaryModalVisible(false)}
        result={aiSummaryResult}
        onRequestDoctor={() => {
          Alert.alert(
            'Specialist Consultation',
            'Scroll down to book an orthopedic or pain management doctor.'
          );
        }}
      />

      {isUserPrimaryGoal && (
        <VerticalGoalBottomNav goal={painGoalInfo} activeTab="goal" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  subHeaderNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  headerCategoryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  featuredModuleCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  featuredHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  featuredSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  moduleNavRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    gap: 4,
    marginBottom: 12,
  },
  moduleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  moduleTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  moduleTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  moduleTabTextActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  moduleInnerContent: {
    gap: 12,
  },
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  compactBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    flex: 1,
    marginLeft: 8,
  },
  compactOpenLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
    marginLeft: 8,
  },
});
