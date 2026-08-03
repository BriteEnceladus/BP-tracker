import React, { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BPProvider } from '../context/BPContext';
import { MedsProvider } from '../context/MedsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Check onboarding status
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        if (!completed) {
          setShowOnboarding(true);
        }

        // Simulate any other async loading if needed
        // await someOtherAsyncTask();
      } catch (e) {
        console.warn(e);
      } finally {
        // Hide the splash screen
        await SplashScreen.hideAsync();
        setIsLoading(false);
      }
    };

    prepare();
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <BPProvider>
        <MedsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {showOnboarding && <Stack.Screen name="onboarding" />}
            <Stack.Screen name="(tabs)" />
          </Stack>
        </MedsProvider>
      </BPProvider>
    </SafeAreaProvider>
  );
}
