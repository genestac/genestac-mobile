// components/pain/DigitalBodyMap.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { BodyRegionId, BODY_REGIONS } from '@/lib/painMap';
import { Ionicons } from '@expo/vector-icons';

export type BodyGender = 'male' | 'female';

interface DigitalBodyMapProps {
  selectedRegion?: BodyRegionId;
  selectedRegions?: BodyRegionId[];
  onSelectRegion?: (regionId: BodyRegionId) => void;
  onToggleRegion?: (regionId: BodyRegionId) => void;
  onClearRegions?: () => void;
  painScore?: number;
}


type ViewCoord = { x: number; y: number };
type PointerEntry = { front: ViewCoord; back: ViewCoord };
type PointerMap = Record<BodyRegionId, PointerEntry>;

const MALE_POINTERS: PointerMap = {
  head:           { front: { x: 0.500, y: 0.075 }, back: { x: 0.500, y: 0.075 } },
  left_shoulder:  { front: { x: 0.395, y: 0.235 }, back: { x: 0.395, y: 0.245 } },
  right_shoulder: { front: { x: 0.605, y: 0.235 }, back: { x: 0.605, y: 0.245 } },
  left_elbow:     { front: { x: 0.375, y: 0.390 }, back: { x: 0.375, y: 0.390 } },
  right_elbow:    { front: { x: 0.625, y: 0.390 }, back: { x: 0.625, y: 0.390 } },
  left_wrist:     { front: { x: 0.370, y: 0.515 }, back: { x: 0.370, y: 0.515 } },
  right_wrist:    { front: { x: 0.635, y: 0.515 }, back: { x: 0.635, y: 0.515 } },
  chest:          { front: { x: 0.500, y: 0.300 }, back: { x: 0.500, y: 0.300 } },
  upper_back:     { front: { x: 0.550, y: 0.300 }, back: { x: 0.500, y: 0.300 } },
  abdomen:        { front: { x: 0.500, y: 0.420 }, back: { x: 0.500, y: 0.420 } },
  lower_back:     { front: { x: 0.500, y: 0.420 }, back: { x: 0.500, y: 0.420 } },
  left_hip:       { front: { x: 0.425, y: 0.535 }, back: { x: 0.445, y: 0.535 } },
  right_hip:      { front: { x: 0.575, y: 0.535 }, back: { x: 0.555, y: 0.535 } },
  left_knee:      { front: { x: 0.435, y: 0.725 }, back: { x: 0.435, y: 0.725 } },
  right_knee:     { front: { x: 0.565, y: 0.725 }, back: { x: 0.565, y: 0.725 } },
  left_ankle:     { front: { x: 0.440, y: 0.885 }, back: { x: 0.440, y: 0.885 } },
  right_ankle:    { front: { x: 0.560, y: 0.885 }, back: { x: 0.560, y: 0.885 } },
  left_foot:      { front: { x: 0.435, y: 0.940 }, back: { x: 0.435, y: 0.940 } },
  right_foot:     { front: { x: 0.565, y: 0.940 }, back: { x: 0.565, y: 0.940 } },
};

const FEMALE_POINTERS: PointerMap = {
  head:           { front: { x: 0.500, y: 0.080 }, back: { x: 0.500, y: 0.080 } },
  left_shoulder:  { front: { x: 0.415, y: 0.245 }, back: { x: 0.415, y: 0.245 } },
  right_shoulder: { front: { x: 0.585, y: 0.245 }, back: { x: 0.585, y: 0.245 } },
  left_elbow:     { front: { x: 0.395, y: 0.410 }, back: { x: 0.395, y: 0.410 } },
  right_elbow:    { front: { x: 0.605, y: 0.410 }, back: { x: 0.605, y: 0.410 } },
  left_wrist:     { front: { x: 0.369, y: 0.515 }, back: { x: 0.369, y: 0.525 } },
  right_wrist:    { front: { x: 0.632, y: 0.515 }, back: { x: 0.632, y: 0.525 } },
  chest:          { front: { x: 0.500, y: 0.300 }, back: { x: 0.500, y: 0.300 } },
  upper_back:     { front: { x: 0.500, y: 0.300 }, back: { x: 0.500, y: 0.300 } },
  abdomen:        { front: { x: 0.500, y: 0.430 }, back: { x: 0.500, y: 0.430 } },
  lower_back:     { front: { x: 0.500, y: 0.430 }, back: { x: 0.500, y: 0.430 } },
  left_hip:       { front: { x: 0.450, y: 0.540 }, back: { x: 0.450, y: 0.540 } },
  right_hip:      { front: { x: 0.550, y: 0.540 }, back: { x: 0.550, y: 0.540 } },
  left_knee:      { front: { x: 0.440, y: 0.730 }, back: { x: 0.450, y: 0.730 } },
  right_knee:     { front: { x: 0.560, y: 0.730 }, back: { x: 0.547, y: 0.730 } },
  left_ankle:     { front: { x: 0.445, y: 0.890 }, back: { x: 0.465, y: 0.890 } },
  right_ankle:    { front: { x: 0.555, y: 0.890 }, back: { x: 0.535, y: 0.890 } },
  left_foot:      { front: { x: 0.440, y: 0.945 }, back: { x: 0.440, y: 0.945 } },
  right_foot:     { front: { x: 0.560, y: 0.945 }, back: { x: 0.560, y: 0.945 } },
};

