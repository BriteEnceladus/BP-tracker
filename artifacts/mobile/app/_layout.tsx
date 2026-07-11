import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BPProvider } from '../context/BPContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <BPProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </BPProvider>
    </SafeAreaProvider>
  );
}
