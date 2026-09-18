import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import {
  LONGEVITY_SECTIONS,
  LongevityPlanSection,
  LongevityPlanItem,
} from "@/constants/longevityPlans";

interface CategoryCardsProps {
  categoryTitle: string;
  categoryTagline?: string;
  consultationSubtitle: string;
  productsSubtitle: string;
  treatmentPlanSubtitle?: string;
  accentColor: string;
  consultationIcon?: keyof typeof Ionicons.glyphMap;
  productsIcon?: keyof typeof Ionicons.glyphMap;
  treatmentIcon?: keyof typeof Ionicons.glyphMap;
  treatmentPlans?: string[];
  structuredSections?: LongevityPlanSection[];
}

const DEFAULT_TREATMENT_PLANS: Record<string, string[]> = {
  longevity: [
    "Longevity Physician Consultation – Initial",
    "Comprehensive Preventive Blood Panel",
    "Advanced Epigenetic Biological Age Test",
    "Longevity Essential Annual Membership",
    "Longevity Advanced Annual Membership",
    "Longevity Precision Annual Membership",
    "Longevity Concierge Annual Membership",
  ],
  pain: [
    "Knee and joint pain",
    "Back and neck pain",
    "Sports injuries",
    "Arthritis",
    "Physiotherapy",
    "PRP and approved regenerative procedures",
    "Post-surgical rehabilitation",
  ],
  hair: [
    "Hair-loss assessment",
    "AI scalp analysis",
    "Medical hair restoration",
    "Hair PRP",
    "Transplant consultation",
    "Nutrition and hormonal evaluation",
  ],
  heart: [
    "Blood pressure",
    "Cholesterol",
    "Diabetes",
    "ECG and cardiac testing",
    "Continuous glucose monitoring",
    "Cardiology consultation",
    "Lifestyle-risk reduction",
  ],
  skin: [
    "AI skin analysis",
    "Acne and pigmentation",
    "Anti-ageing and rejuvenation",
    "Botox and fillers",
    "Lasers and skin tightening",
    "Scars and stretch marks",
    "Post-weight-loss facial and body restoration",
  ],
};

function getFallbackPlans(categoryTitle: string): string[] {
  const lower = categoryTitle.toLowerCase();
  if (lower.includes("longevity")) return DEFAULT_TREATMENT_PLANS.longevity;
  if (lower.includes("pain")) return DEFAULT_TREATMENT_PLANS.pain;
  if (lower.includes("hair")) return DEFAULT_TREATMENT_PLANS.hair;
  if (lower.includes("heart") || lower.includes("diabetes")) return DEFAULT_TREATMENT_PLANS.heart;
  if (lower.includes("skin")) return DEFAULT_TREATMENT_PLANS.skin;
  return DEFAULT_TREATMENT_PLANS.longevity;
}