const POINTERS: Record<BodyGender, PointerMap> = {
  male: MALE_POINTERS,
  female: FEMALE_POINTERS,
};

const FRONT_ONLY: BodyRegionId[] = ['chest', 'abdomen'];
const BACK_ONLY: BodyRegionId[]  = ['upper_back', 'lower_back'];

const BODY_IMAGES = {
  male:   { front: require('@/assets/body/male_front.png'),   back: require('@/assets/body/male_back.png')   },
  female: { front: require('@/assets/body/female_front.png'), back: require('@/assets/body/female_back.png') },
};

type CalloutConfig = {
  side: 'left' | 'right' | 'top';
  yRatio: number;
  label: string;
};

const CALLOUT_LAYOUT: Record<BodyRegionId, CalloutConfig> = {
  head:           { side: 'top',   yRatio: 0.02, label: 'Head & Neck' },
  left_shoulder:  { side: 'left',  yRatio: 0.17, label: 'Left Shoulder' },
  right_shoulder: { side: 'right', yRatio: 0.17, label: 'Right Shoulder' },
  chest:          { side: 'left',  yRatio: 0.27, label: 'Chest' },
  upper_back:     { side: 'left',  yRatio: 0.27, label: 'Upper Back' },
  left_elbow:     { side: 'left',  yRatio: 0.37, label: 'Left Elbow' },
  right_elbow:    { side: 'right', yRatio: 0.37, label: 'Right Elbow' },
  abdomen:        { side: 'right', yRatio: 0.27, label: 'Abdomen' },
  lower_back:     { side: 'right', yRatio: 0.27, label: 'Lower Back' },
  left_wrist:     { side: 'left',  yRatio: 0.47, label: 'Left Wrist' },
  right_wrist:    { side: 'right', yRatio: 0.47, label: 'Right Wrist' },
  left_hip:       { side: 'left',  yRatio: 0.57, label: 'Left Hip' },
  right_hip:      { side: 'right', yRatio: 0.57, label: 'Right Hip' },
  left_knee:      { side: 'left',  yRatio: 0.69, label: 'Left Knee' },
  right_knee:     { side: 'right', yRatio: 0.69, label: 'Right Knee' },
  left_ankle:     { side: 'left',  yRatio: 0.81, label: 'Left Ankle' },
  right_ankle:    { side: 'right', yRatio: 0.81, label: 'Right Ankle' },
  left_foot:      { side: 'left',  yRatio: 0.92, label: 'Left Foot' },
  right_foot:     { side: 'right', yRatio: 0.92, label: 'Right Foot' },
};

const SCREEN_W = Dimensions.get('window').width;
const CANVAS_W = Math.min(SCREEN_W - 32, 440);
const CANVAS_H = Math.round(CANVAS_W * 1.25);

