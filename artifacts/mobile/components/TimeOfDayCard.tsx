import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';
import {
  TIME_OF_DAY_HINTS,
  TIME_OF_DAY_LABELS,
  peakSystolicBucket,
  type BucketSummary,
} from '../utils/timeOfDay';

type Props = {
  summaries: BucketSummary[];
  isPremium: boolean;
  onPressPro?: () => void;
};

export const TimeOfDayCard = React.memo(function TimeOfDayCard({
  summaries,
  isPremium,
  onPressPro,
}: Props) {
  const colors = useColors();
  const peak = peakSystolicBucket(summaries, 3);
  const hasAny = summaries.some((s) => s.count > 0);
  if (!hasAny) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.grid}>
        {summaries.map((s) => {
          const value =
            s.avgSystolic != null && s.avgDiastolic != null
              ? `${s.avgSystolic}/${s.avgDiastolic}`
              : '—';
          return (
            <View key={s.bucket} style={styles.cell}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {TIME_OF_DAY_LABELS[s.bucket]}
              </Text>
              <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
              {isPremium ? (
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  n={s.count} · {TIME_OF_DAY_HINTS[s.bucket]}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {isPremium && peak && peak.avgSystolic != null && peak.avgDiastolic != null ? (
        <Text style={[styles.peak, { color: colors.mutedForeground }]}>
          Highest average with enough data: {TIME_OF_DAY_LABELS[peak.bucket]}{' '}
          {peak.avgSystolic}/{peak.avgDiastolic} (n={peak.count}). Local clock, on this device.
        </Text>
      ) : null}

      {!isPremium && onPressPro ? (
        <TouchableOpacity onPress={onPressPro} accessibilityRole="button">
          <Text style={[styles.proLink, { color: colors.primary }]}>
            Richer breakdown (counts & peak window) is Pro →
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    paddingVertical: 8,
    paddingRight: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    fontSize: 11,
    marginTop: 2,
  },
  peak: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  proLink: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
});
