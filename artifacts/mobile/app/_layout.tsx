import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BPProvider } from '../context/BPContext';
import { MedsProvider } from '../context/MedsContext';
import { GlucoseProvider } from '../context/GlucoseContext';
import { GlucosePrefsProvider } from '../context/GlucosePrefsContext';
import { TargetProvider } from '../context/TargetContext';
import { WidgetSync } from '../components/WidgetSync';
import { AiSettingsProvider } from '../context/AiSettingsContext';
import { PremiumProvider } from '../context/PremiumContext';
import { GoogleAuthProvider } from '../context/GoogleAuthContext';
import { CryptoProvider, useCrypto } from '../context/CryptoContext';
import { LockScreen } from '../components/LockScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { MOTION } from '../utils/motion';

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  // Keep the navigator mounted even while locked. Replacing <Stack> with
  // <LockScreen> on first launch leaves Expo Router with no navigator, so
  // unlock has nowhere to go and the user stays on the password screen.
  // ErrorBoundary keeps CryptoProvider alive if a post-unlock provider/screen throws.
  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary>
        <PremiumProvider>
          <AiSettingsProvider>
            <BPProvider>
              <MedsProvider>
                <GlucoseProvider>
                  <GlucosePrefsProvider>
                    <TargetProvider>
                      <WidgetSync />
                      <Stack
                        initialRouteName={showOnboarding ? 'onboarding' : '(tabs)'}
                        screenOptions={{
                          headerShown: false,
                          animation: Platform.OS === 'web' ? 'none' : 'fade',
                          animationDuration: MOTION.stack,
                          contentStyle: { backgroundColor: '#0A1628' },
                        }}
                      >
                        <Stack.Screen name="onboarding" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="log" />
                        <Stack.Screen name="reading/[id]" />
                      </Stack>
                    </TargetProvider>
                  </GlucosePrefsProvider>
                </GlucoseProvider>
              </MedsProvider>
            </BPProvider>
          </AiSettingsProvider>
        </PremiumProvider>
      </ErrorBoundary>
      {!isUnlocked ? (
        <View style={styles.lockOverlay} pointerEvents="auto">
          <LockScreen />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CryptoProvider>
          <ErrorBoundary>
            <GoogleAuthProvider>
              <RootLayoutNav />
            </GoogleAuthProvider>
          </ErrorBoundary>
        </CryptoProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    zIndex: 1000,
    elevation: 1000,
  },
});
