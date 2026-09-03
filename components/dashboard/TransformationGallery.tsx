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
  sampleImages: string[];
  formatDateShort: (dateStr: string) => string;
}

export const TransformationGallery: React.FC<TransformationGalleryProps> = ({
  history,
  startWeight,
  sampleImages,
  formatDateShort,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<{
    entry: WeightLog;
    imgUri: string;
    diff: string;
  } | null>(null);

  const validHistory = history || [];

  return (
    <View style={styles.galleryMainCard}>
      {/* Header Row with Total Photos Counter */}
      <View style={styles.galleryCardHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="images-outline" size={16} color="#2563EB" />
          <Text style={styles.cardHeaderTitle}>My Transformation Gallery</Text>
        </View>

        {validHistory.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {validHistory.length} {validHistory.length === 1 ? "Photo" : "Photos"}
            </Text>
          </View>
        )}
      </View>

      {/* Horizontal Scroll Gallery displaying ALL history items */}
      {validHistory.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, marginTop: 8, paddingRight: 8 }}
        >
          {validHistory.map((entry, idx) => {
            const diff =
              startWeight > 0 ? (startWeight - entry.weight).toFixed(1) : "0.0";
            const imgUri =
              entry.image_url || sampleImages[idx % sampleImages.length];

            return (
              <TouchableOpacity
                key={idx}
                style={styles.galleryPortraitCard}
                onPress={() => setSelectedEntry({ entry, imgUri, diff })}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: imgUri }}
                  style={styles.galleryPortraitImg}
                  resizeMode="cover"
                />
                <Text style={styles.galleryPortraitWeight}>{entry.weight} kg</Text>
                <Text style={styles.galleryPortraitDate}>
                  {formatDateShort(entry.date)}
                </Text>
                <View style={styles.galleryBadgeGreen}>
                  <Text style={styles.galleryBadgeGreenText}>-{diff} kg</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyGalleryBox}>
          <Ionicons name="camera-outline" size={24} color="#94A3B8" />
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

                  <View style={styles.modalBadgeGreen}>
                    <Ionicons name="trending-down" size={14} color="#059669" />
                    <Text style={styles.modalBadgeGreenText}>
                      -{selectedEntry.diff} kg lost
                    </Text>
                  </View>
                </View>

                {selectedEntry.entry.note ? (
                  <View style={styles.modalNoteBox}>
                    <Ionicons name="document-text-outline" size={14} color="#64748B" />
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
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  galleryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  countBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  galleryPortraitCard: {
    width: 100,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  galleryPortraitImg: {
    width: "100%",
    height: 90,
    borderRadius: 6,
    marginBottom: 4,
  },
  galleryPortraitWeight: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  galleryPortraitDate: {
    fontSize: 10,
    color: "#64748B",
  },
  galleryBadgeGreen: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  galleryBadgeGreenText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  emptyGalleryBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  emptyGalleryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  emptyGallerySub: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
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
    borderRadius: 16,
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
    borderRadius: 12,
    marginBottom: 14,
  },
  modalInfoBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
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
    color: "#1E293B",
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
    color: "#059669",
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
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalDoneBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default TransformationGallery;
