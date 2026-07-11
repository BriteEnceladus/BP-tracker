import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';
import { BPReading } from '../src/db';

interface BPChartProps {
  readings: BPReading[];
  height?: number;
}

export function BPChart({ readings, height = 200 }: BPChartProps) {
  const colors = useColors();

  if (readings.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={{ color: colors.mutedForeground }}>No data for chart</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height, backgroundColor: colors.card }]}>
      <Text style={{ color: colors.foreground, fontWeight: '600' }}>
        BP Trend Chart ({readings.length} readings)
      </Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 8, fontSize: 12 }}>
        [Chart visualization coming soon]
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
