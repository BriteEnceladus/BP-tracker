import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../hooks/useColors';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

export default function OnboardingScreen() {
  const colors = useColors();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: 'shield',
      title: 'Your data stays private',
      description: 'Everything is stored locally on your device. We never see or store your readings.',
    },
    {
      icon: 'trending-up',
      title: 'See your trends clearly',
      description: 'Beautiful charts, stats, and smart alerts help you understand your blood pressure over time.',
    },
    {
      icon: 'bell',
      title: 'Stay consistent with reminders',
      description: 'Set a daily reminder so logging becomes a simple habit.',
    },
  ];

  const currentStep = steps[step];

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    router.replace('/(tabs)');
  };

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                { backgroundColor: index <= step ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Feather name={currentStep.icon as any} size={48} color={colors.primary} />
        </View>

        {/* Title & Description */}
        <Text style={[styles.title, { color: colors.foreground }]}>
          {currentStep.title}
        </Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          {currentStep.description}
        </Text>

        {/* Skip button */}
        <TouchableOpacity onPress={completeOnboarding} style={styles.skipButton}>
          <Text style={{ color: colors.mutedForeground }}>Skip</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={nextStep}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {step === steps.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  skipButton: {
    marginTop: 40,
    padding: 12,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
