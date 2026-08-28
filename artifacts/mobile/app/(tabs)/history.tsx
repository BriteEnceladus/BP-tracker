import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import {
  usePremium,
  FREE_HISTORY_DAYS,
  canViewHistoryRange,
  countWithinFreeWindow,
  freeImportSummary,
} from '../../context/PremiumContext';
import { BPCard } from '../../components/BPCard';
import { BPChart } from '../../components/BPChart';
import { StatCard } from '../../components/StatCard';
import { getReadingsForDays, getAverages, getBPCategory, getCategoryColor } from '../../utils/bpUtils';
import { readingsToCsv } from '../../utils/csvExport';
import { shareCsvFile } from '../../utils/csvShare';
import { isDuplicateReading, parseCsvReadings } from '../../utils/csvImport';
import { pickTextFile } from '../../utils/filePick';
import { BPReading } from '../../src/schemas';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

type Range = 7 | 14 | 30 | 90 | 0;

const ranges: { label: string; value: Range }[] = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: 0 },
];

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { readings, isLoading, deleteReading, addReading } = useBP();
  const { isPremium, requirePro } = usePremium();
  const [range, setRange] = useState<Range>(FREE_HISTORY_DAYS as Range);
  const [recentlyDeleted, setRecentlyDeleted] = useState<BPReading | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const effectiveRange: Range = canViewHistoryRange(isPremium, range)
    ? range
    : (FREE_HISTORY_DAYS as Range);
  const filteredReadings = useMemo(
    () => getReadingsForDays(readings, effectiveRange),
    [readings, effectiveRange]
  );
  const hiddenCount = useMemo(() => {
    if (isPremium) return 0;
    return Math.max(0, readings.length - filteredReadings.length);
  }, [isPremium, readings.length, filteredReadings.length]);

  const setRangeOrPaywall = (value: Range) => {
    if (!canViewHistoryRange(isPremium, value)) {
      requirePro('fullHistory');
      return;
    }
    setRange(value);
  };

  const sortedReadings = useMemo(
    () =>
      [...filteredReadings].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [filteredReadings]
  );

  const averages = useMemo(() => getAverages(filteredReadings), [filteredReadings]);
  const avgCategoryColor =
    averages.avgSystolic && averages.avgDiastolic
      ? getCategoryColor(getBPCategory(averages.avgSystolic, averages.avgDiastolic), colors)
      : undefined;

  const exportToCSV = async () => {
    if (sortedReadings.length === 0) {
      Alert.alert('No Data', 'There are no readings in the selected period to export.');
      return;
    }

    try {
      const csvContent = readingsToCsv(sortedReadings);
      const fileName = `bp_readings_${new Date().toISOString().split('T')[0]}.csv`;
      await shareCsvFile(csvContent, fileName);
    } catch (error) {
      console.error('CSV Export Error:', error);
      Alert.alert('Export Failed', 'Unable to export the CSV file. Please try again.');
    }
  };

  const importFromCsv = async () => {
    try {
      const raw = await pickTextFile();
      const { readings: incoming, errors } = parseCsvReadings(raw);
      const unique = incoming.filter((reading) => !isDuplicateReading(readings, reading));
      if (incoming.length === 0) {
        Alert.alert('Import failed', errors[0] || 'No valid readings were found in that file.');
        return;
      }
      if (unique.length === 0) {
        Alert.alert('Nothing new', `All ${incoming.length} reading(s) are already in History.`);
        return;
      }
      Alert.alert(
        'Import readings?',
        `Add ${unique.length} reading(s)${errors.length ? `. ${errors.length} row(s) will be skipped.` : '.'} Older rows stay on this device even if you are on the free ${FREE_HISTORY_DAYS}-day view.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              try {
                for (const reading of unique) {
                  await addReading(reading);
                }
                const { visible } = countWithinFreeWindow(unique.map((row) => row.timestamp));
                Alert.alert('Import complete', freeImportSummary(unique.length, visible));
              } catch {
                Alert.alert('Import failed', 'Some readings could not be saved.');
              }
            },
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'No file selected') {
        Alert.alert('Import failed', 'Could not read that file. Use a CSV exported from this app.');
      }
    }
  };

  const handleDelete = (id: number) => {
    const readingToDelete = sortedReadings.find((r) => r.id === id);
    if (!readingToDelete) return;

    deleteReading(id).catch(() => {
      Alert.alert('Error', 'Failed to delete reading');
    });

    setRecentlyDeleted(readingToDelete);
    if (undoTimeout) clearTimeout(undoTimeout);

    const timeout = setTimeout(() => {
      setRecentlyDeleted(null);
    }, 15000);

    setUndoTimeout(timeout);
  };

  const handleUndo = async () => {
    if (!recentlyDeleted) return;

    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }

    try {
      await addReading({
        timestamp: recentlyDeleted.timestamp,
        systolic: recentlyDeleted.systolic,
        diastolic: recentlyDeleted.diastolic,
        heartRate: recentlyDeleted.heartRate,
        notes: recentlyDeleted.notes,
        medicationTaken: recentlyDeleted.medicationTaken,
      });
      setRecentlyDeleted(null);
    } catch (error) {
      Alert.alert('Undo Failed', 'Could not restore the reading.');
    }
  };

  React.useEffect(() => {
    return () => {
      if (undoTimeout) clearTimeout(undoTimeout);
    };
  }, [undoTimeout]);

  const renderRightActions = (item: any) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.crisis,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
      }}
      onPress={() => item.id && handleDelete(item.id)}
    >
      <Feather name="trash-2" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={importFromCsv} accessibilityLabel="Import CSV" hitSlop={8}>
            <Feather name="upload" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportToCSV} accessibilityLabel="Export CSV" hitSlop={8}>
            <Feather name="download" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/log')}
            accessibilityLabel="Log new reading"
            style={[styles.logBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus-circle" size={18} color={colors.primaryForeground} />
            <Text style={[styles.logBtnText, { color: colors.primaryForeground }]}>Log</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterRow}>
        {ranges.map((r) => {
          const locked = !canViewHistoryRange(isPremium, r.value);
          const selected = effectiveRange === r.value;
          return (
            <TouchableOpacity
              key={r.value}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: colors.border,
                  opacity: locked ? 0.7 : 1,
                },
              ]}
              onPress={() => setRangeOrPaywall(r.value)}
            >
              <Text
                style={{
                  color: selected ? colors.primaryForeground : colors.foreground,
                  fontSize: 13,
                  fontWeight: selected ? '600' : '400',
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

      {sortedReadings.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="calendar" size={36} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
            No readings in this period
          </Text>
          <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 6 }}>
            {isPremium
              ? 'Try a wider range, or log a reading to start your history.'
              : hiddenCount > 0
                ? `Older logs stay encrypted on this device. Pro unlocks history beyond ${FREE_HISTORY_DAYS} days.`
                : 'Log a reading to start your history.'}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/log')}
            accessibilityLabel="Log new reading"
            style={[styles.emptyLogBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Log reading</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedReadings}
          keyExtractor={(item) => item.id?.toString() || item.timestamp}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              {sortedReadings.length > 1 && (
                <View style={{ marginBottom: 16 }}>
                  <BPChart
                    readings={filteredReadings}
                    height={240}
                    onPointPress={(reading) => {
                      if (reading.id) router.push(`/reading/${reading.id}`);
                    }}
                  />
                </View>
              )}
              <View style={styles.statsRow}>
                <StatCard label="Avg Sys" value={averages.avgSystolic || '--'} unit="mmHg" accent={avgCategoryColor} />
                <StatCard label="Avg Dia" value={averages.avgDiastolic || '--'} unit="mmHg" accent={avgCategoryColor} />
                <StatCard label="Readings" value={sortedReadings.length} />
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Swipeable
              friction={2}
              overshootRight={false}
              overshootFriction={8}
              renderRightActions={() => renderRightActions(item)}
            >
              <TouchableOpacity
                onPress={() => item.id && router.push(`/reading/${item.id}`)}
              >
                <BPCard reading={item} />
              </TouchableOpacity>
            </Swipeable>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
          updateCellsBatchingPeriod={50}
          scrollEventThrottle={16}
        />
      )}

      {recentlyDeleted && (
        <View style={[styles.undoBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, flex: 1 }}>Reading deleted</Text>
          <TouchableOpacity onPress={handleUndo} style={styles.undoButton}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyLogBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  undoBanner: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  undoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
