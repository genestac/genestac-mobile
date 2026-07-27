import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
        contentStyle: { backgroundColor: '#f2f6f7' },
      }}
    />
  );
}
