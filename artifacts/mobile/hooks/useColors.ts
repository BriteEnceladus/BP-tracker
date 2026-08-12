import { useColorScheme } from 'react-native';

// Basic theme colors - can be expanded later
const lightColors = {
  background: '#F8FAFC',
  foreground: '#0F172A',
  card: '#FFFFFF',
  border: '#E2E8F0',
  primary: '#0EA5E9',
  primaryForeground: '#FFFFFF',
  mutedForeground: '#64748B',
  normal: '#22C55E',
  elevated: '#EAB308',
  stage1: '#F97316',
  stage2: '#EF4444',
  crisis: '#DC2626',
  radius: 12,
};

const darkColors = {
  background: '#0F172A',
  foreground: '#F8FAFC',
  card: '#1E293B',
  border: '#334155',
  primary: '#38BDF8',
  primaryForeground: '#0F172A',
  mutedForeground: '#94A3B8',
  normal: '#4ADE80',
  elevated: '#FACC15',
  stage1: '#FB923C',
  stage2: '#F87171',
  crisis: '#EF4444',
  radius: 12,
};

export function useColors() {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkColors : lightColors;
}
