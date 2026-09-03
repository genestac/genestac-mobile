import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  useNativeModal?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
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
            <Text style={s.headerTitle}>Terms and Conditions</Text>
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
          {/* Medical Disclaimer Banner */}
          <View style={s.disclaimerBox}>
            <View style={s.disclaimerHeader}>
              <Ionicons name="alert-circle" size={20} color="#B91C1C" />
              <Text style={s.disclaimerTitle}>IMPORTANT MEDICAL DISCLAIMER</Text>
            </View>
            <Text style={s.disclaimerText}>
              The information provided on this website, and the products sold, are for informational and wellness purposes only. We are not a medical facility. Always consult with a healthcare professional before starting any treatment.
            </Text>
          </View>

          {/* Paragraph 1 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Agreement to Terms</Text>
            <Text style={s.bodyText}>
              By accessing and using this site, you accept and agree to be bound by the terms and provisions of this agreement. In addition, when using this site's particular services, you shall be subject to any posted guidelines or rules applicable to such services.
            </Text>
          </View>

          {/* Paragraph 2 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Intellectual Property</Text>
            <Text style={s.bodyText}>
              All materials contained on this site, including text, graphics, logos, and images are the property of Genestac and protected by applicable copyright and trademark law. Any unauthorized use of any materials on this site may violate copyright laws, trademark laws, and other communications regulations and statutes.
            </Text>
          </View>

          {/* Paragraph 3 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Limitation of Liability</Text>
            <Text style={s.bodyText}>
              Under no circumstances shall Genestac be liable for any direct, indirect, special, incidental or consequential damages, including, but not limited to, loss of data or profit, arising out of the use, or the inability to use, the materials on this site.
            </Text>
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
  disclaimerBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7F1D1D',
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
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
