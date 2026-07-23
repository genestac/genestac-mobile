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
        router.replace('/(auth)/login');
      }
    };
    redirect();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }}>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}
