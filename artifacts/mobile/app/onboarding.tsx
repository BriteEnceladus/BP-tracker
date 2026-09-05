import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../hooks/useColors';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

export default function OnboardingScreen() {
  const colors = useColors();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: 'shield',
      title: 'Your data stays on this phone',
      description: 'Readings are stored here. There is no BP Tracker account or cloud sync.',
      highlight: 'On this device',
    },
    {
      icon: 'bar-chart-2',
      title: 'Understand your trends',
      description: 'Beautiful charts and smart insights help you see patterns in your blood pressure and heart rate over time.',
      highlight: 'Clear Insights',
    },
    {
      icon: 'lock',
      title: 'Choose a password',
      description: 'You will need this password to open the app. There is no reset, so keep it somewhere you will remember.',
      highlight: 'Your password',
    },
    {
      icon: 'alert-circle',
      title: 'Not a medical device',
      description: 'BP Tracker is a personal log. It does not diagnose or treat. Share trends with your clinician.',
      highlight: 'Wellness only',
    },
    {
      icon: 'clock',
      title: 'Build a simple daily habit',
      description: 'Quick logging and optional local reminders. Grok insights stay off until you opt in.',
      highlight: 'Easy & Consistent',
    },
    {
      icon: 'check-circle',
      title: "You're ready to start",
      description: 'Your lock password is set. Log your first reading whenever you are ready.',
      highlight: 'All Set',
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

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.background, colors.card]}
        style={styles.gradient}
      >
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

          {/* Icon with highlight */}
          <View style={styles.iconWrapper}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Feather name={currentStep.icon as any} size={52} color={colors.primary} />
            </View>
            <View style={[styles.highlightBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.highlightText, { color: colors.primary }]}>
                {currentStep.highlight}
              </Text>
            </View>
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            {currentStep.title}
          </Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {currentStep.description}
          </Text>

          {/* Back button */}
          {step > 0 && (
            <TouchableOpacity onPress={prevStep} style={styles.backButton}>
              <Feather name="arrow-left" size={18} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, marginLeft: 6 }}>Back</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </LinearGradient>

      {/* Bottom Navigation */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={nextStep}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {step === steps.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={completeOnboarding} style={styles.skipButton}>
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 50,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  highlightBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 340,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    padding: 10,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 50,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: 12,
  },
});
