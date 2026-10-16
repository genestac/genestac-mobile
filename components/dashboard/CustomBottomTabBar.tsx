import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { isWeightLossGoal, getPrimaryGoalInfo } from '@/lib/primaryGoal';

const GENESTAC_GRADIENT: readonly [string, string] = ['#12879a', '#5cbf5a'];
const ACTIVE_TAB_COLOR = '#12879a';

interface CustomBottomTabBarProps extends BottomTabBarProps {
  onPressCenterButton?: () => void;
  primaryGoal?: string | null;
}

export const CustomBottomTabBar: React.FC<CustomBottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
  onPressCenterButton,
  primaryGoal,
}) => {
  const insets = useSafeAreaInsets();
  // Ensure robust safe area clearance on all devices:
  // - iOS Home Indicator: insets.bottom is typically 34
  // - Android (edge-to-edge / gesture / 3-button): insets.bottom or fallback to 16
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 16 : 10);

  // Active route name
  const currentRouteName = state.routes[state.index]?.name;

  // If user chose a non-weight primary goal, only show their goal page and profile!
  if (!isWeightLossGoal(primaryGoal)) {
    const goalInfo = getPrimaryGoalInfo(primaryGoal);
    const getShortTitle = (title: string) => {
      if (title.toLowerCase().includes('pain')) return 'Pain & Rehab';
      if (title.toLowerCase().includes('heart')) return 'Heart & Sugar';
      if (title.toLowerCase().includes('hair')) return 'Hair Care';
      if (title.toLowerCase().includes('skin')) return 'Skin & Laser';
      return title;
    };

    return (
      <View
        style={[
          styles.tabBarWrapper,
          {
            paddingBottom: bottomInset,
            height: 58 + bottomInset,
            justifyContent: 'space-around',
            paddingHorizontal: 24,
          },
        ]}
      >
        {/* 1. Primary Goal Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.8}
          onPress={() => router.replace(goalInfo.route as any)}
        >
          {goalInfo.iconType === 'mci' ? (
            <MaterialCommunityIcons
              name={goalInfo.iconName as any}
              size={22}
              color="#94A3B8"
            />
          ) : (
            <Ionicons
              name={`${goalInfo.iconName}-outline` as any}
              size={22}
              color="#94A3B8"
            />
          )}
          <Text style={styles.tabLabel}>{getShortTitle(goalInfo.title)}</Text>
        </TouchableOpacity>

        {/* 2. Profile Tab (Active) */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('profile')}
        >
          {currentRouteName === 'profile' && (
            <LinearGradient
              colors={GENESTAC_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeTabIndicator}
            />
          )}
          <Ionicons
            name={currentRouteName === 'profile' ? 'person' : 'person-outline'}
            size={22}
            color={currentRouteName === 'profile' ? ACTIVE_TAB_COLOR : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentRouteName === 'profile' && styles.tabLabelActive,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.tabBarWrapper,
        {
          paddingBottom: bottomInset,
          height: 58 + bottomInset,
        },
      ]}
    >
      {/* 1. Home Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('index')}
      >
        {currentRouteName === 'index' && (
          <LinearGradient
            colors={GENESTAC_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.activeTabIndicator}
          />
        )}
        <Ionicons
          name={currentRouteName === 'index' ? 'home' : 'home-outline'}
          size={22}
          color={currentRouteName === 'index' ? ACTIVE_TAB_COLOR : '#94A3B8'}
        />
        <Text
          style={[
            styles.tabLabel,
            currentRouteName === 'index' && styles.tabLabelActive,
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* 2. Track Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('track')}
      >
        {currentRouteName === 'track' && (
          <LinearGradient
            colors={GENESTAC_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.activeTabIndicator}
          />
        )}
        <Ionicons
          name={currentRouteName === 'track' ? 'compass' : 'compass-outline'}
          size={22}
          color={currentRouteName === 'track' ? ACTIVE_TAB_COLOR : '#94A3B8'}
        />
        <Text
          style={[
            styles.tabLabel,
            currentRouteName === 'track' && styles.tabLabelActive,
          ]}
        >
          Track
        </Text>
      </TouchableOpacity>

      {/* 3. Center Elevated Circular Floating Button (+) */}
      <View style={styles.centerButtonContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPressCenterButton}
        >
          <LinearGradient
            colors={GENESTAC_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.centerButton}
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 4. Plans Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('plan')}
      >
        {currentRouteName === 'plan' && (
          <LinearGradient
            colors={GENESTAC_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.activeTabIndicator}
          />
        )}
        <Ionicons
          name={currentRouteName === 'plan' ? 'clipboard' : 'clipboard-outline'}
          size={22}
          color={currentRouteName === 'plan' ? ACTIVE_TAB_COLOR : '#94A3B8'}
        />
        <Text
          style={[
            styles.tabLabel,
            currentRouteName === 'plan' && styles.tabLabelActive,
          ]}
        >
          Plans
        </Text>
      </TouchableOpacity>

      {/* 5. Profile Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('profile')}
      >
        {currentRouteName === 'profile' && (
          <LinearGradient
            colors={GENESTAC_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.activeTabIndicator}
          />
        )}
        <Ionicons
          name={currentRouteName === 'profile' ? 'person' : 'person-outline'}
          size={22}
          color={currentRouteName === 'profile' ? ACTIVE_TAB_COLOR : '#94A3B8'}
        />
        <Text
          style={[
            styles.tabLabel,
            currentRouteName === 'profile' && styles.tabLabelActive,
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  tabLabelActive: {
    color: '#12879a',
    fontWeight: '700',
  },
  activeTabIndicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  centerButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    marginTop: -10, // Positioned lower, gently elevated over the tab bar
    zIndex: 10,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#12879a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});
