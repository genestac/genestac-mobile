// components/hairTreatment/HairProgressionPhotoJournalCard.tsx
// Hair Progression Photo Journal with Interactive Before / After Split Slider & Ghost Overlay Camera Trigger

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  Modal,
  Alert,
  ScrollView,
  LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  HairPhotoAngle,
  HairProgressionPhoto,
  getComparisonPhotos,
  getPhotosByAngle,
  calculateTreatmentDays,
  resolveHairPhotoSource,
} from "@/lib/hairTreatment";
import { GhostOverlayCameraModal } from "./GhostOverlayCameraModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Default safe fallback width: screen width minus card horizontal margins (32) and card padding (32)
const DEFAULT_SLIDER_WIDTH = Math.max(280, SCREEN_WIDTH - 64);
const SLIDER_HEIGHT = 280;

interface HairProgressionPhotoJournalCardProps {
  photos: HairProgressionPhoto[];
  treatmentStartDate: string;
  onAddPhoto: (newPhoto: HairProgressionPhoto) => void;
  onDeletePhoto?: (photoId: string) => void;
}

export function HairProgressionPhotoJournalCard({
  photos,
  treatmentStartDate,
  onAddPhoto,
  onDeletePhoto,
}: HairProgressionPhotoJournalCardProps) {
  const [selectedAngle, setSelectedAngle] = useState<HairPhotoAngle>("hairline");
  const [targetComparisonDay, setTargetComparisonDay] = useState<number>(90);
  const [containerWidth, setContainerWidth] = useState<number>(DEFAULT_SLIDER_WIDTH);
  const [sliderPos, setSliderPos] = useState<number>(DEFAULT_SLIDER_WIDTH * 0.5);
  const [isCameraModalVisible, setIsCameraModalVisible] = useState<boolean>(false);
  const [inspectPhoto, setInspectPhoto] = useState<HairProgressionPhoto | null>(null);

  const sliderRef = useRef<View | null>(null);
  const sliderPageX = useRef<number>(32); // Fallback: card margin (16) + card padding (16)

  const daysElapsed = calculateTreatmentDays(treatmentStartDate);
  const comparison = getComparisonPhotos(photos, selectedAngle, 1, targetComparisonDay);
  const anglePhotos = getPhotosByAngle(photos, selectedAngle);

  const handleSliderLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
      setSliderPos(width * 0.5);
    }
    // Measure absolute pageX for 100% accurate horizontal touch tracking
    sliderRef.current?.measure((x, y, w, h, pageX, pageY) => {
      if (typeof pageX === "number" && !isNaN(pageX) && pageX > 0) {
        sliderPageX.current = pageX;
      }
    });
  };

  const updateSliderFromTouch = (screenX: number) => {
    const touchX = screenX - sliderPageX.current;
    const clampedX = Math.max(20, Math.min(containerWidth - 20, touchX));
    setSliderPos(clampedX);
  };

  // PanResponder for smooth interactive dragging of Before/After split line
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        sliderRef.current?.measure((x, y, w, h, pageX, pageY) => {
          if (typeof pageX === "number" && !isNaN(pageX) && pageX > 0) {
            sliderPageX.current = pageX;
          }
        });
        updateSliderFromTouch(gestureState.x0);
      },
      onPanResponderMove: (_, gestureState) => {
        updateSliderFromTouch(gestureState.moveX);
      },
    })
  ).current;

  const angleOptions: { id: HairPhotoAngle; label: string; icon: string }[] = [
    { id: "hairline", label: "Hairline", icon: "scan-outline" },
    { id: "crown", label: "Crown", icon: "radio-button-on-outline" },
    { id: "temples", label: "Temples", icon: "triangle-outline" },
  ];

  const milestoneDays = [30, 60, 90, 180];

  const handlePhotoCaptured = (photoUri: string, ghostUsed: boolean) => {
    setIsCameraModalVisible(false);
    const newEntry: HairProgressionPhoto = {
      id: `photo_${Date.now()}`,
      angle: selectedAngle,
      photoUri,
      dayNumber: daysElapsed,
      date: new Date().toISOString(),
      ghostOverlayUsed: ghostUsed,
      caption: `Day ${daysElapsed} ${selectedAngle.toUpperCase()} check-in via Ghost Overlay camera.`,
    };
    onAddPhoto(newEntry);
    Alert.alert("Photo Saved", `Added Day ${daysElapsed} photo to your ${selectedAngle.toUpperCase()} journal!`);
  };

  const confirmDeletePhoto = (photo: HairProgressionPhoto) => {
    if (!onDeletePhoto) return;
    Alert.alert(
      "Delete Photo",
      `Are you sure you want to delete the Day ${photo.dayNumber} photo?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeletePhoto(photo.id),
        },
      ]
    );
  };

  return (
    <View style={styles.cardContainer}>
      {/* Card Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="images" size={18} color="#EC4899" />
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            Progression
          </Text>
        </View>

        <TouchableOpacity
          style={styles.cameraTriggerBtn}
          onPress={() => setIsCameraModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={15} color="#FFFFFF" />
          <Text style={styles.cameraTriggerText}>Snap</Text>
        </TouchableOpacity>
      </View>

      {/* Angle Selector Tabs */}
      <View style={styles.angleTabsRow}>
        {angleOptions.map((ang) => {
          const isSelected = selectedAngle === ang.id;
          const count = photos.filter((p) => p.angle === ang.id).length;
          return (
            <TouchableOpacity
              key={ang.id}
              style={[styles.angleTab, isSelected && styles.angleTabActive]}
              onPress={() => {
                setSelectedAngle(ang.id);
                setSliderPos(containerWidth * 0.5);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={ang.icon as any}
                size={14}
                color={isSelected ? "#EC4899" : "#64748B"}
              />
              <Text style={[styles.angleTabText, isSelected && styles.angleTabTextActive]}>
                {ang.label}
              </Text>
              <View style={[styles.angleCountPill, isSelected && styles.angleCountPillActive]}>
                <Text
                  style={[styles.angleCountText, isSelected && styles.angleCountTextActive]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Interactive Before / After Split Slider Container */}
      {comparison.before && comparison.after ? (
        <View
          ref={sliderRef}
          style={styles.sliderContainer}
          onLayout={handleSliderLayout}
          {...panResponder.panHandlers}
        >
          {/* Base "After" Image (Full Width under layer) */}
          <Image
            source={resolveHairPhotoSource(comparison.after)}
            style={[styles.fullSliderImage, { width: containerWidth }]}
            resizeMode="cover"
          />

          {/* Masked "Before" Image (Clipped to sliderPos) */}
          <View style={[styles.maskedBeforeContainer, { width: sliderPos }]}>
            <Image
              source={resolveHairPhotoSource(comparison.before)}
              style={[styles.fullSliderImage, { width: containerWidth }]}
              resizeMode="cover"
            />
          </View>

          {/* Vertical Divider Line & Draggable Handle */}
          <View style={[styles.sliderDivider, { left: sliderPos - 1.5 }]}>
            <View style={styles.sliderHandleCircle}>
              <Ionicons name="chevron-back" size={12} color="#FFFFFF" />
              <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
            </View>
          </View>

          {/* Floating Day Indicator Badges */}
          <View style={styles.badgeBefore}>
            <Text style={styles.badgeDayText}>Day {comparison.before.dayNumber}</Text>
            <Text style={styles.badgeSubText}>Baseline</Text>
          </View>

          <View style={styles.badgeAfter}>
            <Text style={styles.badgeDayText}>Day {comparison.after.dayNumber}</Text>
            <Text style={styles.badgeSubText}>
              {comparison.after.dayNumber >= 90 ? "+31% Density" : "Progression"}
            </Text>
          </View>

          {/* Ghost Indicator Pill */}
          {comparison.after.ghostOverlayUsed && (
            <View style={styles.ghostStatusPill}>
              <Ionicons name="layers" size={11} color="#10B981" />
              <Text style={styles.ghostStatusText}>Ghost Aligned</Text>
            </View>
          )}

          {/* Drag instruction overlay bar */}
          <View style={styles.dragHintRow}>
            <Text style={styles.dragHintText}>◀ Drag slider to compare Day 1 vs Day 90 ▶</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyComparisonBox}>
          <Ionicons name="images-outline" size={40} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Photos for {selectedAngle.toUpperCase()} Yet</Text>
          <Text style={styles.emptyDesc}>
            Take your first baseline photo using the Ghost-Overlay camera tool to unlock the Before/After slider.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => setIsCameraModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={16} color="#FFFFFF" />
            <Text style={styles.emptyAddBtnText}>Take Baseline Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Comparison Milestone Days Selector */}
      <View style={styles.milestoneRow}>
        <Text style={styles.milestoneLabel}>Compare Against:</Text>
        <View style={styles.milestoneChips}>
          {milestoneDays.map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.milestoneChip,
                targetComparisonDay === d && styles.milestoneChipActive,
              ]}
              onPress={() => setTargetComparisonDay(d)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.milestoneChipText,
                  targetComparisonDay === d && styles.milestoneChipTextActive,
                ]}
              >
                Day {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Timeline Photo Reel for Selected Angle */}
      <View style={styles.reelSection}>
        <View style={styles.reelHeader}>
          <Text style={styles.reelTitle}>
            {selectedAngle.charAt(0).toUpperCase() + selectedAngle.slice(1)} Timeline ({anglePhotos.length})
          </Text>
          <Text style={styles.reelHint}>Tap photo to inspect</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.reelScrollContent}
        >
          {anglePhotos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.reelThumbCard}
              onPress={() => setInspectPhoto(photo)}
              onLongPress={() => confirmDeletePhoto(photo)}
              activeOpacity={0.8}
            >
              <Image source={resolveHairPhotoSource(photo)} style={styles.reelThumbImg} />
              <View style={styles.reelThumbDayBadge}>
                <Text style={styles.reelThumbDayText}>Day {photo.dayNumber}</Text>
              </View>
              {photo.ghostOverlayUsed && (
                <View style={styles.reelGhostDot} />
              )}
            </TouchableOpacity>
          ))}

          {/* Add New Photo Reel Button */}
          <TouchableOpacity
            style={styles.reelAddBtn}
            onPress={() => setIsCameraModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#EC4899" />
            <Text style={styles.reelAddBtnText}>Add</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Ghost-Overlay Camera Modal */}
      <GhostOverlayCameraModal
        visible={isCameraModalVisible}
        angle={selectedAngle}
        ghostPhoto={comparison.before || (anglePhotos.length > 0 ? anglePhotos[0] : null)}
        dayNumber={daysElapsed}
        onClose={() => setIsCameraModalVisible(false)}
        onPhotoCaptured={handlePhotoCaptured}
      />

      {/* Inspect Lightbox Modal */}
      {inspectPhoto && (
        <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setInspectPhoto(null)}>
          <View style={styles.inspectBackdrop}>
            <View style={styles.inspectHeader}>
              <View>
                <Text style={styles.inspectTitle}>
                  Day {inspectPhoto.dayNumber} • {inspectPhoto.angle.toUpperCase()}
                </Text>
                <Text style={styles.inspectDate}>
                  {new Date(inspectPhoto.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.inspectCloseBtn}
                onPress={() => setInspectPhoto(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.inspectImgWrapper}>
              <Image
                source={resolveHairPhotoSource(inspectPhoto)}
                style={styles.inspectImg}
                resizeMode="contain"
              />
            </View>

            {inspectPhoto.caption && (
              <View style={styles.inspectCaptionBox}>
                <Ionicons name="document-text-outline" size={16} color="#F472B6" />
                <Text style={styles.inspectCaptionText}>{inspectPhoto.caption}</Text>
              </View>
            )}

            {onDeletePhoto && (
              <TouchableOpacity
                style={styles.inspectDeleteBtn}
                onPress={() => {
                  const target = inspectPhoto;
                  setInspectPhoto(null);
                  confirmDeletePhoto(target);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.inspectDeleteText}>Delete Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FDF2F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FBCFE8",
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cameraTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EC4899",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexShrink: 0,
  },
  cameraTriggerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  angleTabsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  angleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  angleTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  angleTabText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  angleTabTextActive: {
    color: "#EC4899",
    fontWeight: "800",
  },
  angleCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  angleCountPillActive: {
    backgroundColor: "#FDF2F8",
  },
  angleCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  angleCountTextActive: {
    color: "#EC4899",
  },
  sliderContainer: {
    width: "100%",
    height: SLIDER_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0F172A",
  },
  fullSliderImage: {
    height: SLIDER_HEIGHT,
  },
  maskedBeforeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    overflow: "hidden",
    borderRightWidth: 0,
  },
  sliderDivider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderHandleCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EC4899",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeBefore: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  badgeAfter: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(236, 72, 153, 0.9)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "flex-end",
  },
  badgeDayText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  badgeSubText: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#F1F5F9",
  },
  ghostStatusPill: {
    position: "absolute",
    bottom: 34,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  ghostStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10B981",
  },
  dragHintRow: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dragHintText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  emptyComparisonBox: {
    height: 180,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EC4899",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 2,
  },
  milestoneLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  milestoneChips: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  milestoneChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  milestoneChipActive: {
    backgroundColor: "#FDF2F8",
    borderWidth: 1,
    borderColor: "#EC4899",
  },
  milestoneChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  milestoneChipTextActive: {
    color: "#EC4899",
  },
  reelSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  reelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  reelTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  reelHint: {
    fontSize: 10.5,
    color: "#94A3B8",
  },
  reelScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  reelThumbCard: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  reelThumbImg: {
    width: "100%",
    height: "100%",
  },
  reelThumbDayBadge: {
    position: "absolute",
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingVertical: 1,
    borderRadius: 4,
    alignItems: "center",
  },
  reelThumbDayText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  reelGhostDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  reelAddBtn: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FBCFE8",
    borderStyle: "dashed",
    backgroundColor: "#FDF2F8",
    alignItems: "center",
    justifyContent: "center",
  },
  reelAddBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EC4899",
    marginTop: 2,
  },
  inspectBackdrop: {
    flex: 1,
    backgroundColor: "rgba(9, 13, 22, 0.95)",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  inspectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inspectTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  inspectDate: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  inspectCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  inspectImgWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  inspectImg: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
    borderRadius: 20,
  },
  inspectCaptionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  inspectCaptionText: {
    flex: 1,
    fontSize: 12.5,
    color: "#E2E8F0",
    lineHeight: 18,
  },
  inspectDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  inspectDeleteText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
  },
});

