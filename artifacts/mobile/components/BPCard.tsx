import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';
import { BPReading } from '../src/db';
import { getBPCategory, getCategoryColor, getCategoryLabel } from '../utils/bpUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AGE_KEY = 'bp_user_age';
let ageCache: number | null | undefined;

interface BPCardProps {
  reading: BPReading;
}

function BPCardInner({ reading }: BPCardProps) {
  const colors = useColors();
  const [age, setAge] = useState<number | null>(ageCache ?? null);

  useEffect(() => {
    if (ageCache !== undefined) {
      setAge(ageCache);
      return;
    }
    AsyncStorage.getItem(AGE_KEY)
      .then((v) => {
        const n = v ? parseInt(v, 10) : NaN;
        ageCache = Number.isFinite(n) ? n : null;
        setAge(ageCache);
      })
      .catch(() => {
        ageCache = null;
      });
  }, []);

  const categoryKey = getBPCategory(reading.systolic, reading.diastolic, age);
  const categoryLabel = getCategoryLabel(categoryKey);
  const categoryColor = getCategoryColor(categoryKey, colors as any);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.accentStrip, { backgroundColor: categoryColor }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.numbersRow}>
            <View style={styles.numberBlock}>
              <Text style={[styles.value, { color: categoryColor }]}>{reading.systolic}</Text>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>SYS</Text>
            </View>
            <Text style={[styles.slash, { color: colors.mutedForeground }]}>/</Text>
            <View style={styles.numberBlock}>
              <Text style={[styles.value, { color: categoryColor }]}>{reading.diastolic}</Text>
              <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>DIA</Text>
            </View>
            {reading.heartRate ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.numberBlock}>
                  <Text style={[styles.value, { color: colors.chartBPM }]}>{reading.heartRate}</Text>
                  <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>BPM</Text>
                </View>
              </>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: categoryColor + '22' }]}>
            <Text style={[styles.badgeText, { color: categoryColor }]}>{categoryLabel}</Text>
          </View>
        </View>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {new Date(reading.timestamp).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  accentStrip: { width: 6 },
  content: { flex: 1, padding: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  numbersRow: { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap', gap: 4 },
  numberBlock: { alignItems: 'center', minWidth: 48 },
  value: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },
  slash: { fontSize: 24, fontWeight: '300', marginHorizontal: 2, marginBottom: 14 },
  divider: { width: 1, height: 36, marginHorizontal: 10, opacity: 0.6 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  time: { fontSize: 12, marginTop: 12 },
});

export const BPCard = React.memo(BPCardInner, (prev, next) => {
  return (
    prev.reading.id === next.reading.id &&
    prev.reading.timestamp === next.reading.timestamp &&
    prev.reading.systolic === next.reading.systolic &&
    prev.reading.diastolic === next.reading.diastolic &&
    prev.reading.heartRate === next.reading.heartRate
  );
});
