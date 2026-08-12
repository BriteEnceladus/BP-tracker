import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BPProvider } from '../context/BPContext';
import { CryptoProvider, useCrypto } from '../context/CryptoContext';
import { LockScreen } from '../components/LockScreen';
import { PuterHost } from '../components/PuterHost';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, StatusBar, Platform } from 'react-native';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading: cryptoLoading, isUnlocked } = useCrypto();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        if (!completed) {
          setShowOnboarding(true);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        await SplashScreen.hideAsync();
        setIsLoading(false);
      }
    };
    prepare();
  }, []);

  if (isLoading || cryptoLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0F172A',
        }}
      >
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  // Gate: show lock / setup screen until the user is unlocked
  if (!isUnlocked) {
    return <LockScreen />;
  }

  return (
    <BPProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {showOnboarding && <Stack.Screen name="onboarding" />}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="reading/[id]"
          options={{
            presentation: Platform.OS === 'ios' ? 'card' : 'card',
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </BPProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <CryptoProvider>
          <RootLayoutNav />
          {/* Puter.js bridge for native cloud backup (no-op on web) */}
          <PuterHost />
        </CryptoProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
