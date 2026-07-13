import React, { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BPProvider } from '../context/BPContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        if (!completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.log('Error checking onboarding status');
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboarding();
  }, []);

  if (isLoading) {
    return null; // or a loading screen
  }

  return (
    <SafeAreaProvider>
      <BPProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {showOnboarding && <Stack.Screen name="onboarding" />}
          <Stack.Screen name="(tabs)" />
        </Stack>
      </BPProvider>
    </SafeAreaProvider>
  );
}
