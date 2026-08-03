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
  normal: '#16A34A',
  elevated: '#D97706',
  stage1: '#EA580C',
  stage2: '#DC2626',
  crisis: '#7F1D1D',
  chartSystolic: '#1E7ADB',
  chartDiastolic: '#0EA5A0',
  chartBPM: '#8B5CF6',
  radius: 12,
};

const darkColors = {
  background: '#0A1628',      // Deep navy from polished designs
  foreground: '#E2EAF0',
  card: '#131F33',
  border: '#2A4159',
  primary: '#14B8A6',         // Strong teal accent
  primaryForeground: '#FFFFFF',
  mutedForeground: '#8BA8C4',
  accent: '#14B8A6',
  accentForeground: '#FFFFFF',
  normal: '#22C55E',
  elevated: '#FBBF24',
  stage1: '#F59E0B',
  stage2: '#EF4444',
  crisis: '#991B1B',
  chartSystolic: '#60A5FA',
  chartDiastolic: '#14B8A6',
  chartBPM: '#A78BFA',
  radius: 16,                 // Slightly rounder to match polished cards
};

export function useColors() {
  const colorScheme = useColorScheme();
  // Prefer dark as primary experience for this health app
  return colorScheme === 'light' ? lightColors : darkColors;
}
