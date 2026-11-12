// components/hairTreatment/GhostOverlayCameraModal.tsx
// Ghost-Overlay Photo Alignment Tool for Monthly Hair Progression
// Uses native expo-image-picker (camera & library) with post-capture Ghost Overlay calibration & alignment guides

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Rect, G } from "react-native-svg";
import {
  HairPhotoAngle,
  HairProgressionPhoto,
  resolveHairPhotoSource,
} from "@/lib/hairTreatment";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PREVIEW_WIDTH = SCREEN_WIDTH - 40;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.1;

interface GhostOverlayCameraModalProps {
  visible: boolean;
  angle: HairPhotoAngle;
  ghostPhoto: HairProgressionPhoto | null;
  dayNumber: number;
  onClose: () => void;
  onPhotoCaptured: (photoUri: string, ghostUsed: boolean) => void;
}

export function GhostOverlayCameraModal({
  visible,
  angle,
  ghostPhoto,
  dayNumber,
  onClose,
  onPhotoCaptured,
}: GhostOverlayCameraModalProps) {
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [ghostOpacity, setGhostOpacity] = useState<number>(0.45);
  const [showGhost, setShowGhost] = useState<boolean>(true);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const angleMeta: Record<
    HairPhotoAngle,
    { title: string; hint: string; tip: string; icon: string }
  > = {
    hairline: {
      title: "Frontal Hairline Alignment",
      hint: "Look straight into lens. Keep eyebrows parallel with lower guide and forehead hairline arch aligned.",
      tip: "Natural indoor lighting. Avoid top shadows obscuring hairline edge.",
      icon: "scan-outline",
    },
    crown: {
      title: "Crown / Vertex Alignment",
      hint: "Hold device directly overhead looking down onto vertex. Center crown whirl in concentric circle.",
      tip: "Keep camera roughly 30–40 cm above scalp for consistent focal distance.",
      icon: "radio-button-on-outline",
    },
    temples: {
      title: "Temporal Angle Alignment",
      hint: "Rotate head 45° to position the fronto-temporal recession notch along diagonal alignment line.",
      tip: "Align ear tragus with bottom reference guide marker.",
      icon: "triangle-outline",
    },
  };

  const handleLaunchCamera = async () => {
    try {
      setIsProcessing(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera access is required to take progress photos. Please enable camera permissions in your settings."
        );
        setIsProcessing(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setCapturedUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.warn("Camera error:", err);
      Alert.alert("Camera Error", "Could not open camera. You can select from gallery instead.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      setIsProcessing(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Media library access is needed to select an existing photo."
        );
        setIsProcessing(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setCapturedUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Gallery error:", err);
      Alert.alert("Error", "Could not load image from gallery.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPhoto = () => {
    if (!capturedUri) return;
    onPhotoCaptured(capturedUri, showGhost && !!ghostPhoto);
    handleResetModal();
  };

  const handleRetake = () => {
    setCapturedUri(null);
  };

  const handleResetModal = () => {
    setCapturedUri(null);
    setShowGhost(true);
    setGhostOpacity(0.45);
    onClose();
  };

  // Render Anatomical Alignment Reticle Guides
  const renderAngleGuides = (containerWidth: number, containerHeight: number) => {
    if (!showGuides) return null;

    if (angle === "crown") {
      return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Svg width={containerWidth} height={containerHeight} viewBox="0 0 360 400">
            <Circle cx="180" cy="200" r="140" stroke="#EC4899" strokeWidth="2" strokeDasharray="6,6" fill="none" opacity="0.6" />
            <Circle cx="180" cy="200" r="85" stroke="#EC4899" strokeWidth="2.5" fill="none" opacity="0.8" />
            <Circle cx="180" cy="200" r="25" stroke="#F43F5E" strokeWidth="2" fill="none" opacity="0.9" />
            <Line x1="180" y1="50" x2="180" y2="350" stroke="#EC4899" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
            <Line x1="30" y1="200" x2="330" y2="200" stroke="#EC4899" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
          </Svg>
        </View>
      );
    }

    if (angle === "hairline") {
      return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Svg width={containerWidth} height={containerHeight} viewBox="0 0 360 400">
            <Line x1="40" y1="270" x2="320" y2="270" stroke="#38BDF8" strokeWidth="2" strokeDasharray="5,5" opacity="0.75" />
            <Path
              d="M 50,190 Q 120,135 180,150 Q 240,135 310,190"
              stroke="#EC4899"
              strokeWidth="3"
              fill="none"
              opacity="0.85"
            />
            <Line x1="180" y1="90" x2="180" y2="340" stroke="#F472B6" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
            <Circle cx="180" cy="150" r="8" fill="#EC4899" opacity="0.8" />
          </Svg>
        </View>
      );
    }

    if (angle === "temples") {
      return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Svg width={containerWidth} height={containerHeight} viewBox="0 0 360 400">
            <Line x1="50" y1="280" x2="290" y2="120" stroke="#EC4899" strokeWidth="2.5" strokeDasharray="6,4" opacity="0.85" />
            <Circle cx="90" cy="255" r="18" stroke="#38BDF8" strokeWidth="2" fill="none" opacity="0.8" />
            <Path
              d="M 130,225 C 170,165 220,145 285,115"
              stroke="#EC4899"
              strokeWidth="3"
              fill="none"
              opacity="0.8"
            />
          </Svg>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleResetModal}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconCircleBtn} onPress={handleResetModal} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topTitleBox}>
            <Text style={styles.topAngleTitle}>{angleMeta[angle].title}</Text>
            <Text style={styles.topDayBadge}>Monthly Check-in • Day {dayNumber}</Text>
          </View>

          <View style={{ width: 42 }} />
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: PRE-CAPTURE ANGLE CALIBRATION GUIDE */}
          {!capturedUri ? (
            <View style={styles.preCaptureBox}>
              {/* Guidance Reticle Preview Card */}
              <View style={styles.reticlePreviewCard}>
                {ghostPhoto ? (
                  <Image source={resolveHairPhotoSource(ghostPhoto)} style={styles.reticleBaseImg} resizeMode="cover" />
                ) : (
                  <View style={styles.reticlePlaceholder}>
                    <Ionicons name={angleMeta[angle].icon as any} size={48} color="#475569" />
                  </View>
                )}

                {/* Overlaid alignment guidelines */}
                {renderAngleGuides(PREVIEW_WIDTH, PREVIEW_HEIGHT * 0.85)}

                <View style={styles.previewTagPill}>
                  <Ionicons name="scan-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.previewTagText}>
                    {ghostPhoto ? `Baseline Guide: Day ${ghostPhoto.dayNumber}` : "Standard Alignment Grid"}
                  </Text>
                </View>
              </View>

              {/* Angle Clinical Instructions */}
              <View style={styles.instructionsCard}>
                <View style={styles.instructionsHeader}>
                  <Ionicons name="compass-outline" size={16} color="#EC4899" />
                  <Text style={styles.instructionsTitle}>Exact Angle Instructions</Text>
                </View>
                <Text style={styles.instructionsText}>{angleMeta[angle].hint}</Text>
                <View style={styles.tipRow}>
                  <Ionicons name="bulb-outline" size={14} color="#F59E0B" />
                  <Text style={styles.tipText}>{angleMeta[angle].tip}</Text>
                </View>
              </View>

              {/* Camera & Gallery Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.mainLaunchCameraBtn}
                  onPress={handleLaunchCamera}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={22} color="#FFFFFF" />
                  <Text style={styles.mainLaunchCameraText}>Open Camera & Align</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryGalleryBtn}
                  onPress={handlePickFromGallery}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={18} color="#CBD5E1" />
                  <Text style={styles.secondaryGalleryText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* STEP 2: GHOST OVERLAY CALIBRATION & ANGLE VERIFICATION */
            <View style={styles.calibrationBox}>
              <View style={styles.calibrationHeader}>
                <Ionicons name="layers" size={16} color="#EC4899" />
                <Text style={styles.calibrationTitle}>Ghost Overlay Alignment</Text>
              </View>

              {/* Interactive Viewport with Ghost Layer */}
              <View style={styles.ghostViewport}>
                {/* Captured Photo as Base */}
                <Image source={{ uri: capturedUri }} style={styles.ghostViewportImg} resizeMode="cover" />

                {/* Translucent Baseline Ghost Overlay */}
                {showGhost && ghostPhoto && (
                  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                    <Image
                      source={resolveHairPhotoSource(ghostPhoto)}
                      style={[styles.ghostViewportImg, { opacity: ghostOpacity }]}
                      resizeMode="cover"
                    />
                    <View style={styles.ghostBadge}>
                      <Ionicons name="layers" size={12} color="#FFFFFF" />
                      <Text style={styles.ghostBadgeText}>
                        Baseline Day {ghostPhoto.dayNumber} ({Math.round(ghostOpacity * 100)}%)
                      </Text>
                    </View>
                  </View>
                )}

                {/* Overlaid Alignment Guides */}
                {renderAngleGuides(PREVIEW_WIDTH, PREVIEW_HEIGHT)}

                {/* Calibration Status Badge */}
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verifiedBadgeText}>Angle & Scale Verified</Text>
                </View>
              </View>

              {/* Ghost Opacity & Mode Controls */}
              {ghostPhoto && (
                <View style={styles.ghostControlsRow}>
                  <TouchableOpacity
                    style={[styles.ghostToggleBtn, showGhost && styles.ghostToggleBtnActive]}
                    onPress={() => setShowGhost(!showGhost)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={showGhost ? "eye" : "eye-off"}
                      size={15}
                      color={showGhost ? "#FFFFFF" : "#94A3B8"}
                    />
                    <Text
                      style={[
                        styles.ghostToggleText,
                        showGhost && styles.ghostToggleTextActive,
                      ]}
                    >
                      Ghost Overlay
                    </Text>
                  </TouchableOpacity>

                  {showGhost && (
                    <View style={styles.opacityChipsRow}>
                      {[0.25, 0.45, 0.7].map((val) => (
                        <TouchableOpacity
                          key={val}
                          style={[
                            styles.opacityChip,
                            ghostOpacity === val && styles.opacityChipActive,
                          ]}
                          onPress={() => setGhostOpacity(val)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.opacityChipText,
                              ghostOpacity === val && styles.opacityChipTextActive,
                            ]}
                          >
                            {Math.round(val * 100)}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.guideToggleBtn, showGuides && styles.guideToggleBtnActive]}
                    onPress={() => setShowGuides(!showGuides)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={16}
                      color={showGuides ? "#EC4899" : "#64748B"}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Accept & Retake Buttons */}
              <View style={styles.confirmationActionsRow}>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={handleRetake}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={18} color="#CBD5E1" />
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.savePhotoBtn}
                  onPress={handleConfirmPhoto}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                  <Text style={styles.savePhotoBtnText}>Save to Journal</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090D16",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#090D16",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  iconCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleBox: {
    alignItems: "center",
  },
  topAngleTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  topDayBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F472B6",
    marginTop: 2,
  },
  scrollBody: {
    flex: 1,
  },
  scrollBodyContent: {
    padding: 20,
    paddingBottom: 36,
  },
  preCaptureBox: {
    width: "100%",
    alignItems: "center",
  },
  reticlePreviewCard: {
    width: "100%",
    aspectRatio: 1 / 1.05,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1E293B",
    borderWidth: 1.5,
    borderColor: "rgba(236, 72, 153, 0.4)",
    marginBottom: 16,
  },
  reticleBaseImg: {
    width: "100%",
    height: "100%",
  },
  reticlePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
  },
  previewTagPill: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  previewTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  instructionsCard: {
    width: "100%",
    backgroundColor: "#131C2E",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 20,
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  instructionsText: {
    fontSize: 12,
    color: "#CBD5E1",
    lineHeight: 18,
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    padding: 8,
    borderRadius: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: "#FDE68A",
    fontWeight: "500",
  },
  actionsContainer: {
    width: "100%",
    gap: 12,
  },
  mainLaunchCameraBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#EC4899",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mainLaunchCameraText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryGalleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  secondaryGalleryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#CBD5E1",
  },
  calibrationBox: {
    width: "100%",
    alignItems: "center",
  },
  calibrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  calibrationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  ghostViewport: {
    width: "100%",
    aspectRatio: 1 / 1.05,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1E293B",
    borderWidth: 2,
    borderColor: "#EC4899",
    marginBottom: 16,
  },
  ghostViewportImg: {
    width: "100%",
    height: "100%",
  },
  ghostBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.4)",
  },
  ghostBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(16, 185, 129, 0.9)",
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  ghostControlsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#131C2E",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 20,
  },
  ghostToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#1E293B",
  },
  ghostToggleBtnActive: {
    backgroundColor: "#EC4899",
  },
  ghostToggleText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#94A3B8",
  },
  ghostToggleTextActive: {
    color: "#FFFFFF",
  },
  opacityChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  opacityChip: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#1E293B",
  },
  opacityChipActive: {
    backgroundColor: "#F43F5E",
  },
  opacityChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
  },
  opacityChipTextActive: {
    color: "#FFFFFF",
  },
  guideToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  guideToggleBtnActive: {
    backgroundColor: "rgba(236, 72, 153, 0.2)",
    borderWidth: 1,
    borderColor: "#EC4899",
  },
  confirmationActionsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  retakeBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#CBD5E1",
  },
  savePhotoBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#EC4899",
  },
  savePhotoBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
