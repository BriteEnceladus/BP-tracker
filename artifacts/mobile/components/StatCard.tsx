import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}

export function StatCard({ label, value, unit, accent }: StatCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderTopColor: accent || colors.border, borderTopWidth: accent ? 3 : 1 }]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, { color: accent || colors.foreground }]}>{value}</Text>
        {unit && <Text style={[styles.unit, { color: colors.mutedForeground }]}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 24,          // Larger for bold data feel
    fontWeight: '700',
  },
  unit: {
    fontSize: 13,
    marginLeft: 4,
  },
});
