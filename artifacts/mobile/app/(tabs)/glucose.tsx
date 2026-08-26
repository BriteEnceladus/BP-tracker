import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useColors } from '../../hooks/useColors';
import { useGlucose } from '../../context/GlucoseContext';
import {
  usePremium,
  FREE_HISTORY_DAYS,
  canViewHistoryRange,
  countWithinFreeWindow,
  freeImportSummary,
} from '../../context/PremiumContext';
import { useGlucosePrefs } from '../../context/GlucosePrefsContext';
import { useTarget } from '../../context/TargetContext';
import { GlucoseCard } from '../../components/GlucoseCard';
import { GlucoseChart } from '../../components/GlucoseChart';
import { GlucoseInsightCard } from '../../components/GlucoseInsightCard';
import { StatCard } from '../../components/StatCard';
import type { GlucoseReading } from '../../src/schemas';
import {
  GLUCOSE_DISCLAIMER,
  formatGlucoseValue,
  getGlucoseAverage,
  getGlucoseReadingsForDays,
} from '../../utils/glucoseUtils';
import { generateGlucoseInsight } from '../../utils/glucoseInsights';
import { glucoseToCsv } from '../../utils/csvExport';
import { shareCsvFile } from '../../utils/csvShare';
import { isDuplicateGlucose, parseCsvGlucose } from '../../utils/csvImport';
import { pickTextFile } from '../../utils/filePick';

type Range = 7 | 14 | 30 | 90 | 0;
const ranges: { label: string; value: Range }[] = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: 0 },
];

export default function GlucoseHistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { glucose, isLoading, deleteGlucose, addGlucose } = useGlucose();
  const { isPremium, requirePro } = usePremium();
  const { unit } = useGlucosePrefs();
  const { target } = useTarget();
  const [range, setRange] = useState<Range>(FREE_HISTORY_DAYS as Range);

  const effectiveRange: Range = canViewHistoryRange(isPremium, range) ? range : (FREE_HISTORY_DAYS as Range);
  const filtered = useMemo(
    () => getGlucoseReadingsForDays(glucose, effectiveRange),
    [glucose, effectiveRange]
  );
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [filtered]
  );
  const avg = getGlucoseAverage(filtered);
  const insightCard = useMemo(
    () => generateGlucoseInsight(filtered, target.glucoseMgdl),
    [filtered, target.glucoseMgdl]
  );
  const deleteRow = useCallback(
    (id: number) => {
      deleteGlucose(id).catch(() => {});
    },
    [deleteGlucose]
  );

  const hiddenCount = isPremium ? 0 : Math.max(0, glucose.length - filtered.length);

  const setRangeOrPaywall = (value: Range) => {
    if (!canViewHistoryRange(isPremium, value)) {
      requirePro('fullHistory');
      return;
    }
    setRange(value);
  };

  const exportCsv = async () => {
    if (sorted.length === 0) {
      Alert.alert('No Data', 'There are no glucose readings in this period to export.');
      return;
    }
    try {
      await shareCsvFile(
        glucoseToCsv(sorted, unit),
        `glucose_${new Date().toISOString().split('T')[0]}.csv`
      );
    } catch {
      Alert.alert('Export Failed', 'Unable to export the CSV file.');
    }
  };

  const importCsv = async () => {
    try {
      const raw = await pickTextFile();
      const { readings: incoming, errors } = parseCsvGlucose(raw);
      const unique = incoming.filter((row) => !isDuplicateGlucose(glucose, row));
      if (incoming.length === 0) {
        Alert.alert('Import failed', errors[0] || 'No valid glucose rows found.');
        return;
      }
      if (unique.length === 0) {
        Alert.alert('Nothing new', `All ${incoming.length} reading(s) are already in Glucose.`);
        return;
      }
      Alert.alert(
        'Import glucose?',
        `Add ${unique.length} reading(s)${errors.length ? `. ${errors.length} row(s) will be skipped.` : '.'} Older rows stay on this device even if you are on the free ${FREE_HISTORY_DAYS}-day view.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              for (const row of unique) await addGlucose(row);
              const { visible } = countWithinFreeWindow(unique.map((row) => row.timestamp));
              Alert.alert('Import complete', freeImportSummary(unique.length, visible));
            },
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'No file selected') {
        Alert.alert('Import failed', 'Could not read that file.');
      }
    }
  };

  const renderRightActions = (item: GlucoseReading) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.crisis,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
      }}
      onPress={() => item.id != null && deleteRow(item.id)}
    >
      <Feather name="trash-2" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Glucose</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={exportCsv} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Feather name="download" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={importCsv} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Feather name="upload" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/log', params: { metric: 'glucose' } })}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>{GLUCOSE_DISCLAIMER}</Text>

      <View style={styles.filterRow}>
        {ranges.map((r) => {
          const locked = !canViewHistoryRange(isPremium, r.value);
          return (
            <TouchableOpacity
              key={r.value}
              style={[
                styles.filterChip,
                {
                  backgroundColor: effectiveRange === r.value ? colors.primary : colors.card,
                  borderColor: colors.border,
                  opacity: locked ? 0.7 : 1,
                },
              ]}
              onPress={() => setRangeOrPaywall(r.value)}
            >
              <Text
                style={{
                  color: effectiveRange === r.value ? colors.primaryForeground : colors.foreground,
                  fontSize: 13,
                  fontWeight: effectiveRange === r.value ? '600' : '400',
                }}
              >
                {locked ? `${r.label} \u00b7 Pro` : r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!isPremium ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 }}>
          Showing the last {FREE_HISTORY_DAYS} days. {hiddenCount > 0 ? `${hiddenCount} older reading(s) stay encrypted on this device` : 'Older logs stay on this device'} and unlock with Pro. Nothing is deleted if Pro turns off.
        </Text>
      ) : null}

      {isLoading ? (
        <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 40 }}>Loading…</Text>
      ) : sorted.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="droplet" size={40} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, fontWeight: '600', marginTop: 12 }}>
            Log your first glucose reading
          </Text>
          <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 6 }}>
            Values stay on this device, encrypted. Restore from Settings if you have a backup.
          </Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/log', params: { metric: 'glucose' } })}
          >
            <Text style={{ color: colors.primary, fontWeight: '600', marginTop: 12 }}>Log glucose →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id?.toString() || item.timestamp}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              {sorted.length > 1 ? <GlucoseChart readings={filtered} unit={unit} height={220} /> : null}
              <View style={styles.statsRow}>
                <StatCard
                  label="Average"
                  value={avg == null ? '--' : formatGlucoseValue(avg, unit)}
                  unit={unit}
                />
                <StatCard label="Readings" value={sorted.length} />
              </View>
              {insightCard ? <GlucoseInsightCard card={insightCard} /> : null}
            </View>
          }
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item)}>
              <TouchableOpacity
                onPress={() =>
                  item.id != null &&
                  router.push({ pathname: '/(tabs)/log', params: { metric: 'glucose', gid: String(item.id) } })
                }
              >
                <GlucoseCard reading={item} unit={unit} targetMgdl={target.glucoseMgdl} />
              </TouchableOpacity>
            </Swipeable>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '700' },
  disclaimer: { fontSize: 12, lineHeight: 17, paddingHorizontal: 16, marginBottom: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  empty: { alignItems: 'center', padding: 40 },
});
