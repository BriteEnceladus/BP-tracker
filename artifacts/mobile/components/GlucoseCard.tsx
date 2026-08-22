import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';
import type { GlucoseDisplayUnit, GlucoseReading } from '../src/schemas';
import {
  formatGlucoseValue,
  getGlucoseBand,
  getGlucoseBandColor,
  getGlucoseBandLabel,
  getGlucoseContextLabel,
} from '../utils/glucoseUtils';
import { isGlucoseInTarget } from '../utils/targets';

function GlucoseCardInner({
  reading,
  unit,
  targetMgdl,
}: {
  reading: GlucoseReading;
  unit: GlucoseDisplayUnit;
  targetMgdl?: number;
}) {
  const colors = useColors();
  const band = getGlucoseBand(reading.valueMgdl);
  const accent = getGlucoseBandColor(band, colors);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: accent },
      ]}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.value, { color: accent }]}>
            {formatGlucoseValue(reading.valueMgdl, unit)}
            <Text style={[styles.unit, { color: colors.mutedForeground }]}> {unit}</Text>
          </Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {getGlucoseContextLabel(reading.context)} ·{' '}
            {new Date(reading.timestamp).toLocaleString()}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: accent + '22' }]}>
          <Text style={[styles.badgeText, { color: accent }]}>
            {getGlucoseBandLabel(band)}
            {targetMgdl != null
              ? isGlucoseInTarget(reading.valueMgdl, { glucoseMgdl: targetMgdl })
                ? ' · In target'
                : ' · Above target'
              : ''}
          </Text>
        </View>
      </View>
      {reading.notes ? (
        <Text style={[styles.notes, { color: colors.mutedForeground }]} numberOfLines={2}>
          {reading.notes}
        </Text>
      ) : null}
    </View>
  );
}

export const GlucoseCard = memo(GlucoseCardInner);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    fontSize: 12,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notes: {
    marginTop: 8,
    fontSize: 13,
  },
});
