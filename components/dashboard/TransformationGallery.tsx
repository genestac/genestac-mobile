import React from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
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
  return (
    <View style={styles.galleryMainCard}>
      <View style={styles.galleryCardHeader}>
        <Ionicons name="images-outline" size={16} color="#2563EB" />
        <Text style={styles.cardHeaderTitle}>My Transformation Gallery</Text>
      </View>
      {history && history.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, marginTop: 8 }}
        >
          {history.slice(-5).map((entry, idx) => {
            const diff = startWeight > 0 ? (startWeight - entry.weight).toFixed(1) : "0.0";
            const imgUri =
              entry.image_url ||
              sampleImages[idx % sampleImages.length];
            return (
              <View key={idx} style={styles.galleryPortraitCard}>
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
                  <Text style={styles.galleryBadgeGreenText}>
                    -{diff} kg
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyGalleryBox}>
          <Text style={styles.emptyGalleryText}>No progress photos logged yet.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyGalleryBox: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyGalleryText: {
    fontSize: 12,
    color: "#94A3B8",
  },
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
    gap: 6,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
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
});

export default TransformationGallery;
