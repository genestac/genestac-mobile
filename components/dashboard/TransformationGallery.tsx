import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WeightLog } from "@/lib/types";

interface TransformationGalleryProps {
  history: WeightLog[];
  startWeight: number;
  sampleImages?: string[];
  formatDateShort: (dateStr?: string) => string;
}

const DEFAULT_SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
];

export const TransformationGallery: React.FC<TransformationGalleryProps> = ({
  history,
  startWeight,
  sampleImages = DEFAULT_SAMPLE_IMAGES,
  formatDateShort,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<{
    entry: WeightLog;
    imgUri: string;
    diff: string;
    isLoss: boolean;
  } | null>(null);

  const validHistory = (history || []).filter(
    (e) => typeof e?.weight === "number" && e.weight > 0
  );

  const fallbackImages =
    sampleImages && sampleImages.length > 0
      ? sampleImages
      : DEFAULT_SAMPLE_IMAGES;

  const baseStart =
    startWeight > 0 ? startWeight : (validHistory[0]?.weight ?? 0);

  return (
    <View style={styles.galleryMainCard}>
      {/* Header Row with Total Photos Counter */}
      <View style={styles.galleryCardHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="images" size={16} color="#0A8554" />
          </View>
          <Text style={styles.cardHeaderTitle}>Transformation Gallery</Text>
        </View>

        {validHistory.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {validHistory.length} {validHistory.length === 1 ? "Photo" : "Photos"}
            </Text>
          </View>
        )}
      </View>

      {/* Horizontal Scroll Gallery displaying history items */}
      {validHistory.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, marginTop: 12, paddingRight: 4 }}
        >
          {validHistory.map((entry, idx) => {
            const rawDiff = baseStart > 0 ? baseStart - entry.weight : 0;
            const isLoss = rawDiff >= 0;
            const diffStr = Math.abs(rawDiff).toFixed(1);
            const badgeText =
              rawDiff === 0
                ? "0.0 kg"
                : `${isLoss ? "-" : "+"}${diffStr} kg`;

            const imgUri =
              entry.image_url ||
              fallbackImages[idx % fallbackImages.length];

            return (
              <TouchableOpacity
                key={entry.date || idx}
                style={styles.galleryPortraitCard}
                onPress={() =>
                  setSelectedEntry({
                    entry,
                    imgUri,
                    diff: diffStr,
                    isLoss,
                  })
                }
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: imgUri }}
                  style={styles.galleryPortraitImg}
                  resizeMode="cover"
                />
                <Text style={styles.galleryPortraitWeight}>
                  {entry.weight} kg
                </Text>
                <Text style={styles.galleryPortraitDate}>
                  {formatDateShort(entry.date)}
                </Text>
                <View
                  style={[
                    styles.galleryBadgeGreen,
                    !isLoss && styles.galleryBadgeRed,
                  ]}
                >
                  <Text
                    style={[
                      styles.galleryBadgeGreenText,
                      !isLoss && styles.galleryBadgeRedText,
                    ]}
                  >
                    {badgeText}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyGalleryBox}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="camera-outline" size={24} color="#0A8554" />
          </View>
          <Text style={styles.emptyGalleryText}>No progress photos logged yet.</Text>
          <Text style={styles.emptyGallerySub}>
            Log your weight with a progress photo to build your transformation timeline!
          </Text>
        </View>
      )}

      {/* Full-Screen Photo Preview Modal */}
      {selectedEntry && (
        <Modal
          visible={!!selectedEntry}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedEntry(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedEntry(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>

              <Image
                source={{ uri: selectedEntry.imgUri }}
                style={styles.modalPreviewImg}
                resizeMode="cover"
              />

              <View style={styles.modalInfoBox}>
                <View style={styles.modalInfoRow}>
                  <View>
                    <Text style={styles.modalDateText}>
                      {formatDateShort(selectedEntry.entry.date)}
                    </Text>
                    <Text style={styles.modalWeightText}>
                      {selectedEntry.entry.weight} kg
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.modalBadgeGreen,
                      !selectedEntry.isLoss && styles.modalBadgeRed,
                    ]}
                  >
                    <Ionicons
                      name={
                        selectedEntry.isLoss ? "trending-down" : "trending-up"
                      }
                      size={14}
                      color={selectedEntry.isLoss ? "#059669" : "#DC2626"}
                    />
                    <Text
                      style={[
                        styles.modalBadgeGreenText,
                        !selectedEntry.isLoss && styles.modalBadgeRedText,
                      ]}
                    >
                      {selectedEntry.diff === "0.0"
                        ? "Initial Weight"
                        : `${selectedEntry.diff} kg ${
                            selectedEntry.isLoss ? "lost" : "gained"
                          }`}
                    </Text>
                  </View>
                </View>

                {selectedEntry.entry.note ? (
                  <View style={styles.modalNoteBox}>
                    <Ionicons
                      name="document-text-outline"
                      size={14}
                      color="#64748B"
                    />
                    <Text style={styles.modalNoteText}>
                      {selectedEntry.entry.note}
                    </Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setSelectedEntry(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalDoneBtnText}>Close Preview</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  galleryMainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  galleryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  countBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0A8554",
  },
  galleryPortraitCard: {
    width: 108,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  galleryPortraitImg: {
    width: "100%",
    height: 100,
    borderRadius: 12,
    marginBottom: 6,
  },
  galleryPortraitWeight: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  galleryPortraitDate: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  galleryBadgeGreen: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  galleryBadgeGreenText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0A8554",
  },
  galleryBadgeRed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  galleryBadgeRedText: {
    color: "#DC2626",
  },
  emptyGalleryBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyGalleryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  emptyGallerySub: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 16,
  },
  /* Modal Preview Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalCloseBtn: {
    alignSelf: "flex-end",
    padding: 4,
    marginBottom: 8,
  },
  modalPreviewImg: {
    width: "100%",
    height: 260,
    borderRadius: 14,
    marginBottom: 14,
  },
  modalInfoBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    gap: 8,
  },
  modalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalDateText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  modalWeightText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalBadgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  modalBadgeGreenText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0A8554",
  },
  modalBadgeRed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  modalBadgeRedText: {
    color: "#DC2626",
  },
  modalNoteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalNoteText: {
    fontSize: 12,
    color: "#334155",
    flex: 1,
  },
  modalDoneBtn: {
    width: "100%",
    backgroundColor: "#0A8554",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalDoneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default TransformationGallery;
