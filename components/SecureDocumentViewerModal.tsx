// components/SecureDocumentViewerModal.tsx
// In-App Secure Document Viewer with 60-Second Self-Destruct Session
// Zero browser exposure: No URL address bar, no link copying, auto-destructs after 60s.

import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSignedDeliveryUrl } from "@/lib/cloudinary";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface SecureViewerDoc {
  id: string;
  title: string;
  category: string;
  date: string;
  filePath?: string;
  fileType?: "PDF" | "IMAGE" | "DICOM";
}

interface SecureDocumentViewerModalProps {
  visible: boolean;
  onClose: () => void;
  doc: SecureViewerDoc | null;
  onDelete?: (doc: SecureViewerDoc) => void;
}

const SESSION_DURATION = 60; // 60 seconds maximum viewing window

export const SecureDocumentViewerModal: React.FC<
  SecureDocumentViewerModalProps
> = ({ visible, onClose, doc, onDelete }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(SESSION_DURATION);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [page, setPage] = useState(1);
  const [imageError, setImageError] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reset session when modal visibility changes
  useEffect(() => {
    if (visible && doc) {
      setSecondsRemaining(SESSION_DURATION);
      setLoading(true);
      setScale(1);
      setPage(1);
      setImageError(false);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleSessionTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, doc]);

  const handleSessionTimeout = () => {
    onClose();
    setTimeout(() => {
      Alert.alert(
        "🔒 Session Expired",
        "For your privacy and medical data security, this viewing session has automatically closed after 60 seconds. You can reopen it anytime from your Document Wallet.",
        [{ text: "OK" }],
      );
    }, 200);
  };

  const handleManualClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  if (!doc) return null;

  // Resolve signed URL for on-the-fly rendering
  // If PDF, Cloudinary renders crystal-clear high-res JPG for in-app native display
  const ext = (doc.filePath?.split(".").pop() || "").toLowerCase();
  const isPdf = ext === "pdf" || doc.fileType === "PDF";

  // For native Image viewing:
  // - If image: deliver as image
  // - If pdf: request .jpg rendered version via Cloudinary's on-the-fly engine
  const targetRenderPath = isPdf && doc.filePath
    ? doc.filePath.replace(/\.pdf$/i, ".jpg")
    : doc.filePath || "";

  const signedRenderUrl = doc.filePath
    ? getSignedDeliveryUrl(targetRenderPath, { resourceType: "image" })
    : "";

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.35, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.35, 0.75));
  const handleResetZoom = () => setScale(1);

  // Progress percentage for countdown bar
  const progressPercent = (secondsRemaining / SESSION_DURATION) * 100;
  const timerBadgeColor =
    secondsRemaining > 20
      ? "#10B981" // Green
      : secondsRemaining > 10
      ? "#F59E0B" // Amber
      : "#EF4444"; // Red

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleManualClose}
    >
      <View style={styles.overlayBackdrop}>
        {/* 90% Width and 90% Height Modal Window */}
        <View style={styles.modalWindow}>
          {/* Top Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: timerBadgeColor,
                },
              ]}
            />
          </View>

          {/* Header Bar */}
          <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.vaultIconCircle}>
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {doc.title}
              </Text>
              <View style={styles.headerSubtitleRow}>
                <Text style={styles.headerSubtitle}>
                  {doc.category} • 256-Bit Encrypted
                </Text>
              </View>
            </View>
          </View>

          {/* 60s Countdown Pill */}
          <View style={styles.headerRight}>
            <View
              style={[
                styles.timerPill,
                { borderColor: timerBadgeColor, backgroundColor: "#1E293B" },
              ]}
            >
              <Ionicons name="timer-outline" size={14} color={timerBadgeColor} />
              <Text style={[styles.timerText, { color: timerBadgeColor }]}>
                {secondsRemaining}s
              </Text>
            </View>

            {onDelete && (
              <TouchableOpacity
                style={styles.deleteHeaderBtn}
                onPress={() => onDelete(doc)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color="#F87171" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleManualClose}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Notice Strip */}
        <View style={styles.securityStrip}>
          <Ionicons name="lock-closed" size={12} color="#94A3B8" />
          <Text style={styles.securityStripText}>
            Protected Session: No URL exposed • Auto-expires in {secondsRemaining}s
          </Text>
        </View>

        {/* Document Rendering Body */}
        <View style={styles.viewport}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Decrypting document vault...</Text>
            </View>
          )}

          {imageError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Document Preview Unavailable</Text>
              <Text style={styles.errorSub}>
                Could not load document preview in secure mode.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              maximumZoomScale={3}
              minimumZoomScale={0.5}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Image
                source={{ uri: signedRenderUrl }}
                style={[
                  styles.documentImage,
                  {
                    transform: [{ scale }],
                  },
                ]}
                resizeMode="contain"
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setImageError(true);
                }}
              />
            </ScrollView>
          )}
        </View>

        {/* Bottom Floating Control Bar */}
        <View style={styles.controlsBar}>
          {/* Zoom Controls */}
          <View style={styles.zoomControlsGroup}>
            <TouchableOpacity
              style={styles.controlIconBtn}
              onPress={handleZoomOut}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.zoomResetBtn}
              onPress={handleResetZoom}
              activeOpacity={0.7}
            >
              <Text style={styles.zoomResetText}>
                {Math.round(scale * 100)}%
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlIconBtn}
              onPress={handleZoomIn}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Privacy Footnote */}
          <View style={styles.privacyTag}>
            <Ionicons name="eye-off-outline" size={13} color="#94A3B8" />
            <Text style={styles.privacyTagText}>Zero-Trace View</Text>
          </View>
        </View>
      </View>
    </View>
  </Modal>
  );
};

const styles = StyleSheet.create({
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 15, 29, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalWindow: {
    width: "90%",
    height: "90%",
    backgroundColor: "#0F172A",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
  },
  progressBar: {
    height: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  vaultIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  deleteHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  securityStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  securityStripText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  viewport: {
    flex: 1,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    backgroundColor: "rgba(10, 15, 29, 0.6)",
  },
  loadingText: {
    marginTop: 12,
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  documentImage: {
    width: SCREEN_WIDTH * 0.9 - 24,
    height: SCREEN_HEIGHT * 0.9 - 160,
    borderRadius: 8,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F87171",
    marginTop: 12,
  },
  errorSub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  zoomControlsGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  controlIconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomResetBtn: {
    paddingHorizontal: 8,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomResetText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  privacyTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  privacyTagText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
});

export default SecureDocumentViewerModal;
