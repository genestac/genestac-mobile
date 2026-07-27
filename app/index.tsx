import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function IndexPage() {
  useEffect(() => {
    const redirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.replace('/(app)');
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
