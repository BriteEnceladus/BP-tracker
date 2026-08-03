import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';
import { BPReading } from '../src/db';
import { getBPCategory, getCategoryLabel } from '../utils/bpUtils';

interface BPCardProps {
  reading: BPReading;
}

export function BPCard({ reading }: BPCardProps) {
  const colors = useColors();
  const categoryKey = getBPCategory(reading.systolic, reading.diastolic);
  const categoryLabel = getCategoryLabel(categoryKey);

  const categoryColor =
    categoryKey === 'normal' ? colors.normal :
    categoryKey === 'elevated' ? colors.elevated :
    categoryKey === 'stage1' ? colors.stage1 :
    categoryKey === 'stage2' ? colors.stage2 : colors.crisis;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.row}>
          <Text style={[styles.value, { color: colors.foreground }]}>
            {reading.systolic}/{reading.diastolic}
          </Text>
          <Text style={[styles.unit, { color: colors.mutedForeground }]}>mmHg</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: categoryColor + '22' }]}>
          <Text style={[styles.badgeText, { color: categoryColor }]}>{categoryLabel}</Text>
        </View>
      </View>

      {reading.heartRate ? (
        <Text style={[styles.hr, { color: colors.mutedForeground }]}>
          Pulse {reading.heartRate} bpm
        </Text>
      ) : null}

      <Text style={[styles.time, { color: colors.mutedForeground }]}>
        {new Date(reading.timestamp).toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 32,          // Bold data-focused size
    fontWeight: '700',
  },
  unit: {
    fontSize: 14,
    marginLeft: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hr: {
    fontSize: 14,
    marginTop: 6,
  },
  time: {
    fontSize: 12,
    marginTop: 8,
  },
});
