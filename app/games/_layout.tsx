import React from 'react';
import { Stack } from 'expo-router';

export default function GamesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="swipe-junk" />
      <Stack.Screen name="glucose-defender" />
      <Stack.Screen name="hunger-games" />
      <Stack.Screen name="spot-form" />
      <Stack.Screen name="hydration-pet" />
      <Stack.Screen name="zombie-dash" />
    </Stack>
  );
}
