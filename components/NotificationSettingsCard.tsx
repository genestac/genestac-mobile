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

  const isMasterEnabled =
    !!prefs &&
    (prefs.waterRemindersEnabled ||
      prefs.stepRemindersEnabled ||
      prefs.caffeineCutoffEnabled ||
      prefs.sleepReminderEnabled ||
      prefs.fastingRemindersEnabled);

  const toggleMaster = async (val: boolean) => {
    if (!prefs) return;
    const updated: NotificationPreferences = {
      ...prefs,
      waterRemindersEnabled: val,
      stepRemindersEnabled: val,
      caffeineCutoffEnabled: val,
      sleepReminderEnabled: val,
      fastingRemindersEnabled: val,
    };
    setPrefs(updated);
    await saveNotificationPreferences(updated);

    if (val && Platform.OS !== 'web') {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Needed',
          'Please enable notifications in device settings to receive reminders.'
        );
      }
    }

    setSyncing(true);
    await syncAllNotifications(updated);
    setSyncing(false);
  };

  const updatePreference = async (
    key: keyof NotificationPreferences,
    value: any
  ) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await saveNotificationPreferences(updated);

    if (value === true && key.endsWith('Enabled')) {
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
      <View style={styles.cardContainer}>
        <ActivityIndicator color="#0A8554" />
      </View>
    );
  }

  return (
    <View style={styles.cardContainer}>
      {/* Header Row with Master Switch */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <Ionicons name="notifications" size={20} color="#0A8554" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Notifications</Text>
            <Text style={styles.cardSubtitle}>
              {isMasterEnabled ? 'Turned On' : 'Turned Off'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {syncing && <ActivityIndicator size="small" color="#0A8554" />}
          <Switch
            value={isMasterEnabled}
            onValueChange={toggleMaster}
            trackColor={{ false: '#CBD5E1', true: '#0A8554' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <Text style={styles.cardDesc}>
        Smart nudges to keep your hydration, physical movement, and sleep rhythm on track.
      </Text>

      {/* 1. Water Intake Reminders */}
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.itemEmoji}>💧</Text>
            <Text style={styles.itemTitle}>Hydration Reminders</Text>
          </View>
          <Text style={styles.itemDesc}>Hourly alerts (7 AM - 10 PM)</Text>
        </View>
        <Switch
          value={prefs.waterRemindersEnabled}
          onValueChange={(val) => updatePreference('waterRemindersEnabled', val)}
          trackColor={{ false: '#CBD5E1', true: '#0A8554' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* 2. Hourly Step & Movement Reminders */}
      <View style={styles.divider} />
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.itemEmoji}>🚶</Text>
            <Text style={styles.itemTitle}>Hourly Step Nudges</Text>
          </View>
          <Text style={styles.itemDesc}>Alert each hour (9 AM - 6 PM) to move</Text>
        </View>
        <Switch
          value={prefs.stepRemindersEnabled}
          onValueChange={(val) => updatePreference('stepRemindersEnabled', val)}
          trackColor={{ false: '#CBD5E1', true: '#0A8554' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* 3. Caffeine Cutoff */}
      <View style={styles.divider} />
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.itemEmoji}>☕</Text>
            <Text style={styles.itemTitle}>4:00 PM Caffeine Cutoff</Text>
          </View>
          <Text style={styles.itemDesc}>Stop caffeine for deeper sleep</Text>
        </View>
        <Switch
          value={prefs.caffeineCutoffEnabled}
          onValueChange={(val) => updatePreference('caffeineCutoffEnabled', val)}
          trackColor={{ false: '#CBD5E1', true: '#0A8554' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* 4. Bedtime Reminder */}
      <View style={styles.divider} />
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.itemEmoji}>🌙</Text>
            <Text style={styles.itemTitle}>10:30 PM Bedtime Wind-Down</Text>
          </View>
          <Text style={styles.itemDesc}>Screen off alert for restorative sleep</Text>
        </View>
        <Switch
          value={prefs.sleepReminderEnabled}
          onValueChange={(val) => updatePreference('sleepReminderEnabled', val)}
          trackColor={{ false: '#CBD5E1', true: '#0A8554' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* 5. Fasting Reminders */}
      <View style={styles.divider} />
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.itemEmoji}>🍽️</Text>
            <Text style={styles.itemTitle}>Fasting Window Alerts</Text>
          </View>
          <Text style={styles.itemDesc}>Eating and fasting window updates</Text>
        </View>
        <Switch
          value={prefs.fastingRemindersEnabled}
          onValueChange={(val) => updatePreference('fastingRemindersEnabled', val)}
          trackColor={{ false: '#CBD5E1', true: '#0A8554' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Reschedule Button */}
      <TouchableOpacity
        style={styles.syncBtn}
        activeOpacity={0.8}
        onPress={async () => {
          if (!isNotificationsSupported()) {
            Alert.alert(
              'Notifications',
              'Notifications require native device permissions.'
            );
            return;
          }
          setSyncing(true);
          const granted = await requestNotificationPermissions();
          if (granted || Platform.OS === 'web') {
            await syncAllNotifications(prefs);
            Alert.alert('Notifications Synced', 'All local reminders have been rescheduled.');
          } else {
            Alert.alert('Permission Denied', 'Please grant notification permissions in settings.');
          }
          setSyncing(false);
        }}
      >
        <Ionicons name="refresh-outline" size={16} color="#0A8554" />
        <Text style={styles.syncBtnText}>Reschedule All Reminders</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 17,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 10,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  syncBtnText: {
    fontSize: 13,
    color: '#0A8554',
    fontWeight: '700',
  },
});

export default NotificationSettingsCard;
