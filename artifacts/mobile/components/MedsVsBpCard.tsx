import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';
import {
  MIN_MEDS_COMPARE_COUNT,
  formatMedsVsBpLine,
  type MedsVsBpSummary,
} from '../utils/medAdherence';

type Props = {
  summary: MedsVsBpSummary;
  isPremium: boolean;
  activeMedCount: number;
  onPressPro?: () => void;
};

function Bar({
  label,
  value,
  max,
  color,
  track,
}: {
  label: string;
  value: number | null;
  max: number;
  color: string;
  track: string;
}) {
  const width = value == null || max <= 0 ? 0 : Math.max(8, Math.round((value / max) * 100));
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: track }]}>
        <View style={[styles.fill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{value ?? '—'}</Text>
    </View>
  );
}

export const MedsVsBpCard = React.memo(function MedsVsBpCard({
  summary,
  isPremium,
  activeMedCount,
  onPressPro,
}: Props) {
  const colors = useColors();
  const line = formatMedsVsBpLine(summary);
  const total = summary.taken.count + summary.notTaken.count;
  if (total === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {activeMedCount > 0 ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {activeMedCount} active {activeMedCount === 1 ? 'medication' : 'medications'} on this device.
        </Text>
      ) : null}

      {line ? (
        <Text style={[styles.body, { color: colors.foreground }]}>{line}</Text>
      ) : (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Need at least {MIN_MEDS_COMPARE_COUNT} logs marked taken and {MIN_MEDS_COMPARE_COUNT} not
          taken to compare averages.
        </Text>
      )}

      {isPremium && line && summary.taken.avgSystolic != null && summary.notTaken.avgSystolic != null ? (
        <View style={{ marginTop: 12 }}>
          <Bar
            label="Taken"
            value={summary.taken.avgSystolic}
            max={Math.max(summary.taken.avgSystolic, summary.notTaken.avgSystolic, 1)}
            color={colors.primary}
            track={colors.border}
          />
          <Bar
            label="Not"
            value={summary.notTaken.avgSystolic}
            max={Math.max(summary.taken.avgSystolic, summary.notTaken.avgSystolic, 1)}
            color={colors.accent}
            track={colors.border}
          />
          <Text style={[styles.meta, { color: colors.mutedForeground, marginTop: 8 }]}>
            Systolic bars only. Uses the Took medication? flag on each reading. Not a correlation study.
          </Text>
        </View>
      ) : null}

      {!isPremium && onPressPro ? (
        <TouchableOpacity onPress={onPressPro} accessibilityRole="button">
          <Text style={[styles.proLink, { color: colors.primary }]}>
            Taken vs not-taken chart is Pro →
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  barLabel: {
    width: 48,
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
  barValue: {
    width: 36,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  proLink: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
});
