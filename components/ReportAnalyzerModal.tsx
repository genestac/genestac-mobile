import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { analyzeLabReport, LabReportAnalysisResult, Biomarker } from '@/lib/openai';

// Safe optional import for native ExpoDocumentPicker module
let DocumentPickerModule: typeof import('expo-document-picker') | null = null;
try {
  DocumentPickerModule = require('expo-document-picker');
} catch (e) {
  console.warn('[ReportAnalyzerModal] ExpoDocumentPicker native module not linked in current build bundle, using ImagePicker fallback.');
}

interface ReportAnalyzerModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestDoctorReview?: (conditionText: string) => Promise<void>;
}

export const ReportAnalyzerModal: React.FC<ReportAnalyzerModalProps> = ({
  visible,
  onClose,
  onRequestDoctorReview,
}) => {
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string>('image/jpeg');
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LabReportAnalysisResult | null>(null);
  const [submittingDoctor, setSubmittingDoctor] = useState(false);

  const resetState = () => {
    setSelectedUri(null);
    setSelectedFileName(null);
    setSelectedMimeType('image/jpeg');
    setBase64Data(null);
    setLoading(false);
    setResult(null);
    setSubmittingDoctor(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // 1. Pick ANY File/Document (PDF, DOCX, Images, etc.) with graceful fallback
  const handlePickFile = async () => {
    try {
      if (DocumentPickerModule && typeof DocumentPickerModule.getDocumentAsync === 'function') {
        const docResult = await DocumentPickerModule.getDocumentAsync({
          type: ['application/pdf', 'image/*', '*/*'],
          copyToCacheDirectory: true,
        });

        if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
          const asset = docResult.assets[0];
          const uri = asset.uri;
          const name = asset.name || 'Lab_Report';
          const mime = asset.mimeType || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

          setSelectedUri(uri);
          setSelectedFileName(name);
          setSelectedMimeType(mime);

          // Convert file to Base64 string for processing
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setBase64Data(b64);
          return;
        }
      }

      // Fallback: Pick image from gallery if native DocumentPicker module is not linked in active binary
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Media library permission is required to upload files.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        setSelectedUri(asset.uri);
        setSelectedFileName(asset.fileName || 'Lab_Report_Image.jpg');
        setSelectedMimeType(asset.mimeType || 'image/jpeg');
        if (asset.base64) {
          setBase64Data(asset.base64);
        } else {
          const b64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setBase64Data(b64);
        }
      }
    } catch (err) {
      console.error('Error picking document/file:', err);
      Alert.alert('File Selection Error', 'Could not open document picker. Please try again.');
    }
  };

  // 2. Take Photo using Camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to capture lab reports.');
        return;
      }

      const cameraResult = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        base64: true,
      });

      if (!cameraResult.canceled && cameraResult.assets && cameraResult.assets.length > 0) {
        const asset = cameraResult.assets[0];
        setSelectedUri(asset.uri);
        setSelectedFileName('Lab_Camera_Scan.jpg');
        setSelectedMimeType(asset.mimeType || 'image/jpeg');

        if (asset.base64) {
          setBase64Data(asset.base64);
        } else {
          const b64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setBase64Data(b64);
        }
      }
    } catch (err) {
      console.error('Error opening camera:', err);
      Alert.alert('Camera Error', 'Could not access camera. Please try again.');
    }
  };

  // 3. Analyze document with AI Triage Engine
  const handleAnalyze = async () => {
    if (!base64Data && !selectedUri) {
      Alert.alert('No Document Selected', 'Please select a file or take a camera photo first.');
      return;
    }

    setLoading(true);
    try {
      const b64 = base64Data || '';
      const analysis = await analyzeLabReport(b64, selectedMimeType, selectedFileName || undefined);
      setResult(analysis);
    } catch (err) {
      console.error('Error analyzing report:', err);
      Alert.alert('Analysis Failed', 'Could not complete AI triage. Please ensure document content is legible.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Send for Doctor Review
  const handleRequestDoctor = async () => {
    if (!onRequestDoctorReview || !result) return;
    setSubmittingDoctor(true);
    try {
      const conditionText = `Lab Report Analysis Triage (${result.triageBadge}): ${result.summary}`;
      await onRequestDoctorReview(conditionText);
      Alert.alert(
        'Review Requested',
        'Your lab report analysis and condition notes have been sent to your care team doctor for clinical review.'
      );
    } catch (err) {
      console.error('Failed to submit doctor review request:', err);
      Alert.alert('Error', 'Could not send request to doctor. Please try again.');
    } finally {
      setSubmittingDoctor(false);
    }
  };

  const getTriageColors = (triage?: 'routine' | 'doctor_review' | 'urgent') => {
    switch (triage) {
      case 'routine':
        return {
          bg: '#ECFDF5',
          border: '#A7F3D0',
          text: '#065F46',
          badgeBg: '#D1FAE5',
          iconName: 'checkmark-circle' as const,
          iconColor: '#059669',
        };
      case 'urgent':
        return {
          bg: '#FEF2F2',
          border: '#FCA5A5',
          text: '#991B1B',
          badgeBg: '#FEE2E2',
          iconName: 'alert-circle' as const,
          iconColor: '#DC2626',
        };
      case 'doctor_review':
      default:
        return {
          bg: '#FFFBEB',
          border: '#FDE68A',
          text: '#92400E',
          badgeBg: '#FEF3C7',
          iconName: 'warning' as const,
          iconColor: '#D97706',
        };
    }
  };

  const getBiomarkerStatusColor = (status: Biomarker['status']) => {
    switch (status) {
      case 'normal':
        return { bg: '#E6F4EA', text: '#137333', label: 'NORMAL' };
      case 'high':
        return { bg: '#FCE8E6', text: '#C5221F', label: 'HIGH' };
      case 'low':
        return { bg: '#FEF7E0', text: '#B06000', label: 'LOW' };
      case 'critical':
        return { bg: '#FAD2CF', text: '#A50E0E', label: 'CRITICAL' };
      default:
        return { bg: '#F1F3F4', text: '#3C4043', label: status };
    }
  };

  const isImageFile = selectedMimeType.startsWith('image/') || (selectedFileName && /\.(jpg|jpeg|png|webp|gif)$/i.test(selectedFileName));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconRing}>
                <Ionicons name="sparkles" size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.modalTitle}>AI Lab Report Analyzer</Text>
                <Text style={styles.modalSubtitle}>Supervised Clinical Triage & Biomarkers</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 24 }}>
            {!result ? (
              // ── UPLOAD / CAMERA SELECTION VIEW ─────────────────────────
              <View style={styles.uploadStepContainer}>
                <Text style={styles.stepInstruction}>
                  Upload document files (PDF, images, reports) or take a photo of your lab test to extract biomarkers and calculate AI safety triage.
                </Text>

                {/* Selected File / Document Preview */}
                {selectedUri ? (
                  <View style={styles.previewContainer}>
                    {isImageFile ? (
                      <Image source={{ uri: selectedUri }} style={styles.previewImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.documentCardPreview}>
                        <View style={styles.docIconCircle}>
                          <Ionicons name="document-text" size={36} color="#2563EB" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docFileNameText} numberOfLines={1}>
                            {selectedFileName || 'Uploaded Document'}
                          </Text>
                          <Text style={styles.docMimeText}>
                            {selectedMimeType.toUpperCase()} File · Ready for AI Scan
                          </Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={22} color="#059669" />
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.changeImageBtn}
                      onPress={() => {
                        setSelectedUri(null);
                        setSelectedFileName(null);
                        setBase64Data(null);
                      }}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.changeImageBtnText}>Change File</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.sourceCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                      onPress={handleTakePhoto}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.sourceIconCircle, { backgroundColor: '#DBEAFE' }]}>
                        <Ionicons name="camera" size={26} color="#2563EB" />
                      </View>
                      <Text style={styles.sourceCardTitle}>Take Photo</Text>
                      <Text style={styles.sourceCardSub}>Use camera scan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.sourceCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                      onPress={handlePickFile}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.sourceIconCircle, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="folder-open" size={26} color="#16A34A" />
                      </View>
                      <Text style={styles.sourceCardTitle}>Upload Files</Text>
                      <Text style={styles.sourceCardSub}>PDF, Images & Docs</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Analyze Action Button */}
                <TouchableOpacity
                  style={[
                    styles.analyzeActionBtn,
                    (!selectedUri || loading) && styles.disabledBtn,
                  ]}
                  onPress={handleAnalyze}
                  disabled={!selectedUri || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.analyzeBtnText}>Analyzing Biomarkers & Triage...</Text>
                    </View>
                  ) : (
                    <View style={styles.loadingRow}>
                      <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                      <Text style={styles.analyzeBtnText}>Analyze Report with AI</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // ── ANALYSIS RESULTS & CLINICAL TRIAGE VIEW ───────────────────
              <View style={styles.resultsContainer}>
                {/* 1. Triage Banner */}
                {(() => {
                  const colors = getTriageColors(result.triage);
                  return (
                    <View style={[styles.triageBanner, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <View style={styles.triageBadgeHeader}>
                        <Ionicons name={colors.iconName} size={24} color={colors.iconColor} />
                        <Text style={[styles.triageTitleText, { color: colors.text }]}>
                          {result.triageBadge}
                        </Text>
                      </View>
                      <Text style={[styles.triageDescText, { color: colors.text }]}>
                        {result.triageDescription}
                      </Text>
                    </View>
                  );
                })()}

                {/* 2. Executive Summary */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Lab Summary</Text>
                  <Text style={styles.summaryBodyText}>{result.summary}</Text>
                </View>

                {/* 3. Extracted Biomarkers Table */}
                <View style={styles.sectionCard}>
                  <View style={styles.biomarkerHeaderRow}>
                    <Text style={styles.sectionTitle}>Extracted Key Biomarkers</Text>
                    <Text style={styles.biomarkerCountTag}>{result.biomarkers.length} Markers</Text>
                  </View>

                  <View style={styles.biomarkersList}>
                    {result.biomarkers.map((b, idx) => {
                      const st = getBiomarkerStatusColor(b.status);
                      return (
                        <View key={idx} style={styles.biomarkerRowCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.markerName}>{b.name}</Text>
                            <Text style={styles.markerRefText}>Normal: {b.normalRange}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.markerValue}>
                              {b.value} <Text style={styles.markerUnit}>{b.unit}</Text>
                            </Text>
                            <View style={[styles.markerStatusPill, { backgroundColor: st.bg }]}>
                              <Text style={[styles.markerStatusText, { color: st.text }]}>{st.label}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* 4. Recommendations */}
                {result.keyRecommendations && result.keyRecommendations.length > 0 && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Recommended Next Steps</Text>
                    <View style={{ gap: 8, marginTop: 8 }}>
                      {result.keyRecommendations.map((rec, idx) => (
                        <View key={idx} style={styles.recommendationRow}>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                          <Text style={styles.recommendationText}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 5. Doctor Review Option */}
                {onRequestDoctorReview && (
                  <TouchableOpacity
                    style={styles.doctorReviewBtn}
                    onPress={handleRequestDoctor}
                    disabled={submittingDoctor}
                    activeOpacity={0.8}
                  >
                    {submittingDoctor ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="medical" size={18} color="#FFFFFF" />
                        <Text style={styles.doctorReviewBtnText}>Send Analysis to Doctor for Review</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.reanalyzeBtn}
                  onPress={resetState}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back-outline" size={16} color="#475569" />
                  <Text style={styles.reanalyzeBtnText}>Analyze Another Report</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    marginTop: 14,
  },
  uploadStepContainer: {
    paddingVertical: 10,
  },
  stepInstruction: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  sourceCard: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  sourceCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sourceCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#F1F5F9',
  },
  documentCardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  docIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docFileNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  docMimeText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  changeImageBtn: {
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeImageBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  analyzeActionBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyzeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // ── Results styles ──
  resultsContainer: {
    gap: 14,
  },
  triageBanner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  triageBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  triageTitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  triageDescText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  summaryBodyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginTop: 6,
  },
  biomarkerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  biomarkerCountTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  biomarkersList: {
    gap: 8,
    marginTop: 10,
  },
  biomarkerRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  markerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  markerRefText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  markerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  markerUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  markerStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  markerStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  recommendationText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    lineHeight: 18,
  },
  doctorReviewBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  doctorReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  reanalyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  reanalyzeBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ReportAnalyzerModal;
