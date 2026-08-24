import { useColorScheme } from 'react-native';

const lightColors = {
  background: '#EEF4FA',
  foreground: '#1A2B3C',
  card: '#FFFFFF',
  border: '#C4D8EC',
  primary: '#1E7ADB',
  primaryForeground: '#FFFFFF',
  mutedForeground: '#5E7E9B',
  accent: '#0EA5A0',
  accentForeground: '#FFFFFF',
  tooLow: '#0E7490',
  low: '#06B6D4',
  normal: '#16A34A',
  elevated: '#D97706',
  stage1: '#EA580C',
  stage2: '#DC2626',
  crisis: '#7F1D1D',
  chartSystolic: '#1E7ADB',
  chartDiastolic: '#0EA5A0',
  chartBPM: '#8B5CF6',
  glucoseDangerLow: '#0E7490',
  glucoseLow: '#2563EB',
  glucoseNormal: '#16A34A',
  glucoseElevated: '#D97706',
  glucoseHigh: '#EA580C',
  glucoseDangerHigh: '#DC2626',
  radius: 12,
};

const darkColors = {
  background: '#0A1628',
  foreground: '#E2EAF0',
  card: '#131F33',
  border: '#2A4159',
  primary: '#14B8A6',
  primaryForeground: '#FFFFFF',
  mutedForeground: '#8BA8C4',
  accent: '#14B8A6',
  accentForeground: '#FFFFFF',
  tooLow: '#22D3EE',
  low: '#67E8F9',
  normal: '#22C55E',
  elevated: '#FBBF24',
  stage1: '#F59E0B',
  stage2: '#EF4444',
  crisis: '#F87171',
  chartSystolic: '#60A5FA',
  chartDiastolic: '#14B8A6',
  chartBPM: '#A78BFA',
  glucoseDangerLow: '#22D3EE',
  glucoseLow: '#60A5FA',
  glucoseNormal: '#22C55E',
  glucoseElevated: '#FBBF24',
  glucoseHigh: '#FB923C',
  glucoseDangerHigh: '#F87171',
  radius: 16,
};

export function useColors() {
  const colorScheme = useColorScheme();
  return colorScheme === 'light' ? lightColors : darkColors;
}
