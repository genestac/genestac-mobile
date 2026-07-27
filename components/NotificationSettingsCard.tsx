import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius, Spacing } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  NotificationPreferences,
} from '@/lib/notificationStorage';
import {
  syncAllNotifications,
  requestNotificationPermissions,
  isNotificationsSupported,
} from '@/lib/notifications';

export function NotificationSettingsCard() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const data = await getNotificationPreferences();
    setPrefs(data);
    setLoading(false);
  };

  const updatePreference = async (
    key: keyof NotificationPreferences,
    value: any
  ) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await saveNotificationPreferences(updated);

    if (value === true && (key.endsWith('Enabled'))) {
      const granted = await requestNotificationPermissions();
      if (!granted && Platform.OS !== 'web') {
        Alert.alert(
          'Permission Needed',
          'Please enable notifications in your device settings to receive lifestyle nudges.'
        );
      }
    }

    setSyncing(true);
    await syncAllNotifications(updated);
    setSyncing(false);
  };

  if (loading || !prefs) {
    return (
      <Card variant="muted" padding={Spacing.md}>
        <ActivityIndicator color={Colors.primary} />
      </Card>
    );
  }

  return (
    <Card variant="default" padding={Spacing.md} style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <Ionicons name="notifications" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Lifestyle & Habit Nudges</Text>
        </View>
        {syncing && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>

      <Text style={styles.cardSubtitle}>
        Smart local reminders to keep your hydration, physical movement, and sleep rhythm on track.
      </Text>

      {/* 1. Water Intake Reminders */}
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.itemEmoji}>💧</Text>
            <Text style={styles.itemTitle}>Hydration Reminders</Text>
          </View>
          <Text style={styles.itemDesc}>
            Reminder to drink water every {prefs.waterIntervalHours} {prefs.waterIntervalHours==1?"hour":"hours"}
          </Text>
        </View>
        <Switch
          value={prefs.waterRemindersEnabled}
          onValueChange={(val) => updatePreference('waterRemindersEnabled', val)}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>

      {/* 2. Hourly Movement & Step Reminders */}
      <View style={styles.divider} />
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.itemEmoji}>🚶</Text>
            <Text style={styles.itemTitle}>Hourly Step Nudges</Text>
          </View>
          <Text style={styles.itemDesc}>
            Alert each hour (9 AM - 6 PM) to take 250 steps
          </Text>
        </View>
        <Switch
          value={prefs.stepRemindersEnabled}
          onValueChange={(val) => updatePreference('stepRemindersEnabled', val)}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>

      {/* 3. Daily 4:00 PM Caffeine Cutoff */}
      <View style={styles.divider} />
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.itemEmoji}>☕</Text>
            <Text style={styles.itemTitle}>4:00 PM Caffeine Cutoff</Text>
          </View>
          <Text style={styles.itemDesc}>
            Stop caffeine after 4 PM for better sleep & lower cortisol
          </Text>
        </View>
        <Switch
          value={prefs.caffeineCutoffEnabled}
          onValueChange={(val) => updatePreference('caffeineCutoffEnabled', val)}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>

      {/* 4. Daily 10:30 PM Bedtime Wind-Down */}
      <View style={styles.divider} />
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.itemEmoji}>🌙</Text>
            <Text style={styles.itemTitle}>10:30 PM Bedtime Wind-Down</Text>
          </View>
          <Text style={styles.itemDesc}>
            Screen off alert for deep restorative sleep
          </Text>
        </View>
        <Switch
          value={prefs.sleepReminderEnabled}
          onValueChange={(val) => updatePreference('sleepReminderEnabled', val)}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>

      <TouchableOpacity
        style={styles.syncBtn}
        onPress={async () => {
          if (!isNotificationsSupported()) {
            Alert.alert(
              'Dev Client Required',
              'Native notifications require a standalone or development build (e.g., npx expo run:android / ios or EAS Build).'
            );
            return;
          }
          setSyncing(true);
          const granted = await requestNotificationPermissions();
          if (granted || Platform.OS === 'web') {
            await syncAllNotifications(prefs);
            Alert.alert('Notifications Synced', 'All local lifestyle reminders have been rescheduled.');
          } else {
            Alert.alert('Permission Denied', 'Please grant notification permissions in settings.');
          }
          setSyncing(false);
        }}
      >
        <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
        <Text style={styles.syncBtnText}>Reschedule All Reminders</Text>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold || 'System',
    color: Colors.dark,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary || '#666',
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemEmoji: {
    fontSize: 16,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: Fonts.medium || 'System',
    color: Colors.dark,
  },
  itemDesc: {
    fontSize: 12,
    color: Colors.textMuted || '#888',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight || '#F0F0F0',
    marginVertical: Spacing.xs,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface || '#F9FAFB',
  },
  syncBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontFamily: Fonts.medium || 'System',
  },
});
