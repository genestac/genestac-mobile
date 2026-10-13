import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  PRIMARY_GOAL_OPTIONS,
  PrimaryGoalOption,
  saveUserPrimaryGoal,
  getRouteForPrimaryGoal,
} from '@/lib/primaryGoal';

interface PrimaryGoalModalProps {
  visible: boolean;
  userId: string;
  initialGoal?: string | null;
  allowDismiss?: boolean;
  onClose?: () => void;
  onGoalSaved: (selectedGoal: string, targetRoute: string) => void;
}

export const PrimaryGoalModal: React.FC<PrimaryGoalModalProps> = ({
  visible,
  userId,
  initialGoal,
  allowDismiss = false,
  onClose,
  onGoalSaved,
}) => {
  const [selectedGoal, setSelectedGoal] = useState<string>(initialGoal || 'Weight Loss');
  const [saving, setSaving] = useState(false);

  // Sync initialGoal when modal opens
  React.useEffect(() => {
    if (initialGoal) {
      setSelectedGoal(initialGoal);
    }
  }, [initialGoal, visible]);

  if (!visible) return null;

  const handleSave = async () => {
    if (!selectedGoal) {
      Alert.alert('Selection Required', 'Please choose a primary goal to continue.');
      return;
    }

    if (!userId) {
      const route = getRouteForPrimaryGoal(selectedGoal);
      onGoalSaved(selectedGoal, route);
      return;
    }

    setSaving(true);
    try {
      const ok = await saveUserPrimaryGoal(userId, selectedGoal);
      if (ok) {
        const route = getRouteForPrimaryGoal(selectedGoal);
        onGoalSaved(selectedGoal, route);
      } else {
        Alert.alert(
          'Notice',
          'Could not sync your choice to the cloud right now. Proceeding with your selection for this session.'
        );
        const route = getRouteForPrimaryGoal(selectedGoal);
        onGoalSaved(selectedGoal, route);
      }
    } catch (err: any) {
      console.error('Error saving primary goal:', err);
      const route = getRouteForPrimaryGoal(selectedGoal);
      onGoalSaved(selectedGoal, route);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        if (allowDismiss && onClose) onClose();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Ionicons name="sparkles" size={12} color="#12879a" />
                  <Text style={styles.badgeText}>PRIMARY FOCUS</Text>
                </View>
              </View>
              <Text style={styles.title}>Select Your Primary Goal</Text>
              <Text style={styles.subtitle}>
                Choose which health protocol you want to see every time you open Genestac:
              </Text>
            </View>

            {allowDismiss && onClose && (
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={12}
                disabled={saving}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Goal Options List */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {PRIMARY_GOAL_OPTIONS.map((opt: PrimaryGoalOption) => {
              const isSelected =
                selectedGoal.toLowerCase() === opt.title.toLowerCase();

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.goalOptionCard,
                    isSelected && {
                      borderColor: opt.color,
                      backgroundColor: opt.bgColor,
                    },
                  ]}
                  onPress={() => setSelectedGoal(opt.title)}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionHeaderRow}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: isSelected ? '#FFFFFF' : opt.bgColor },
                      ]}
                    >
                      {opt.image ? (
                        <Image
                          source={{ uri: opt.image }}
                          style={styles.thumbImage}
                          resizeMode="cover"
                        />
                      ) : opt.iconType === 'mci' ? (
                        <MaterialCommunityIcons
                          name={opt.iconName as any}
                          size={24}
                          color={opt.color}
                        />
                      ) : (
                        <Ionicons
                          name={opt.iconName as any}
                          size={24}
                          color={opt.color}
                        />
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.optionTitle,
                            isSelected && { color: opt.color, fontWeight: '800' },
                          ]}
                        >
                          {opt.title}
                        </Text>
                      </View>
                      <Text style={styles.optionTagline}>{opt.tagline}</Text>
                      <Text style={styles.optionDesc} numberOfLines={2}>
                        {opt.description}
                      </Text>
                    </View>

                    {/* Radio Indicator */}
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && {
                          borderColor: opt.color,
                          backgroundColor: opt.color,
                        },
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Text style={styles.saveBtnText}>Set Primary Goal</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              You can switch your primary goal anytime from your Profile settings.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scrollArea: {
    maxHeight: 450,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  goalOptionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  optionTagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#12879a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#12879a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});
