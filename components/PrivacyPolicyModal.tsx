import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
  useNativeModal?: boolean;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  visible,
  onClose,
  useNativeModal = true,
}) => {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const content = (
    <View style={s.overlay}>
      <View style={[s.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Privacy Policy</Text>
            <Text style={s.headerSubtitle}>Last Updated: April 27, 2026</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Section 1 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>1. Introduction</Text>
            <Text style={s.bodyText}>
              Welcome to Genestac ("we," "our," or "us"). We respect your privacy and are highly committed to protecting your personal and medical information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website (genestac.com) and use our telehealth services, metabolic optimization protocols, and related clinical offerings.
            </Text>
            <Text style={s.bodyText}>
              By accessing or using our website and services, you agree to the terms of this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access the site.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>2. Information We Collect</Text>
            <Text style={s.bodyText}>
              We may collect personal and medical information from you in a variety of ways, including when you register on the site, fill out a health intake form, or interact with our telehealth platform. The information we collect includes:
            </Text>
            <Text style={s.bulletText}>• <Text style={s.bold}>Personal Identification Information:</Text> Your full name, email address, phone number, date of birth, and shipping/billing addresses.</Text>
            <Text style={s.bulletText}>• <Text style={s.bold}>Medical and Health Information:</Text> Biometric data (e.g., height, weight), current and past medical conditions, biological goals, and details provided during your medical intake process.</Text>
            <Text style={s.bulletText}>• <Text style={s.bold}>Payment Information:</Text> Credit card details and billing information (processed securely through third-party payment gateways; we do not store your full credit card number).</Text>
            <Text style={s.bulletText}>• <Text style={s.bold}>Automatically Collected Data:</Text> IP addresses, browser types, operating systems, access times, and the pages you have viewed directly before and after accessing the site.</Text>
          </View>

          {/* Section 3 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>3. How We Use Your Information</Text>
            <Text style={s.bodyText}>
              Having accurate information about you permits us to provide you with a smooth, efficient, and customized clinical experience. Specifically, we may use information collected about you via the site to:
            </Text>
            <Text style={s.bulletText}>• Evaluate your health profile and formulate personalized clinical treatments.</Text>
            <Text style={s.bulletText}>• Process and fulfill your prescriptions through our FDA-registered compounding pharmacy partners.</Text>
            <Text style={s.bulletText}>• Manage overnight cold-chain logistics and order deliveries.</Text>
            <Text style={s.bulletText}>• Allow our board-certified physicians and your dedicated Health Consultants to monitor your progress and provide ongoing 1-on-1 support.</Text>
            <Text style={s.bulletText}>• Process payments.</Text>
            <Text style={s.bulletText}>• Send administrative information, such as appointment reminders, protocol updates, and order confirmations.</Text>
            <Text style={s.bulletText}>• Improve our website functionality and clinical offerings.</Text>
          </View>

          {/* Section 4 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>4. How We Share Your Information</Text>
            <Text style={s.bodyText}>
              We strictly protect your data and do not sell your personal information to third parties. We only share information in the following situations:
            </Text>
            <Text style={s.bulletText}>• <Text style={s.bold}>Healthcare Providers:</Text> With our network of board-certified doctors, endocrinologists, and specialists who review your medical intake to prescribe and oversee your treatment.</Text>
            <Text style={s.bulletText}>• <Text style={s.bold}>Pharmacy Partners:</Text> With certified, 503A-designated pharmacies strictly for the purpose of compounding and fulfilling your prescribed medications (e.g., GLP-1, NAD+, or peptide therapies).</Text>
            <Text style={s.bulletText}>• <Text style={s.bold}>Third-Party Service Providers:</Text> With trusted logistics partners (for secure, temperature-controlled delivery) and IT service providers who assist us in operating our platform securely.</Text>
            <Text style={s.bulletText}>• <Text style={s.bold}>Legal Obligations:</Text> If required by law, subpoena, or regulatory mandates, we may disclose your information to protect the safety of our patients and clinical staff.</Text>
          </View>

          {/* Section 5 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>5. Data Security and HIPAA Compliance</Text>
            <Text style={s.bodyText}>
              Your privacy is our top clinical priority. Because we facilitate clinical-grade telehealth, we adhere to strict data security standards. We use administrative, technical, and physical security measures, including HIPAA-compliant encrypted servers, to help protect your personal and Protected Health Information (PHI). While we have taken reasonable steps to secure the personal information you provide to us, please be aware that no security measures are perfect or impenetrable.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>6. Cookies and Tracking Technologies</Text>
            <Text style={s.bodyText}>
              We may use cookies, web beacons, tracking pixels, and other tracking technologies on our website to help customize the site and improve your experience. You can choose to disable cookies through your browser settings, though this may affect your ability to use certain features of our site.
            </Text>
          </View>

          {/* Section 7 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>7. Data Retention</Text>
            <Text style={s.bodyText}>
              We will retain your personal and medical information only for as long as is necessary for the purposes set out in this Privacy Policy, and to the extent necessary to comply with our legal obligations (such as state and federal medical record retention laws), resolve disputes, and enforce our legal agreements and policies.
            </Text>
          </View>

          {/* Section 8 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>8. Your Privacy Rights</Text>
            <Text style={s.bodyText}>
              Depending on your location, you may have the following rights regarding your personal data:
            </Text>
            <Text style={s.bulletText}>• The right to access and receive a copy of your personal data.</Text>
            <Text style={s.bulletText}>• The right to request correction of any inaccurate or incomplete information.</Text>
            <Text style={s.bulletText}>• The right to request the deletion of your personal data (subject to mandatory medical record retention requirements).</Text>
            <Text style={s.bulletText}>• The right to opt out of non-essential marketing communications.</Text>
          </View>

          {/* Section 9 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>9. Contact Us</Text>
            <Text style={s.bodyText}>
              If you have questions or comments about this Privacy Policy or wish to exercise your data rights, please contact our clinical headquarters:
            </Text>
            <View style={s.addressBox}>
              <Text style={s.bold}>Genestac Headquarters</Text>
              <Text style={s.contactLine}>A Block, Unitech Business Zone, 106</Text>
              <Text style={s.contactLine}>Nirvana Country, Sector 50</Text>
              <Text style={s.contactLine}>Gurugram, Haryana 122018</Text>
              <Text style={[s.contactLine, { marginTop: 6 }]}>✉ info@genestac.com</Text>
              <Text style={s.contactLine}>📞 +91 99711 14121</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Action */}
        <View style={s.footer}>
          <TouchableOpacity style={s.acceptBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={s.acceptBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (useNativeModal) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        {content}
      </Modal>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 999999, elevation: 99999 }]}>
      {content}
    </View>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    paddingTop: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    paddingLeft: 4,
  },
  bold: {
    fontWeight: '600',
    color: '#0F172A',
  },
  addressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactLine: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