export const DigitalBodyMap: React.FC<DigitalBodyMapProps> = ({
  selectedRegion,
  selectedRegions,
  onSelectRegion,
  onToggleRegion,
  onClearRegions,
  painScore = 8,
}) => {
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');
  const [gender, setGender]         = useState<BodyGender>('male');

  const activeRegionList: BodyRegionId[] =
    selectedRegions !== undefined
      ? selectedRegions
      : selectedRegion
      ? [selectedRegion]
      : ['left_knee'];

  const isRegionSelected = (id: BodyRegionId) => activeRegionList.includes(id);

  const handleToggle = (regionId: BodyRegionId) => {
    if (onToggleRegion) {
      onToggleRegion(regionId);
    } else if (onSelectRegion) {
      onSelectRegion(regionId);
    }
  };

  const getPinColor = (regionId: BodyRegionId) => {
    if (isRegionSelected(regionId)) {
      if (painScore >= 8) return '#EF4444';
      if (painScore >= 5) return '#F59E0B';
      return '#10B981';
    }
    return '#64748B';
  };

  const currentPointers = POINTERS[gender];

  const visiblePointers = (Object.keys(currentPointers) as BodyRegionId[]).filter((id) => {
    if (activeView === 'front' && BACK_ONLY.includes(id))  return false;
    if (activeView === 'back'  && FRONT_ONLY.includes(id)) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* ── Controls ── */}
      <View style={styles.topControlRow}>
        <View style={styles.genderControlContainer}>
          <TouchableOpacity
            style={[styles.genderTab, gender === 'male' && styles.genderTabActiveMale]}
            onPress={() => setGender('male')}
            activeOpacity={0.8}
          >
            <Ionicons name="male" size={13} color={gender === 'male' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.genderTabText, gender === 'male' && styles.genderTabTextActive]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderTab, gender === 'female' && styles.genderTabActiveFemale]}
            onPress={() => setGender('female')}
            activeOpacity={0.8}
          >
            <Ionicons name="female" size={13} color={gender === 'female' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.genderTabText, gender === 'female' && styles.genderTabTextActive]}>Female</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.viewSegmentedControl}>
          {(['front', 'back'] as const).map((v) => {
            const isActive = activeView === v;
            return (
              <TouchableOpacity
                key={v}
                style={[styles.viewSegmentTab, isActive && styles.viewSegmentTabActive]}
                onPress={() => setActiveView(v)}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewSegmentText, isActive && styles.viewSegmentTextActive]}>
                  {v.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Body image + arrow pointer callouts overlay ─────────────────── */}
      <View style={[styles.imageWrapper, { width: CANVAS_W, height: CANVAS_H }]}>
        <Image
          source={BODY_IMAGES[gender][activeView]}
          style={[styles.bodyImage, { width: CANVAS_W, height: CANVAS_H }]}
          resizeMode="contain"
        />

        {/* SVG layer for lines & target dots */}
        <Svg
          width={CANVAS_W}
          height={CANVAS_H}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {visiblePointers.map((regionId) => {
            const coord      = currentPointers[regionId][activeView];
            const cfg        = CALLOUT_LAYOUT[regionId];
            if (!coord || !cfg) return null;

            // Scaled dot coordinates on canvas (centered 1:1 image)
            const imgOffsetY = (CANVAS_H - CANVAS_W) / 2;
            const dotX       = coord.x * CANVAS_W;
            const dotY       = imgOffsetY + coord.y * CANVAS_W;

            const isSel      = isRegionSelected(regionId);
            const color      = getPinColor(regionId);
            const boxW       = 86;
            const boxH       = 24;

            let boxX = 6;
            let boxY = Math.round(cfg.yRatio * CANVAS_H);
            let lineStartX = boxX + boxW;
            let lineStartY = boxY + boxH / 2;

            if (cfg.side === 'right') {
              boxX = CANVAS_W - 6 - boxW;
              lineStartX = boxX;
            } else if (cfg.side === 'top') {
              boxX = Math.round((CANVAS_W - boxW) / 2);
              boxY = 6;
              lineStartX = CANVAS_W / 2;
              lineStartY = boxY + boxH;
            }

            return (
              <React.Fragment key={regionId}>
                {/* Connecting Arrow Line */}
                <Line
                  x1={lineStartX}
                  y1={lineStartY}
                  x2={dotX}
                  y2={dotY}
                  stroke={isSel ? color : '#CBD5E1'}
                  strokeWidth={isSel ? 2.5 : 1}
                  strokeDasharray={isSel ? undefined : '3 3'}
                />

                {/* Target Dot on Body with glow halo when selected */}
                {isSel && (
                  <Circle cx={dotX} cy={dotY} r={13} fill={color} opacity={0.28} />
                )}
                <Circle
                  cx={dotX}
                  cy={dotY}
                  r={isSel ? 6 : 4}
                  fill={isSel ? color : '#FFFFFF'}
                  stroke={isSel ? color : '#94A3B8'}
                  strokeWidth={1.5}
                />
                <Circle
                  cx={dotX}
                  cy={dotY}
                  r={isSel ? 2.2 : 1.5}
                  fill={isSel ? '#FFFFFF' : '#94A3B8'}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Touchable Native Overlay Buttons for 100% reliable tap/click selection */}
        {visiblePointers.map((regionId) => {
          const coord = currentPointers[regionId][activeView];
          const cfg   = CALLOUT_LAYOUT[regionId];
          if (!coord || !cfg) return null;

          const imgOffsetY = (CANVAS_H - CANVAS_W) / 2;
          const dotX       = coord.x * CANVAS_W;
          const dotY       = imgOffsetY + coord.y * CANVAS_W;

          const isSel = isRegionSelected(regionId);
          const color = getPinColor(regionId);
          const boxW  = 86;
          const boxH  = 24;

          let boxX = 6;
          let boxY = Math.round(cfg.yRatio * CANVAS_H);

          if (cfg.side === 'right') {
            boxX = CANVAS_W - 6 - boxW;
          } else if (cfg.side === 'top') {
            boxX = Math.round((CANVAS_W - boxW) / 2);
            boxY = 6;
          }

          return (
            <React.Fragment key={regionId}>
              {/* Callout Box Button */}
              <TouchableOpacity
                style={[
                  styles.calloutButton,
                  {
                    left: boxX,
                    top: boxY,
                    width: boxW,
                    height: boxH,
                    backgroundColor: isSel ? color : '#FFFFFF',
                    borderColor: isSel ? color : '#CBD5E1',
                    borderWidth: isSel ? 2 : 1.2,
                  },
                ]}
                onPress={() => handleToggle(regionId)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <View style={styles.calloutInnerRow}>
                  {isSel && (
                    <Ionicons name="checkmark-sharp" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                  )}
                  <Text
                    style={[
                      styles.calloutText,
                      {
                        color: isSel ? '#FFFFFF' : '#334155',
                        fontWeight: isSel ? '800' : '700',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {cfg.label}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Target Dot Touch Area */}
              <TouchableOpacity
                style={[
                  styles.dotTouchTarget,
                  {
                    left: dotX - 16,
                    top: dotY - 16,
                  },
                ]}
                onPress={() => handleToggle(regionId)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              />
            </React.Fragment>
          );
        })}
      </View>

      {/* ── Active zones multi-point bar ── */}
      <View style={styles.activeZoneBar}>
        <View style={styles.activeZoneTopHeader}>
          <View style={styles.activeZoneHeaderTag}>
            <Ionicons name="location-sharp" size={12} color="#DC2626" />
            <Text style={styles.activeZoneLabel}>
              SELECTED PAIN POINTS ({activeRegionList.length})
            </Text>
            <View style={styles.genderTagBadge}>
              <Text style={styles.genderTagText}>{gender.toUpperCase()}</Text>
            </View>
          </View>
          {activeRegionList.length > 0 && onClearRegions && (
            <TouchableOpacity
              onPress={onClearRegions}
              style={styles.clearBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.clearBtnText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeRegionList.length === 0 ? (
          <Text style={styles.emptySelectedText}>
            Tap any body area or label above to map your pain points.
          </Text>
        ) : (
          <View style={styles.selectedChipsContainer}>
            {activeRegionList.map((regionId) => {
              const label = BODY_REGIONS.find((r) => r.id === regionId)?.label || regionId;
              const color = getPinColor(regionId);
              return (
                <TouchableOpacity
                  key={regionId}
                  style={styles.selectedChip}
                  onPress={() => handleToggle(regionId)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.chipDot, { backgroundColor: color }]} />
                  <Text style={styles.selectedChipText}>{label}</Text>
                  <Ionicons name="close" size={12} color="#64748B" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.hintSubtext}>
          💡 You can select multiple points across Front and Back views.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 5,
  },
  genderControlContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  genderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  genderTabActiveMale:   { backgroundColor: '#2563EB' },
  genderTabActiveFemale: { backgroundColor: '#EC4899' },
  genderTabText:         { fontSize: 11, fontWeight: '700', color: '#64748B' },
  genderTabTextActive:   { color: '#FFFFFF' },
  viewSegmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  viewSegmentTab:        { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 7 },
  viewSegmentTabActive:  { backgroundColor: '#DC2626' },
  viewSegmentText:       { fontSize: 11, fontWeight: '700', color: '#64748B' },
  viewSegmentTextActive: { color: '#FFFFFF' },
  imageWrapper: {
    alignSelf: 'center',
    marginVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  bodyImage: {},
  calloutButton: {
    position: 'absolute',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  calloutInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutText: {
    fontSize: 10,
    textAlign: 'center',
  },
  dotTouchTarget: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    zIndex: 10,
  },
  activeZoneBar: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  activeZoneTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeZoneHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeZoneLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.6,
  },
  genderTagBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  genderTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#475569',
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  selectedChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptySelectedText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginVertical: 4,
  },
  hintSubtext: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});



