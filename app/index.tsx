import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { fetchUserPrimaryGoal, getRouteForPrimaryGoal } from '@/lib/primaryGoal';

export default function IndexPage() {
  useEffect(() => {
    const redirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const goal = await fetchUserPrimaryGoal(session.user.id);
        if (goal) {
          const targetRoute = getRouteForPrimaryGoal(goal);
          router.replace(targetRoute as any);
        } else {
          // If primary_goal is null, route to (app) where selection modal will appear
          router.replace('/(app)' as any);
        }
      } else {
        // Show the welcome / onboarding screen for new users
        router.replace('/(onboarding)/welcome');
      }
    };
    redirect();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f6f7' }}>
      <ActivityIndicator color={Colors.primaryLight} size="large" />
    </View>
  );
}
