import React, { useEffect, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts } from '@/constants/colors';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

import { syncAllNotifications } from '@/lib/notifications';

function TabIcon({ name, focused, label }: { name: any; focused: boolean; label: string }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={20}
        color={focused ? Colors.primaryLight : Colors.textMuted}
      />
      <Text
        // numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const [checking, setChecking] = useState(true);
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/(auth)/login');
      } else {
        const { getNotificationPreferences } = require('@/lib/notificationStorage');
        getNotificationPreferences().then(syncAllNotifications).catch(console.error);
      }
      setChecking(false);
    };
    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/(auth)/login');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: 56 + bottomInset,
          paddingBottom: bottomInset > 0 ? bottomInset : 4,
          paddingTop: 5,
        },
        tabBarItemStyle: styles.tabBarItem,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="add-circle" focused={focused} label="Log" />
          ),
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="nutrition" focused={focused} label="Diet" />
          ),
        }}
      />
      <Tabs.Screen
        name="exercise"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="barbell" focused={focused} label="Exercise" />
          ),
        }}
      />
      <Tabs.Screen
        name="steps"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="walk" focused={focused} label="Steps" />
          ),
        }}
      />
      <Tabs.Screen
        name="referral"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="gift" focused={focused} label="Refer" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" focused={focused} label="Profile" />
          ),
        }}
      />

      
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarItem: {
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    width: '100%',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 1,
    textAlign: 'center',
    letterSpacing: -0.1,
    width:200,
  },
  tabLabelActive: {
    color: Colors.primaryLight,
    fontWeight: '700',
  },
});
