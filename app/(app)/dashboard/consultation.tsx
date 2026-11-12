import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Legacy forwarder:
 * Book Consultation has been moved globally to /(app)/consultation to be accessible
 * throughout all specialty care pages and profile without being trapped in dashboard tabs.
 */
export default function DashboardConsultationRedirect() {
  const params = useLocalSearchParams();

  useEffect(() => {
    router.replace({
      pathname: '/(app)/consultation',
      params: params as any,
    });
  }, [params]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <ActivityIndicator size="large" color="#0A8554" />
    </View>
  );
}
