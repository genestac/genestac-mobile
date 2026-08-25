import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Animated, Dimensions, StatusBar, ActivityIndicator, Image,
  Modal, FlatList, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { generateInterviewQuestions, generateClinicalSummary, InterviewQuestion, ClinicalSummary } from '@/lib/openai';

const { width, height } = Dimensions.get('window');

// ── Color Palette ─────────────────────────────────────────────────────────────
const C = {
  teal: '#0E7C86', tealLight: '#14A2AF', tealMuted: '#E6F5F7', tealDark: '#0A5E66',
  navy: '#0B1F3A', navyLight: '#112847',
  white: '#FFFFFF', offWhite: '#F7FAFB', lightGray: '#EEF4F6', borderColor: '#D6E8EB',
  textPrimary: '#0B1F3A', textSecondary: '#4A6E78', textMuted: '#8AADB5',
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
};

// ── Screen type ───────────────────────────────────────────────────────────────
type Screen = 'profile' | 'lifestyle' | 'medical' | 'complaint' | 'interview' | 'timeline' | 'review' | 'processing' | 'dashboard';
const TOTAL_STEPS = 7;
const STEP_SCREENS: Screen[] = ['profile', 'lifestyle', 'medical', 'complaint', 'interview', 'timeline', 'review'];

// ── Dropdown options ──────────────────────────────────────────────────────────
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const BLOOD_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const SLEEP_OPTIONS = ['< 5h', '5-6h', '6-7h', '7-8h', '8+h'];
const ACTIVITY_OPTIONS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Athlete'];
const WATER_OPTIONS = ['< 1L', '1-2L', '2-3L', '3-4L', '4+L'];
const SMOKING_OPTIONS = ['None', 'Rare', 'Regular', 'Heavy', 'Quit'];
const ALCOHOL_OPTIONS = ['None', 'Social', 'Rare', 'Regular', 'Heavy'];
const DIET_OPTIONS = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Keto', 'Gluten-Free', 'Other'];
const MAX_SLIDER_ITEMS = 5;
const STRESS_OPTIONS = [
  { label: 'Very Low', emoji: '😌', color: '#10B981' },
  { label: 'Low', emoji: '🙂', color: '#84CC16' },
  { label: 'Moderate', emoji: '😐', color: '#F59E0B' },
  { label: 'High', emoji: '😰', color: '#F97316' },
  { label: 'Very High', emoji: '🤯', color: '#EF4444' },
];

// ── Reusable Components ───────────────────────────────────────────────────────

