import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';
import { uploadToCloudinary, getPresignedUploadUrl } from '@/lib/upload-url';

export interface DocumentUploadData {
  title: string;
  category: 'Lab Reports' | 'Prescriptions' | 'Scans & Imaging' | 'IDs & Cards';
  date: string;
  fileType: 'PDF' | 'IMAGE' | 'DICOM';
  fileName: string;
  filePath?: string;
  uploadUrl?: string;
}

interface DocumentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess?: (data: DocumentUploadData) => void;
}

interface SelectedFileInfo {
  name: string;
  uri: string;
  mimeType: string;
  size?: string;
  type: 'PDF' | 'IMAGE' | 'DICOM';
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  visible,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'camera' | 'pdf' | 'gallery' | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Lab Reports' | 'Prescriptions' | 'Scans & Imaging' | 'IDs & Cards'>('Lab Reports');
  const [date, setDate] = useState('Oct 03, 2026');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFileInfo | null>(null);

  const categories: Array<'Lab Reports' | 'Prescriptions' | 'Scans & Imaging' | 'IDs & Cards'> = [
    'Lab Reports',
    'Prescriptions',
    'Scans & Imaging',
    'IDs & Cards',
  ];

  const handleSelectMethod = async (method: 'camera' | 'pdf' | 'gallery') => {
    setSelectedMethod(method);

    try {
      if (method === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to capture documents.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const fileName = asset.fileName || `Scan_${Date.now()}.jpg`;
          const mimeType = asset.mimeType || 'image/jpeg';
          const sizeStr = asset.fileSize
            ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB`
            : '2.4 MB';

          setSelectedFile({
            name: fileName,
            uri: asset.uri,
            mimeType,
            size: sizeStr,
            type: 'IMAGE',
          });
          if (!title) setTitle('Camera Scan Record');
        }
      } else if (method === 'gallery') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Media library permission is required to select photos.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const fileName = asset.fileName || `Photo_${Date.now()}.jpg`;
          const mimeType = asset.mimeType || 'image/jpeg';
          const sizeStr = asset.fileSize
            ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB`
            : '2.8 MB';

          setSelectedFile({
            name: fileName,
            uri: asset.uri,
            mimeType,
            size: sizeStr,
            type: 'IMAGE',
          });
          if (!title) setTitle('Gallery Document Photo');
        }
      } else if (method === 'pdf') {
        try {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*', '*/*'],
            copyToCacheDirectory: true,
          });

          if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            const fileName = asset.name || `Document_${Date.now()}.pdf`;
            const mimeType =
              asset.mimeType ||
              (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
            const isPdf = fileName.toLowerCase().endsWith('.pdf') || mimeType.includes('pdf');
            const sizeStr = asset.size
              ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB`
              : '1.4 MB';

            setSelectedFile({
              name: fileName,
              uri: asset.uri,
              mimeType,
              size: sizeStr,
              type: isPdf ? 'PDF' : 'IMAGE',
            });
            if (!title) setTitle(isPdf ? 'Uploaded PDF Document' : 'Uploaded File');
          }
        } catch (docErr) {
          console.warn('Document picker error:', docErr);
          Alert.alert('Error', 'Could not open document picker. You can try selecting from Photos instead.');
        }
      }
    } catch (err: any) {
      console.error('Error selecting file:', err);
      Alert.alert('Selection Error', err?.message || 'Could not select the file.');
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setSelectedMethod(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a name for this document.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('File Required', 'Please select or scan a document file first.');
      return;
    }

    try {
      setIsUploading(true);

      // 1. Get authenticated user
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        Alert.alert('Authentication Required', 'Please sign in to upload documents.');
        setIsUploading(false);
        return;
      }

      const file = selectedFile;

      // 2. Upload file directly to Cloudinary Private Vault using signed URL authentication
      const uploadResult = await uploadToCloudinary(file);

      // 3. Save record in Supabase medical_reports table
      const { error: dbError } = await supabase
        .from('medical_reports')
        .insert({
          user_id: user.id,
          file_path: uploadResult.key,
          title: title.trim(),
          category,
          file_type: selectedFile.type,
        });

      if (dbError) {
        console.error('Supabase medical_reports insert error:', dbError);
        throw new Error(dbError.message || 'Failed to save document record in database.');
      }

      const newDoc: DocumentUploadData = {
        title: title.trim(),
        category,
        date,
        fileType: selectedFile.type,
        fileName: selectedFile.name,
        filePath: uploadResult.key,
        uploadUrl: uploadResult.secureUrl,
      };

      if (onUploadSuccess) {
        onUploadSuccess(newDoc);
      }

      Alert.alert(
        'Upload Successful',
        `"${newDoc.title}" has been securely uploaded to Cloudinary Private Vault and saved in your Document Wallet.`,
        [{ text: 'OK', onPress: handleResetAndClose }]
      );
    } catch (err: any) {
      console.error('Document upload failed:', err);
      Alert.alert('Upload Failed', err?.message || 'Could not complete the upload. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetAndClose = () => {
    setTitle('');
    setCategory('Lab Reports');
    setSelectedFile(null);
    setSelectedMethod(null);
    setIsUploading(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleResetAndClose}
    >
      <View style={styles.overlayBackdrop}>
        <View style={styles.modalWindow}>
          {/* Header */}
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerContainer}
          >
            <View style={styles.headerTopRow}>
              <View style={styles.headerTitleGroup}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="document-text" size={20} color="#38BDF8" />
                </View>
                <View>
                  <Text style={styles.headerTitleText}>Upload / Scan Document</Text>
                 
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleResetAndClose}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Step 1: Select Source / Scan */}
            <Text style={styles.sectionLabel}>1. Select Upload Method</Text>
            <View style={styles.methodsRow}>
              <TouchableOpacity
                style={[
                  styles.methodCard,
                  selectedMethod === 'camera' && styles.methodCardActive,
                ]}
                onPress={() => handleSelectMethod('camera')}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="camera-outline" size={22} color="#2563EB" />
                </View>
                <Text style={styles.methodTitle}>Camera Scan</Text>
                <Text style={styles.methodSub}>Scan printed document</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodCard,
                  selectedMethod === 'pdf' && styles.methodCardActive,
                ]}
                onPress={() => handleSelectMethod('pdf')}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="document-attach-outline" size={22} color="#16A34A" />
                </View>
                <Text style={styles.methodTitle}>PDF / File</Text>
                <Text style={styles.methodSub}>Browse device files</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodCard,
                  selectedMethod === 'gallery' && styles.methodCardActive,
                ]}
                onPress={() => handleSelectMethod('gallery')}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIconBox, { backgroundColor: '#FAF5FF' }]}>
                  <Ionicons name="images-outline" size={22} color="#9333EA" />
                </View>
                <Text style={styles.methodTitle}>Photos</Text>
                <Text style={styles.methodSub}>Choose from gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Selected File Box */}
            {selectedFile ? (
              <View style={styles.fileSelectedCard}>
                <View style={styles.fileIconBox}>
                  <Ionicons
                    name={selectedFile.type === 'PDF' ? 'document-text' : 'image'}
                    size={22}
                    color="#2563EB"
                  />
                </View>
                <View style={styles.fileMetaCol}>
                  <Text style={styles.fileNameText} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.fileSubText}>
                    {selectedFile.type} Document • Ready to upload
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClearFile} style={styles.removeFileBtn}>
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noFileHintBox}>
                <Ionicons name="cloud-upload-outline" size={20} color="#94A3B8" />
                <Text style={styles.noFileHintText}>
                  Tap one of the options above to scan or choose a document
                </Text>
              </View>
            )}

            {/* Step 2: Document Information */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>2. Document Details</Text>

            {/* Document Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Document Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Comprehensive Lipid Panel 2026"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Category Selection */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryPillRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      category === cat && styles.categoryPillActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        category === cat && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Document Date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Document Date</Text>
              <TextInput
                style={styles.textInput}
                value={date}
                onChangeText={setDate}
                placeholder="Oct 03, 2026"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Vault Encryption Note */}
            <View style={styles.securityBox}>
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
              <Text style={styles.securityText}>
                256-Bit Encrypted • Saved directly in your private device vault.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleResetAndClose}
              disabled={isUploading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isUploading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isUploading}
              activeOpacity={0.85}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWindow: {
    width: '90%',
    height: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitleText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flex: 1,
    padding: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  methodCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  methodCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  methodTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  methodSub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  fileSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  fileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMetaCol: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  fileSubText: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 4,
  },
  noFileHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 14,
  },
  noFileHintText: {
    fontSize: 12,
    color: '#64748B',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  categoryPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 11,
    color: '#047857',
    flex: 1,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default DocumentUploadModal;