export const CategoryCards: React.FC<CategoryCardsProps> = ({
  categoryTitle,
  consultationSubtitle,
  productsSubtitle,
  treatmentPlanSubtitle = "Personalized clinician-designed care protocols, step-by-step guidance & therapy plans tailored for your health goals.",
  accentColor,
  consultationIcon = "calendar",
  productsIcon = "cart",
  treatmentIcon = "medical",
  treatmentPlans,
  structuredSections,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");

  // Filter & tab states for treatment modal
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPlanTitle, setSelectedPlanTitle] = useState<string>("");

  const isLongevityCategory = categoryTitle.toLowerCase().includes("longevity");
  const activeStructuredSections =
    structuredSections && structuredSections.length > 0
      ? structuredSections
      : isLongevityCategory
      ? LONGEVITY_SECTIONS
      : null;

  const activeTreatmentPlans =
    treatmentPlans && treatmentPlans.length > 0
      ? treatmentPlans
      : getFallbackPlans(categoryTitle);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (session.user.user_metadata?.full_name) {
          setName(session.user.user_metadata.full_name);
        }
        if (session.user.email) {
          setEmail(session.user.email);
        }
        if (session.user.phone) {
          setPhone(session.user.phone);
        }
      }
    });
  }, []);

  const handleBookConsultationPress = () => {
    setShowModal(true);
  };

  const handleBuyProducts = () => {
    Alert.alert(
      "Buy Your Products",
      `Opening shop for ${categoryTitle} medical-grade products & clinician recommended kits.`,
      [{ text: "OK" }]
    );
  };

  const handleTreatmentPlans = () => {
    setShowTreatmentModal(true);
  };

  const handleSelectPlanForBooking = (planName: string) => {
    setSelectedPlanTitle(planName);
    setShowTreatmentModal(false);
    setShowModal(true);
  };

  const handleSubmitConsultation = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Information", "Please enter your Name.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Missing Information", "Please enter your Phone Number.");
      return;
    }
    if (!age.trim()) {
      Alert.alert("Missing Information", "Please enter your Age.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Missing Information", "Please enter your Email ID.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const patientId = sessionData?.session?.user?.id || null;

      const { data: staffData } = await supabase
        .from("staffs")
        .select("id")
        .limit(1)
        .maybeSingle();

      const doctorId = staffData?.id || null;

      const scheduledAt = new Date().toISOString();
      const bookingTitle = selectedPlanTitle
        ? `Book Plan: ${selectedPlanTitle}`
        : `Book Consultation - ${categoryTitle}`;

      const appointmentPayload: Record<string, any> = {
        patient_id: patientId,
        scheduled_at: scheduledAt,
        status: "pending",
        title: bookingTitle,
        type: categoryTitle,
        related_to: categoryTitle,
        notes: `Selected Plan: ${selectedPlanTitle || "General"}, Patient Name: ${name.trim()}, Phone: ${phone.trim()}, Age: ${age.trim()}, Email: ${email.trim()}`,
        plan_details: {
          patient_name: name.trim(),
          phone: phone.trim(),
          age: age.trim(),
          email: email.trim(),
          category: categoryTitle,
          selected_plan: selectedPlanTitle || null,
        },
      };

      if (doctorId) {
        appointmentPayload.doctor_id = doctorId;
      }

      const { error } = await supabase
        .from("appointments")
        .insert([appointmentPayload]);

      if (error) {
        console.error("Error inserting into appointments table:", error);
        let errorMsg = error.message;
        if (error.code === "42501") {
          errorMsg =
            "Row-Level Security (RLS) policy restricted this insert. Please run the RLS SQL policy for table 'appointments' in Supabase SQL Editor.";
        }
        Alert.alert("Booking Error", errorMsg);
        return;
      }

      setShowModal(false);
      setSelectedPlanTitle("");
      Alert.alert(
        "Consultation Booked",
        selectedPlanTitle
          ? `Your booking request for "${selectedPlanTitle}" has been submitted. Our longevity team will reach out shortly.`
          : "Your consultation request has been booked with pending status. Our team will contact you soon.",
        [{ text: "OK" }]
      );
    } catch (err: any) {
      console.error("Unexpected error submitting consultation:", err);
      Alert.alert("Booking Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Card 1: Book Your Consultation */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: `${accentColor}15` }]}>
            <Ionicons name={consultationIcon} size={22} color={accentColor} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.cardTag}>1-ON-1 DOCTOR SESSION</Text>
            <Text style={styles.cardTitle}>Book Your Consultation</Text>
          </View>
        </View>

        <Text style={styles.cardSubtitle}>{consultationSubtitle}</Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: accentColor }]}
          onPress={handleBookConsultationPress}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Book Consultation</Text>
          <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Card 2: Buy Your Products */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: "#05966915" }]}>
            <Ionicons name={productsIcon} size={22} color="#059669" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.cardTag, { color: "#059669" }]}>CURATED CARE KITS & PRODUCTS</Text>
            <Text style={styles.cardTitle}>Buy Your Products</Text>
          </View>
        </View>

        <Text style={styles.cardSubtitle}>{productsSubtitle}</Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: "#059669" }]}
          onPress={handleBuyProducts}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Buy Products</Text>
          <Ionicons name="bag-handle" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Card 3: Treatment Plans */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: "#7C3AED15" }]}>
            <Ionicons name={treatmentIcon} size={22} color="#7C3AED" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.cardTag, { color: "#7C3AED" }]}>CLINICIAN DESIGNED PROTOCOLS</Text>
            <Text style={styles.cardTitle}>Treatment Plans</Text>
          </View>
        </View>

        <Text style={styles.cardSubtitle}>{treatmentPlanSubtitle}</Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: "#7C3AED" }]}
          onPress={handleTreatmentPlans}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>View Treatment Plans</Text>
          <Ionicons name="document-text" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Popup Consultation Modal Form */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalKeyboardAvoid}
            >
              <View style={styles.modalCard}>
                {/* Header */}
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalCategoryBadge, { color: accentColor }]}>
                      {categoryTitle.toUpperCase()}
                    </Text>
                    <Text style={styles.modalTitle}>Book Consultation</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowModal(false)}
                    style={styles.closeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={22} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {selectedPlanTitle ? (
                  <View style={[styles.selectedPlanBanner, { borderColor: `${accentColor}40` }]}>
                    <View style={styles.selectedPlanBannerLeft}>
                      <Ionicons name="ribbon-outline" size={16} color={accentColor} />
                      <Text style={styles.selectedPlanBannerText} numberOfLines={1}>
                        Selected Plan: {selectedPlanTitle}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedPlanTitle("")}>
                      <Ionicons name="close-circle" size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                <Text style={styles.modalSubtitle}>
                  Fill in your details below to schedule your consultation with our specialist team.
                </Text>

                {/* Form Fields */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>User Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your contact number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Age</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 28"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={age}
                      onChangeText={setAge}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 2 }]}>
                    <Text style={styles.inputLabel}>Email ID</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@example.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>

                {/* Submit Action Buttons */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: accentColor, opacity: isSubmitting ? 0.7 : 1 }]}
                    onPress={handleSubmitConsultation}
                    activeOpacity={0.85}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>Submit Request</Text>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Treatment Plans Popup Modal */}
      <Modal
        visible={showTreatmentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTreatmentModal(false)}
      >
        <View style={styles.treatmentModalOverlay}>
          <View style={styles.treatmentModalCard}>
            {/* Header */}
            <View style={styles.treatmentModalHeader}>
              <View style={styles.treatmentModalTitleRow}>
                <View style={[styles.treatmentIconBadge, { backgroundColor: `${accentColor}15` }]}>
                  <Ionicons name={treatmentIcon} size={20} color={accentColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalCategoryBadge, { color: accentColor }]}>
                    {categoryTitle.toUpperCase()}
                  </Text>
                  <Text style={styles.treatmentModalTitle}>Treatment Plans & Pricing</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowTreatmentModal(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Filter Tabs & Search Bar if Structured Sections exist */}
            {activeStructuredSections ? (
              <View style={styles.structuredHeaderContainer}>
                {/* Search Input */}
                <View style={styles.searchBarRow}>
                  <Ionicons name="search" size={16} color="#64748B" style={{ marginLeft: 10 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search services, blood panels, packages..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery("")} style={{ marginRight: 8 }}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Category Tab Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabPillsContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.tabPill,
                      activeTab === "all" && { backgroundColor: accentColor, borderColor: accentColor },
                    ]}
                    onPress={() => setActiveTab("all")}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.tabPillText,
                        activeTab === "all" && { color: "#FFFFFF", fontWeight: "700" },
                      ]}
                    >
                      All (37)
                    </Text>
                  </TouchableOpacity>

                  {activeStructuredSections.map((sec) => {
                    const count = sec.items.length;
                    const isActive = activeTab === sec.id;
                    return (
                      <TouchableOpacity
                        key={sec.id}
                        style={[
                          styles.tabPill,
                          isActive && { backgroundColor: accentColor, borderColor: accentColor },
                        ]}
                        onPress={() => setActiveTab(sec.id)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.tabPillText,
                            isActive && { color: "#FFFFFF", fontWeight: "700" },
                          ]}
                        >
                          {sec.title.split(" ")[0]} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <Text style={styles.treatmentModalSubtitle}>
                Clinician-designed treatment plans & specialized care protocols available for {categoryTitle}:
              </Text>
            )}

            {/* Scrollable Treatment Content */}
            <ScrollView
              style={styles.treatmentListScroll}
              contentContainerStyle={styles.treatmentListContent}
              showsVerticalScrollIndicator={true}
            >
              {activeStructuredSections ? (
                // Structured View
                activeStructuredSections.map((section) => {
                  // Tab filter check
                  if (activeTab !== "all" && activeTab !== section.id) return null;

                  // Search query filter check
                  const matchingItems = section.items.filter((item) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      item.name.toLowerCase().includes(q) ||
                      item.details.toLowerCase().includes(q) ||
                      item.price.toLowerCase().includes(q) ||
                      (item.frequency && item.frequency.toLowerCase().includes(q)) ||
                      (item.badge && item.badge.toLowerCase().includes(q))
                    );
                  });

                  if (matchingItems.length === 0) return null;

                  return (
                    <View key={section.id} style={styles.sectionGroup}>
                      {/* Section Title Header */}
                      <View style={styles.sectionTitleRow}>
                        <View style={[styles.sectionIconDot, { backgroundColor: accentColor }]} />
                        <Text style={styles.sectionTitleText}>{section.title}</Text>
                        <View style={styles.sectionBadge}>
                          <Text style={[styles.sectionBadgeText, { color: accentColor }]}>
                            {matchingItems.length} items
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.sectionSubtitleText}>{section.subtitle}</Text>

                      {/* Section Item Cards */}
                      {matchingItems.map((item) => (
                        <View key={item.id} style={styles.structuredCardItem}>
                          {/* Item Header */}
                          <View style={styles.itemHeaderRow}>
                            <Text style={styles.itemNameText}>{item.name}</Text>
                            <View style={[styles.priceTagBadge, { backgroundColor: accentColor }]}>
                              <Ionicons name="pricetag" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.priceTagText}>{item.price}</Text>
                            </View>
                          </View>

                          {/* Meta Tags Row */}
                          {(item.frequency || item.badge || item.note) && (
                            <View style={styles.metaTagsRow}>
                              {item.frequency ? (
                                <View style={styles.freqTag}>
                                  <Ionicons name="time-outline" size={11} color="#475569" />
                                  <Text style={styles.freqTagText}>{item.frequency}</Text>
                                </View>
                              ) : null}
                              {item.badge ? (
                                <View style={[styles.badgeTag, { backgroundColor: `${accentColor}15` }]}>
                                  <Text style={[styles.badgeTagText, { color: accentColor }]}>
                                    {item.badge}
                                  </Text>
                                </View>
                              ) : null}
                              {item.note ? (
                                <View style={styles.noteTag}>
                                  <Text style={styles.noteTagText}>{item.note}</Text>
                                </View>
                              ) : null}
                            </View>
                          )}

                          {/* Details Text */}
                          <View style={styles.itemDetailsBox}>
                            <Text style={styles.itemDetailsText}>{item.details}</Text>
                          </View>

                          {/* Select / Book Action */}
                          <TouchableOpacity
                            style={styles.bookThisPlanBtn}
                            onPress={() => handleSelectPlanForBooking(item.name)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="calendar-outline" size={14} color={accentColor} />
                            <Text style={[styles.bookThisPlanText, { color: accentColor }]}>
                              Book This Plan
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color={accentColor} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  );
                })
              ) : (
                // Simple Fallback View
                activeTreatmentPlans.map((plan, index) => (
                  <View key={index} style={styles.treatmentPlanItem}>
                    <View style={[styles.planNumberBadge, { backgroundColor: `${accentColor}15` }]}>
                      <Text style={[styles.planNumberText, { color: accentColor }]}>{index + 1}</Text>
                    </View>
                    <Text style={styles.treatmentPlanText}>{plan}</Text>
                    <Ionicons name="checkmark-circle" size={18} color={accentColor} />
                  </View>
                ))
              )}
            </ScrollView>

            {/* Footer Action Buttons */}
            <View style={styles.treatmentModalFooter}>
              <TouchableOpacity
                style={[styles.closeActionBtn, { backgroundColor: accentColor }]}
                onPress={() => setShowTreatmentModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.closeActionBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    padding: 14,
    gap: 12,
    paddingBottom: 30,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  cardTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 14,
  },
  primaryBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Modal Styling */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  modalKeyboardAvoid: {
    width: "100%",
    maxWidth: 480,
    alignItems: "center",
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalCategoryBadge: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  selectedPlanBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  selectedPlanBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  selectedPlanBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Treatment Modal Styling */
  treatmentModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  treatmentModalCard: {
    width: "94%",
    maxWidth: 560,
    height: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    display: "flex",
    flexDirection: "column",
  },
  treatmentModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  treatmentModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  treatmentIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  treatmentModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  treatmentModalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 12,
    lineHeight: 17,
  },

  /* Structured Headers, Search & Tabs */
  structuredHeaderContainer: {
    marginBottom: 12,
    gap: 10,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingHorizontal: 8,
  },
  tabPillsContainer: {
    gap: 6,
    paddingRight: 10,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },

  /* Content Scroll Area */
  treatmentListScroll: {
    flex: 1,
    marginBottom: 12,
  },
  treatmentListContent: {
    gap: 14,
    paddingRight: 2,
  },

  /* Section Styling */
  sectionGroup: {
    gap: 10,
    marginBottom: 6,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sectionSubtitleText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: -4,
    marginBottom: 4,
  },

  /* Structured Card Item */
  structuredCardItem: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  itemHeaderRow: {
    gap: 6,
  },
  itemNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 19,
  },
  priceTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  priceTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    flexShrink: 1,
    lineHeight: 16,
  },

  /* Meta Tags */
  metaTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  freqTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freqTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  badgeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  noteTag: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  noteTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },

  /* Details Box */
  itemDetailsBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 8,
    padding: 10,
  },
  itemDetailsText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 17,
  },

  bookThisPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    marginTop: 2,
    alignSelf: "flex-end",
  },
  bookThisPlanText: {
    fontSize: 12,
    fontWeight: "700",
  },

  /* Simple Fallback View */
  treatmentPlanItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  planNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  planNumberText: {
    fontSize: 12,
    fontWeight: "800",
  },
  treatmentPlanText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },

  /* Footer */
  treatmentModalFooter: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  closeActionBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeActionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
