const colors = {
  light: {
    text: "#1A2B3C",
    tint: "#1E7ADB",
    background: "#EEF4FA",
    foreground: "#1A2B3C",
    card: "#FFFFFF",
    cardForeground: "#1A2B3C",
    primary: "#1E7ADB",
    primaryForeground: "#FFFFFF",
    secondary: "#D6E8F7",
    secondaryForeground: "#1A2B3C",
    muted: "#D6E8F7",
    mutedForeground: "#5E7E9B",
    accent: "#0EA5A0",
    accentForeground: "#FFFFFF",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    border: "#C4D8EC",
    input: "#C4D8EC",
    normal: "#16A34A",
    elevated: "#D97706",
    stage1: "#EA580C",
    stage2: "#DC2626",
    crisis: "#7F1D1D",
    chartSystolic: "#1E7ADB",
    chartDiastolic: "#0EA5A0",
    chartBPM: "#8B5CF6",
  },
  dark: {
    text: "#E2EAF0",
    tint: "#60A5FA",
    background: "#0A1628",
    foreground: "#E2EAF0",
    card: "#131F33",
    cardForeground: "#E2EAF0",
    primary: "#60A5FA",
    primaryForeground: "#0A1628",
    secondary: "#1A2D4A",
    secondaryForeground: "#E2EAF0",
    muted: "#1A2D4A",
    mutedForeground: "#8BA8C4", // Improved contrast for dark mode
    accent: "#14B8A6",
    accentForeground: "#FFFFFF",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    border: "#2A4159", // Better border contrast
    input: "#2A4159",
    normal: "#22C55E",
    elevated: "#FBBF24",
    stage1: "#F59E0B",
    stage2: "#EF4444",
    crisis: "#991B1B",
    chartSystolic: "#60A5FA",
    chartDiastolic: "#14B8A6",
    chartBPM: "#A78BFA",
  },
};

export function useColors() {
  // In a real app this would detect system color scheme
  const isDark = false; // Placeholder - would use useColorScheme()
  return isDark ? colors.dark : colors.light;
}

export default colors;