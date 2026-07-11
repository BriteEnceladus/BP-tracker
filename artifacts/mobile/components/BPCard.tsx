import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';
import { BPReading } from '../src/db';

interface BPCardProps {
  reading: BPReading;
}

export function BPCard({ reading }: BPCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {reading.systolic} / {reading.diastolic}
        </Text>
        <Text style={[styles.unit, { color: colors.mutedForeground }]}>mmHg</Text>
      </View>
      {reading.heartRate && (
        <Text style={[styles.hr, { color: colors.mutedForeground }]}>
          HR: {reading.heartRate} bpm
        </Text>
      )}
      <Text style={[styles.time, { color: colors.mutedForeground }]}>
        {new Date(reading.timestamp).toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
  },
  unit: {
    fontSize: 14,
    marginLeft: 8,
  },
  hr: {
    fontSize: 14,
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    marginTop: 8,
  },
});