const ProgressBar = memo(function ProgressBar({ step }: { step: number }) {
  return (
    <View style={styles.progressTrackContainer}>
      {STEP_SCREENS.map((_, i) => (
        <React.Fragment key={i}>
          <View style={[styles.progressDot, i < step && styles.progressDotActive]} />
          {i < STEP_SCREENS.length - 1 && (
            <View style={[styles.progressLine, i < step - 1 && styles.progressLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
});

const GlassCard = memo(function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
});

const Chip = memo(function Chip({ label, selected, onPress, emoji }: { label: string; selected: boolean; onPress: () => void, emoji?: string }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{emoji ? `${emoji} ${label}` : label}</Text>
    </TouchableOpacity>
  );
});

// Dropdown field with modal picker (for non-slider items)
const DropdownField = memo(function DropdownField({
  label, value, options, onChange, icon, iconColor, iconFamily = 'Feather'
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
  icon?: any; iconColor?: string; iconFamily?: string;
}) {
  const [open, setOpen] = useState(false);
  const IconComp: any = iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons
    : iconFamily === 'Ionicons' ? Ionicons : Feather;

  return (
    <>
      <TouchableOpacity style={styles.dropdownRow} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <View style={[styles.iconCircle, { backgroundColor: (iconColor || C.teal) + '20' }]}>
          <IconComp name={icon} size={20} color={iconColor || C.teal} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.dropdownLabel}>{label}</Text>
          <Text style={[styles.dropdownValue, !value && { color: C.textMuted }]}>
            {value || 'Select…'}
          </Text>
        </View>
        <Feather name="chevron-down" size={20} color={C.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, value === item && styles.modalOptionActive]}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={[styles.modalOptionText, value === item && styles.modalOptionTextActive]}>
                    {item}
                  </Text>
                  {value === item && <Feather name="check" size={16} color={C.teal} />}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

// Interactive Slider for Lifestyle
const InteractiveSlider = memo(function InteractiveSlider({ label, value, options, onChange, icon }: any) {
  return (
    <View style={styles.sliderCard}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderIconCircle}>
          <Image source={icon} style={styles.sliderImage} resizeMode="cover" />
        </View>
        <Text style={styles.sliderLabel}>{label}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sliderOptions}>
        {options.map((opt: string) => (
          <TouchableOpacity
            key={opt}
            style={[styles.sliderOptionNode, value === opt && styles.sliderOptionNodeActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sliderOptionText, value === opt && styles.sliderOptionTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

// Emoji Stress Slider
const EmojiStressSlider = memo(function EmojiStressSlider({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.sliderCard}>
      <View style={styles.sliderHeader}>
        <View style={[styles.sliderIconCircle, { backgroundColor: '#FDE68A' }]}>
          <MaterialCommunityIcons name="brain" size={24} color="#F59E0B" />
        </View>
        <Text style={styles.sliderLabel}>Stress Level</Text>
      </View>
      <View style={styles.stressEmojisRow}>
        {STRESS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[styles.stressEmojiBtn, value === opt.label && { backgroundColor: opt.color + '20', borderColor: opt.color }]}
            onPress={() => onChange(opt.label)}
          >
            <Text style={styles.stressEmoji}>{opt.emoji}</Text>
            {value === opt.label && <Text style={[styles.stressEmojiLabel, { color: opt.color }]}>{opt.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

// Text input with icon
const IconInputField = memo(function IconInputField({ label, value, onChange, placeholder, icon, iconColor, iconFamily = 'Feather', multiline = false, keyboardType = 'default' }: any) {
  const IconComp: any = iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons
    : iconFamily === 'Ionicons' ? Ionicons : Feather;
  const hasIcon = icon && iconFamily !== 'None';
  return (
    <View style={styles.iconInputContainer}>
      {hasIcon && (
        <View style={[styles.iconCircle, { backgroundColor: (iconColor || C.teal) + '20' }]}>
          <IconComp name={icon} size={20} color={iconColor || C.teal} />
        </View>
      )}
      <View style={[styles.iconInputTextContainer, !hasIcon && { marginLeft: 0 }]}>
        <Text style={styles.dropdownLabel}>{label}</Text>
        <TextInput
          style={[styles.iconInput, multiline && { height: 60, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          keyboardType={keyboardType}
        />
      </View>
      <Feather name="edit-2" size={14} color={C.textMuted} />
    </View>
  );
});

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AIDoctorScreen() {
  const [screen, setScreen] = useState<Screen>('profile');
  const [step, setStep] = useState(1);
  const [dbLoading, setDbLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Form State ─────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: '', age: '', gender: '', height: '', weight: '',
    blood: '', occupation: '', email: '', phone: '', emergency: '',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [lifestyle, setLifestyle] = useState({
    sleep: '', activity: '', water: '', smoking: '', alcohol: '', diet: '', stress: '',
  });
  const [medical, setMedical] = useState({
    diseases: [] as string[], surgeries: '', allergies: '', medications: '', familyHistory: '', mentalHealth: '', pregnancy: '',
  });
  const [complaint, setComplaint] = useState('');
  const [category, setCategory] = useState('');
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string>>({});
  const [interviewStep, setInterviewStep] = useState(0);
  const [timelineState, setTimelineState] = useState({ onset: '', progression: '', frequency: '', severity: '', triggers: '', treatments: '' });
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  // ── AI State ───────────────────────────────────────────────────────────────
  const [dynamicQuestions, setDynamicQuestions] = useState<InterviewQuestion[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [clinicalSummary, setClinicalSummary] = useState<ClinicalSummary | null>(null);

  // ── Load DB ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data } = await supabase
          .from('users')
          .select('name, phone, weight_loss_journey')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data) {
          const j = data.weight_loss_journey || {};
          setProfile(prev => ({
            ...prev,
            name: data.name || '',
            phone: data.phone || '',
            age: j.age ? String(j.age) : '',
            gender: j.gender ? j.gender.charAt(0).toUpperCase() + j.gender.slice(1) : '',
            height: j.height ? String(j.height) : '',
            weight: j.current_weight ? String(j.current_weight) : '',
          }));
        }
      } catch (e) { console.warn('AI Health coach fetch error:', e); }
      finally { setDbLoading(false); }
    };
    loadUserData();
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigate = (next: Screen, nextStep?: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setScreen(next);
      if (nextStep !== undefined) setStep(nextStep);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    });
  };

  // ── Processing ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen === 'processing') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])).start();

      const tl = `Onset: ${timelineState.onset}, Prog: ${timelineState.progression}, Freq: ${timelineState.frequency}`;
      generateClinicalSummary(profile, complaint, interviewAnswers, lifestyle, medical as any, tl).then((summary) => {
        setClinicalSummary(summary);
        navigate('dashboard', TOTAL_STEPS + 1);
      });
    }
  }, [screen]);

  const handleComplaintSubmit = async () => {
    if (!complaint.trim()) return;
    setIsGeneratingQuestions(true);
    const qs = await generateInterviewQuestions(complaint, category, profile);
    setDynamicQuestions(qs);
    setIsGeneratingQuestions(false);
    navigate('interview', 5);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const handleProfileNext = () => {
    const errs: Record<string, string> = {};
    if (!profile.name.trim()) errs.name = 'Name is required.';
    if (!profile.age.trim() || isNaN(Number(profile.age)) || Number(profile.age) <= 0) errs.age = 'Please enter a valid age.';
    if (!profile.gender) errs.gender = 'Please select your gender.';
    if (!profile.email.trim()) {
      errs.email = 'Email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email)) errs.email = 'Please enter a valid email.';
    }
    setProfileErrors(errs);
    if (Object.keys(errs).length > 0) return;
    navigate('lifestyle', 2);
  };

  // ── Diseases helper ────────────────────────────────────────────────────────
  const toggleDisease = (d: string) => {
    if (d === 'None') { setMedical(p => ({ ...p, diseases: ['None'] })); return; }
    setMedical(p => {
      const without = p.diseases.filter(x => x !== 'None' && x !== d);
      return { ...p, diseases: p.diseases.includes(d) ? without : [...without, d] };
    });
  };

  // ── Screen Renderers ───────────────────────────────────────────────────────

  // Screen 02 – Patient Profile Setup
  const renderProfile = () => {
    const fieldError = (key: string) => profileErrors[key] ? (
      <View style={styles.inlineError}>
        <Feather name="alert-circle" size={12} color={C.danger} />
        <Text style={styles.inlineErrorText}>{profileErrors[key]}</Text>
      </View>
    ) : null;

    return (
      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>Let's start with{'\n'}the basics</Text>

        <IconInputField label="Full Name *" value={profile.name} onChange={(t: string) => { setProfile(p => ({ ...p, name: t })); if (profileErrors.name) setProfileErrors(p => ({ ...p, name: '' })); }} placeholder="Enter your name" icon="user" iconColor={profileErrors.name ? C.danger : '#8B5CF6'} />
        {fieldError('name')}

        <IconInputField label="Age *" value={profile.age} onChange={(t: string) => { setProfile(p => ({ ...p, age: t })); if (profileErrors.age) setProfileErrors(p => ({ ...p, age: '' })); }} placeholder="e.g. 32" icon="calendar" iconColor={profileErrors.age ? C.danger : '#3B82F6'} keyboardType="numeric" />
        {fieldError('age')}

        <DropdownField label="Gender *" value={profile.gender} options={GENDER_OPTIONS} onChange={(v) => { setProfile(p => ({ ...p, gender: v })); if (profileErrors.gender) setProfileErrors(p => ({ ...p, gender: '' })); }} icon="gender-male-female" iconColor={profileErrors.gender ? C.danger : '#10B981'} iconFamily="MaterialCommunityIcons" />
        {fieldError('gender')}

        <View style={styles.rowGap}>
          <View style={{ flex: 1 }}>
            <IconInputField label="Height" value={profile.height} onChange={(t: string) => setProfile(p => ({ ...p, height: t }))} placeholder="175 cm" icon="bar-chart-2" iconColor="#0EA5E9" />
          </View>
          <View style={{ flex: 1 }}>
            <IconInputField label="Weight" value={profile.weight} onChange={(t: string) => setProfile(p => ({ ...p, weight: t }))} placeholder="80 kg" icon="scale-bathroom" iconColor="#F59E0B" iconFamily="MaterialCommunityIcons" />
          </View>
        </View>

        <DropdownField label="Blood Group" value={profile.blood} options={BLOOD_OPTIONS} onChange={(v) => setProfile(p => ({ ...p, blood: v }))} icon="droplet" iconColor="#EF4444" />
        <IconInputField label="Occupation" value={profile.occupation} onChange={(t: string) => setProfile(p => ({ ...p, occupation: t }))} placeholder="Software Engineer" icon="briefcase" iconColor="#6366F1" />

        <IconInputField label="Email *" value={profile.email} onChange={(t: string) => { setProfile(p => ({ ...p, email: t })); if (profileErrors.email) setProfileErrors(p => ({ ...p, email: '' })); }} placeholder="email@example.com" icon="mail" iconColor={profileErrors.email ? C.danger : '#3B82F6'} keyboardType="email-address" />
        {fieldError('email')}

        <IconInputField label="Phone Number" value={profile.phone} onChange={(t: string) => setProfile(p => ({ ...p, phone: t }))} placeholder="+91 98765 43210" icon="phone" iconColor="#10B981" keyboardType="phone-pad" />
        <IconInputField label="Emergency Contact" value={profile.emergency} onChange={(t: string) => setProfile(p => ({ ...p, emergency: t }))} placeholder="Name (Relation) Number" icon="alert-circle" iconColor="#EF4444" />

        {Object.keys(profileErrors).some(k => profileErrors[k]) && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color={C.danger} />
            <Text style={styles.errorText}>Please fix the highlighted fields above.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={handleProfileNext}>
          <Text style={styles.nextBtnText}>Next</Text><Feather name="arrow-right" size={18} color={C.white} />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Screen 03 – Lifestyle Assessment
  const renderLifestyle = () => (
    <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.formTitle}>Tell me about{'\n'}your lifestyle</Text>

      <InteractiveSlider label="Sleep Duration" value={lifestyle.sleep} options={SLEEP_OPTIONS} onChange={(v: string) => setLifestyle(p => ({ ...p, sleep: v }))} icon={require('../../assets/images/ai_doctor/sleep.png')} />
      <InteractiveSlider label="Physical Activity" value={lifestyle.activity} options={ACTIVITY_OPTIONS} onChange={(v: string) => setLifestyle(p => ({ ...p, activity: v }))} icon={require('../../assets/images/ai_doctor/activity.png')} />
      <InteractiveSlider label="Water Intake" value={lifestyle.water} options={WATER_OPTIONS} onChange={(v: string) => setLifestyle(p => ({ ...p, water: v }))} icon={require('../../assets/images/ai_doctor/water.png')} />
      <InteractiveSlider label="Smoking" value={lifestyle.smoking} options={SMOKING_OPTIONS} onChange={(v: string) => setLifestyle(p => ({ ...p, smoking: v }))} icon={require('../../assets/images/ai_doctor/smoking.png')} />
      <InteractiveSlider label="Alcohol" value={lifestyle.alcohol} options={ALCOHOL_OPTIONS} onChange={(v: string) => setLifestyle(p => ({ ...p, alcohol: v }))} icon={require('../../assets/images/ai_doctor/alcohol.png')} />

      <Text style={[styles.medSectionTitle, { marginTop: 10, marginBottom: 12 }]}>Diet Preference</Text>
      <View style={styles.symptomsGrid}>
        {DIET_OPTIONS.map(c => (
          <Chip key={c} label={c} selected={lifestyle.diet === c} onPress={() => setLifestyle(p => ({ ...p, diet: c }))} />
        ))}
      </View>

      <EmojiStressSlider value={lifestyle.stress} onChange={(v: string) => setLifestyle(p => ({ ...p, stress: v }))} />

      <TouchableOpacity style={styles.nextBtn} onPress={() => navigate('medical', 3)}>
        <Text style={styles.nextBtnText}>Next</Text><Feather name="arrow-right" size={18} color={C.white} />
      </TouchableOpacity>
    </ScrollView>
  );

  // Screen 04 – Medical History
  const renderMedical = () => {
    const CONDITIONS = [
      { id: 'None', emoji: '✅' },
      { id: 'Diabetes', emoji: '🩸' },
      { id: 'Hypertension', emoji: '❤️' },
      { id: 'Thyroid', emoji: '🦋' },
      { id: 'PCOS', emoji: '🌸' },
      { id: 'Asthma', emoji: '🫁' },
      { id: 'Obesity', emoji: '⚖️' }
    ];

    const isFemale = profile.gender.toLowerCase() === 'female';

    return (
      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>Your medical{'\n'}background</Text>

        <View style={styles.medSection}>
          <Text style={styles.medSectionTitle}>Existing Conditions</Text>
          <Text style={styles.medSectionHint}>Select all that apply</Text>
          <View style={styles.symptomsGrid}>
            {CONDITIONS.map(c => (
              <Chip key={c.id} label={c.id} emoji={c.emoji} selected={medical.diseases.includes(c.id)} onPress={() => toggleDisease(c.id)} />
            ))}
          </View>
        </View>

        <IconInputField key="surgeries" label="Previous Surgeries" value={medical.surgeries} onChange={(t: string) => setMedical(p => ({ ...p, surgeries: t }))} placeholder="e.g. Appendectomy" icon="scissors" iconColor="#6366F1" />
        <IconInputField key="allergies" label="Allergies" value={medical.allergies} onChange={(t: string) => setMedical(p => ({ ...p, allergies: t }))} placeholder="e.g. Pollen, Penicillin" icon="alert-triangle" iconColor="#F59E0B" />
        <IconInputField key="medications" label="Current Medications" value={medical.medications} onChange={(t: string) => setMedical(p => ({ ...p, medications: t }))} placeholder="e.g. Vitamin D, Multivitamin" icon="package" iconColor="#8B5CF6" />
        <IconInputField key="familyHistory" label="Family Medical History" value={medical.familyHistory} onChange={(t: string) => setMedical(p => ({ ...p, familyHistory: t }))} placeholder="e.g. Diabetes, Hypertension" icon="users" iconColor="#10B981" />
        <IconInputField key="mentalHealth" label="Mental Health History" value={medical.mentalHealth} onChange={(t: string) => setMedical(p => ({ ...p, mentalHealth: t }))} placeholder="e.g. Anxiety (Occasional)" icon="heart" iconColor="#EC4899" />

        {isFemale && (
          <IconInputField key="pregnancy" label="Pregnancy Status" value={medical.pregnancy} onChange={(t: string) => setMedical(p => ({ ...p, pregnancy: t }))} placeholder="e.g. Not Applicable" icon="star" iconColor="#0EA5E9" />
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={() => navigate('complaint', 4)}>
          <Text style={styles.nextBtnText}>Next</Text><Feather name="arrow-right" size={18} color={C.white} />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Screen 05 – Chief Complaint
  const renderComplaint = () => {
    const cats = ['Weight Gain', 'Fatigue', 'Back Pain', 'Headache', 'Anxiety', 'Digestive Issues', 'Something Else'];
    return (
      <ScrollView contentContainerStyle={[styles.formScroll, { alignItems: 'center' }]} keyboardShouldPersistTaps="handled">
        <View style={styles.doctorAvatarRow}>
          <Image source={require('../../assets/images/ai_doctor/doctor.png')} style={styles.doctorAvatarImg} resizeMode="cover" />
          <Text style={styles.doctorAvatarLabel}>AI Health coach</Text>
        </View>
        <Text style={[styles.formTitle, { textAlign: 'center', fontSize: 28 }]}>What brings you{'\n'}here today?</Text>
        <Text style={styles.complaintHint}>You can type or choose from suggestions</Text>

        {/* Mic button */}
        <View style={styles.micWrapper}>
          <View style={styles.micOuter}>
            <View style={styles.micMid}>
              <TouchableOpacity style={styles.micInner}>
                <Feather name="mic" size={30} color={C.white} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.micHint}>Tap to speak</Text>
        </View>

        <Text style={styles.orText}>or type your concern</Text>
        <View style={[styles.complaintInputWrapper, { width: '100%' }]}>
          <TextInput
            style={styles.complaintInput}
            placeholder="Type here..."
            placeholderTextColor={C.textMuted}
            value={complaint}
            onChangeText={setComplaint}
          />
          <TouchableOpacity style={styles.complaintSendBtn}>
            <Feather name="send" size={14} color={C.white} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.medSectionTitle, { alignSelf: 'flex-start', marginBottom: 12 }]}>Common Concerns</Text>
        <View style={[styles.symptomsGrid, { alignSelf: 'stretch' }]}>
          {cats.map(c => (
            <Chip key={c} label={c} selected={category === c}
              onPress={() => { setCategory(c); setComplaint(c); }} />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, { width: '100%' }, (!complaint.trim() || isGeneratingQuestions) && { opacity: 0.6 }]}
          onPress={handleComplaintSubmit}
          disabled={!complaint.trim() || isGeneratingQuestions}
        >
          {isGeneratingQuestions
            ? <><ActivityIndicator size="small" color={C.white} /><Text style={styles.nextBtnText}>Analyzing…</Text></>
            : <><Text style={styles.nextBtnText}>Next</Text><Feather name="arrow-right" size={18} color={C.white} /></>
          }
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Screen 06 – AI Medical Interview
  const renderInterview = () => {
    const q = dynamicQuestions[interviewStep];
    if (!q) return (
      <View style={[styles.formScroll as any, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={{ marginTop: 12, color: C.textSecondary }}>Loading questions…</Text>
      </View>
    );
    const isLast = interviewStep === dynamicQuestions.length - 1;
    const selectedAnswer = interviewAnswers[q.id];
    // Use AI-provided options (always available now from prompt or fallback)
    const choices: string[] = q.options?.length
      ? q.options
      : ['Yes', 'No', 'Sometimes', 'Not sure'];

    return (
      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.interviewHeader}>
          <Image source={require('../../assets/images/ai_doctor/doctor.png')} style={styles.interviewAvatar} resizeMode="cover" />
          <Text style={styles.interviewAvatarLabel}>AI Health coach</Text>
        </View>
        <Text style={styles.formTitle}>{q.q}</Text>
        <Text style={styles.formSubtitle}>Please select the most accurate option.</Text>

        {choices.map((choice) => (
          <TouchableOpacity
            key={choice}
            style={[styles.interviewChoice, selectedAnswer === choice && styles.interviewChoiceActive]}
            onPress={() => setInterviewAnswers(prev => ({ ...prev, [q.id]: choice }))}
          >
            <Text style={[styles.interviewChoiceText, selectedAnswer === choice && { color: C.white }]}>{choice}</Text>
            {selectedAnswer === choice && <Feather name="check-circle" size={18} color={C.white} />}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={{ paddingVertical: 16 }} onPress={() => setInterviewAnswers(prev => ({ ...prev, [q.id]: "I'm not sure" }))}>
          <Text style={{ color: C.teal, textAlign: 'center', fontWeight: '600' }}>I'm not sure</Text>
        </TouchableOpacity>

        <View style={styles.interviewNavRow}>
          {interviewStep > 0 && (
            <TouchableOpacity style={styles.interviewBackBtn} onPress={() => setInterviewStep(p => p - 1)}>
              <Text style={{ color: C.textPrimary, fontWeight: '600' }}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, { flex: 1, marginTop: 0 }]}
            onPress={() => { if (isLast) navigate('timeline', 6); else setInterviewStep(p => p + 1); }}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <Feather name="arrow-right" size={18} color={C.white} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Screen 07 – Symptom Timeline
  const renderTimeline = () => (
    <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.formTitle}>Let's map your{'\n'}symptom timeline</Text>
      <Text style={styles.formSubtitle}>This helps me understand the pattern better.</Text>

      <View style={styles.timelineContainer}>
        {[
          { key: 'onset', label: 'Onset', ph: 'e.g. Jan 2024 — Started gradually' },
          { key: 'progression', label: 'Progression', ph: 'e.g. Gradually increased over 2 months' },
          { key: 'frequency', label: 'Frequency', ph: 'e.g. Daily, most days' },
          { key: 'severity', label: 'Severity', ph: 'e.g. Moderate — affects daily life' },
          { key: 'triggers', label: 'Triggers', ph: 'e.g. Late nights, stress, junk food' },
          { key: 'treatments', label: 'Previous Treatments', ph: 'e.g. Dieting, gym, supplements' },
        ].map((item, idx, arr) => (
          <View key={item.key} style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
              <View style={styles.timelineCheck}><Feather name="check" size={12} color={C.white} /></View>
              {idx < arr.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>{item.label}</Text>
              <TextInput
                style={styles.timelineInput}
                placeholder={item.ph}
                placeholderTextColor={C.textMuted}
                value={(timelineState as any)[item.key]}
                onChangeText={(t) => setTimelineState(p => ({ ...p, [item.key]: t }))}
                multiline
              />
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={() => navigate('review', 7)}>
        <Text style={styles.nextBtnText}>Next</Text><Feather name="arrow-right" size={18} color={C.white} />
      </TouchableOpacity>
    </ScrollView>
  );

  // Screen 08 – Review Information
  const renderReview = () => {
    const sections = [
      { id: 'personal', icon: 'person', color: '#3B82F6', iconLib: 'Ionicons', title: 'Personal Information', desc: [profile.name, profile.age && `${profile.age} yrs`, profile.gender].filter(Boolean).join(' · ') || 'Not filled' },
      { id: 'lifestyle', icon: 'leaf', color: '#10B981', iconLib: 'Ionicons', title: 'Lifestyle', desc: [lifestyle.sleep, lifestyle.activity, lifestyle.diet].filter(Boolean).join(' · ') || 'Not filled' },
      { id: 'medical', icon: 'medkit', color: '#8B5CF6', iconLib: 'Ionicons', title: 'Medical History', desc: medical.diseases.join(', ') || 'Not filled' },
      { id: 'symptoms', icon: 'body', color: '#F59E0B', iconLib: 'Ionicons', title: 'Current Symptoms', desc: complaint || 'Not filled' },
      { id: 'meds', icon: 'flask', color: '#6366F1', iconLib: 'Ionicons', title: 'Medications', desc: medical.medications || 'None reported' },
      { id: 'family', icon: 'people', color: '#10B981', iconLib: 'Ionicons', title: 'Family History', desc: medical.familyHistory || 'None reported' },
    ];
    return (
      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>Review your{'\n'}information</Text>
        <Text style={styles.formSubtitle}>Please review and edit if needed before we proceed.</Text>

        {sections.map((item) => {
          const IconComp: any = item.iconLib === 'Ionicons' ? Ionicons : Feather;
          const expanded = expandedReview === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.reviewCard}
              onPress={() => setExpandedReview(expanded ? null : item.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.reviewIcon, { backgroundColor: item.color + '20' }]}>
                <IconComp name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewCardTitle}>{item.title}</Text>
                <Text style={styles.reviewCardDesc}>{item.desc}</Text>
              </View>
              <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.nextBtn} onPress={() => navigate('processing', 8)}>
          <Text style={styles.nextBtnText}>Looks Good, Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Screen 09 – AI Processing
  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <Text style={styles.processingTitle}>Analyzing your health{'\n'}profile...</Text>
      <Text style={styles.processingSubtitle}>Our AI is connecting the dots{'\n'}to generate your clinical summary.</Text>

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Image source={require('../../assets/images/ai_doctor/ai_brain.png')} style={{ width: 240, height: 240 }} resizeMode="contain" />
      </Animated.View>

      <View style={styles.processingList}>
        {[
          { label: 'Analyzing symptoms', done: true },
          { label: 'Structuring clinical information', done: true },
          { label: 'Evaluating risk factors', done: false },
          { label: 'Preparing clinical summary', done: false, faded: true },
        ].map((item, i) => (
          <View key={i} style={styles.processingListItem}>
            <View style={[
              styles.timelineCheck,
              item.done ? { backgroundColor: C.tealLight } : { backgroundColor: 'transparent', borderWidth: 2, borderColor: item.faded ? 'rgba(255,255,255,0.15)' : C.textMuted },
            ]}>
              {item.done && <Feather name="check" size={12} color={C.white} />}
            </View>
            <Text style={[styles.processingListText, item.faded && { color: 'rgba(255,255,255,0.35)' }]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.processingHint}>This may take a few moments</Text>
    </View>
  );

  // Screen 10 – Dashboard
  const renderDashboard = () => {
    const defaultSummary = {
      healthScore: 72,
      scoreGrade: 'Good',
      scoreMessage: 'Keep improving!\nSmall changes can make\na big difference.',
      primaryConcernSummary: category || 'Weight Gain',
      riskLevel: 'Moderate',
      riskMessage: 'Based on your current\nhealth profile',
      keyInsights: [
        'Inconsistent sleep may be affecting your energy levels.',
        'High stress and sedentary lifestyle may be contributing to weight gain.',
        'No major risk detected at this time.',
      ]
    };
    const summary = clinicalSummary || defaultSummary;

    return (
      <ScrollView contentContainerStyle={styles.dashScroll}>
        {/* Header */}
        <View style={styles.dashHeader}>
          <View>
            <Text style={styles.dashName}>Hi, {profile.name.split(' ')[0] || 'User'} 👋</Text>
            <Text style={styles.dashSubtitle}>Here's your clinical intelligence{'\n'}summary.</Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn}>
            <Feather name="download" size={20} color={C.teal} />
          </TouchableOpacity>
        </View>

        {/* Health Score */}
        <GlassCard style={styles.scoreCard}>
          <View>
            <Text style={styles.scoreLabel}>Health Score</Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{summary.healthScore}</Text>
              <Text style={styles.scoreDenom}>/100</Text>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 20 }}>
            <Text style={styles.scoreGrade}>{summary.scoreGrade}</Text>
            <Text style={styles.scoreMessage}>{summary.scoreMessage}</Text>
          </View>
        </GlassCard>

        {/* Primary Concern */}
        <Text style={styles.dashSectionLabel}>Primary Concern</Text>
        <GlassCard style={styles.concernCard}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.concernTitle}>{category || 'Primary Concern'}</Text>
            <Text style={styles.concernSub}>{summary.primaryConcernSummary}</Text>
          </View>
          <View style={styles.concernIcon}>
            <Image source={require('../../assets/images/ai_doctor/doctor.png')} style={{ width: 30, height: 30 }} resizeMode="contain" />
          </View>
        </GlassCard>

        {/* Risk Level */}
        <Text style={styles.dashSectionLabel}>Risk Level</Text>
        <GlassCard style={styles.riskCard}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.riskTitle}>{summary.riskLevel || 'Moderate'}</Text>
            <Text style={styles.riskSub}>{summary.riskMessage || 'Based on your current health profile'}</Text>
          </View>
          <Feather name="activity" size={40} color={
            (summary.riskLevel || '').toLowerCase() === 'high' || (summary.riskLevel || '').toLowerCase() === 'critical' ? C.danger :
              (summary.riskLevel || '').toLowerCase() === 'low' ? C.success : '#F59E0B'
          } />
        </GlassCard>

        {/* Key Insights */}
        <Text style={styles.dashSectionLabel}>Key Insights</Text>
        <GlassCard style={{ padding: 16, gap: 14 }}>
          {summary.keyInsights.map((insight, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <Feather name="check" size={16} color={C.success} style={{ marginTop: 2 }} />
              <Text style={{ fontSize: 13, color: C.textPrimary, flex: 1, lineHeight: 20 }}>{insight}</Text>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    );
  };

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (dbLoading) return (
    <SafeAreaView style={styles.safeArea}>
      <ActivityIndicator size="large" color={C.teal} />
    </SafeAreaView>
  );

  // ── Header bar ─────────────────────────────────────────────────────────────
  const renderHeader = () => {
    if (screen === 'processing') return null;
    if (screen === 'dashboard') return (
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>
    );
    return (
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => {
            const idx = STEP_SCREENS.indexOf(screen);
            if (idx <= 0) router.back();
            else navigate(STEP_SCREENS[idx - 1], idx);
          }}
        >
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}><ProgressBar step={step} /></View>
        <TouchableOpacity style={styles.headerSkip}>
          <Text style={styles.headerSkipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const RENDERERS: Record<Screen, () => React.ReactNode> = {
    profile: renderProfile, lifestyle: renderLifestyle, medical: renderMedical,
    complaint: renderComplaint, interview: renderInterview, timeline: renderTimeline,
    review: renderReview, processing: renderProcessing, dashboard: renderDashboard,
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, screen === 'processing' && { backgroundColor: '#091526' }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle={screen === 'processing' ? 'light-content' : 'dark-content'} />
      {renderHeader()}
      <Animated.View style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {RENDERERS[screen]()}
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },

  // Header
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerBack: { padding: 6, borderRadius: 10, backgroundColor: '#F1F5F9' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSkip: { padding: 4 },
  headerSkipText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },

  // Progress
  progressTrackContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.lightGray },
  progressDotActive: { backgroundColor: C.teal },
  progressLine: { width: 16, height: 2, backgroundColor: C.lightGray, borderRadius: 1 },
  progressLineActive: { backgroundColor: C.teal },

  // Glass card
  glassCard: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.borderColor, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },

  // Form
  formScroll: { padding: 24, paddingBottom: 100 },
  formTitle: { fontSize: 30, fontWeight: '800', color: C.textPrimary, marginBottom: 20, lineHeight: 38 },
  formSubtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 20, lineHeight: 22 },

  // Validation Error
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12, marginBottom: 8, marginTop: 8, gap: 8 },
  errorText: { color: C.danger, fontSize: 14, fontWeight: '600', flex: 1 },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 58, marginTop: -4, marginBottom: 8 },
  inlineErrorText: { color: C.danger, fontSize: 12, fontWeight: '500' },

  // Shared icon circle
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },

  // Dropdown
  dropdownRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#F8FAFC', borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: C.borderColor },
  dropdownLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  dropdownValue: { fontSize: 15, fontWeight: '600', color: C.textPrimary },

  // Interactive Slider
  sliderCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.borderColor },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  sliderIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.tealMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sliderImage: { width: 44, height: 44, borderRadius: 22 },
  sliderLabel: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  sliderOptions: { gap: 10, paddingRight: 20 },
  sliderOptionNode: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.borderColor, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  sliderOptionNodeActive: { backgroundColor: C.teal, borderColor: C.teal },
  sliderOptionText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  sliderOptionTextActive: { color: C.white },

  // Emoji Stress Slider
  stressEmojisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  stressEmojiBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, flex: 1, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
  stressEmoji: { fontSize: 28, marginBottom: 4 },
  stressEmojiLabel: { fontSize: 11, fontWeight: '700' },

  // Icon input
  iconInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#F8FAFC', borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: C.borderColor },
  iconInputTextContainer: { flex: 1, marginLeft: 14 },
  iconInput: { fontSize: 15, fontWeight: '600', color: C.textPrimary, padding: 0, marginTop: 2 },

  // Row gap
  rowGap: { flexDirection: 'row', gap: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingBottom: 40, maxHeight: height * 0.6 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, paddingHorizontal: 24, marginBottom: 8 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  modalOptionActive: { backgroundColor: C.tealMuted },
  modalOptionText: { fontSize: 15, fontWeight: '500', color: C.textPrimary },
  modalOptionTextActive: { color: C.teal, fontWeight: '700' },
  modalSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 24 },

  // Medical
  medSection: { marginBottom: 20 },
  medSectionTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  medSectionHint: { fontSize: 12, color: C.textMuted, marginBottom: 12 },

  // Chips
  symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: C.borderColor, backgroundColor: '#F8FAFC' },
  chipActive: { backgroundColor: C.teal, borderColor: C.teal },
  chipText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  chipTextActive: { color: C.white },

  // Complaint
  doctorAvatarRow: { alignItems: 'center', marginBottom: 16 },
  doctorAvatarImg: { width: 80, height: 80, borderRadius: 40 },
  doctorAvatarLabel: { fontSize: 12, color: C.textSecondary, marginTop: 6, fontWeight: '600' },
  complaintHint: { fontSize: 14, color: C.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  micWrapper: { alignItems: 'center', marginBottom: 28 },
  micOuter: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  micMid: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#BAE6FD', alignItems: 'center', justifyContent: 'center' },
  micInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', shadowColor: C.teal, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  micHint: { marginTop: 10, fontSize: 12, color: C.textMuted, fontWeight: '500' },
  orText: { fontSize: 13, color: C.textMuted, marginBottom: 12 },
  complaintInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 24, paddingLeft: 20, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: C.borderColor, marginBottom: 24 },
  complaintInput: { flex: 1, fontSize: 14, color: C.textPrimary },
  complaintSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#94A3B8', alignItems: 'center', justifyContent: 'center' },

  // Interview
  interviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  interviewAvatar: { width: 50, height: 50, borderRadius: 25 },
  interviewAvatarLabel: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  interviewChoice: { padding: 18, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: C.borderColor, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  interviewChoiceActive: { backgroundColor: C.teal, borderColor: C.teal },
  interviewChoiceText: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  interviewNavRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  interviewBackBtn: { paddingHorizontal: 24, paddingVertical: 18, borderRadius: 16, borderWidth: 1, borderColor: C.borderColor, alignItems: 'center', justifyContent: 'center' },

  // Timeline
  timelineContainer: { paddingLeft: 10, marginTop: 8 },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timelineIconContainer: { width: 30, alignItems: 'center' },
  timelineCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineLine: { width: 2, backgroundColor: C.tealLight, position: 'absolute', top: 24, bottom: -20, zIndex: 1 },
  timelineContent: { flex: 1, marginLeft: 16, paddingBottom: 10 },
  timelineLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  timelineInput: { fontSize: 14, fontWeight: '500', color: C.textPrimary, padding: 0, lineHeight: 22 },

  // Review
  reviewCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: C.borderColor },
  reviewIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  reviewCardTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  reviewCardDesc: { fontSize: 12, color: C.textSecondary },

  // Processing
  processingContainer: { flex: 1, backgroundColor: '#091526', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  processingTitle: { fontSize: 28, fontWeight: '800', color: C.white, alignSelf: 'flex-start', lineHeight: 36 },
  processingSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', alignSelf: 'flex-start', lineHeight: 22 },
  processingList: { alignSelf: 'stretch', gap: 16 },
  processingListItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  processingListText: { fontSize: 14, fontWeight: '500', color: C.white },
  processingHint: { fontSize: 12, color: 'rgba(255,255,255,0.35)', position: 'absolute', bottom: 36 },

  // Dashboard
  dashScroll: { padding: 20, paddingBottom: 100, backgroundColor: '#F8FAFC' },
  dashHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  dashName: { fontSize: 24, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  dashSubtitle: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  downloadBtn: { padding: 12, backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.borderColor },
  dashSectionLabel: { fontSize: 12, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  scoreCard: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  scoreLabel: { fontSize: 12, fontWeight: '700', color: C.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: 22, fontWeight: '800', color: C.textPrimary },
  scoreDenom: { fontSize: 11, color: C.textMuted },
  scoreGrade: { fontSize: 20, fontWeight: '800', color: C.teal, marginBottom: 6 },
  scoreMessage: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  concernCard: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  concernTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  concernSub: { fontSize: 12, color: C.textSecondary },
  concernIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  riskCard: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  riskTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  riskSub: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },

  // Next button
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.teal, borderRadius: 16, padding: 18, marginTop: 8 },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: C.white },
});
