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
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { BPCard } from '../../components/BPCard';
import { BPChart } from '../../components/BPChart';
import { StatCard } from '../../components/StatCard';
import { getReadingsForDays, getAverages, getBPCategory, getCategoryColor } from '../../utils/bpUtils';
import { readingsToCsv } from '../../utils/csvExport';
import { shareCsvFile } from '../../utils/csvShare';
import { BPReading } from '../../src/schemas';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

type Range = 7 | 30 | 90 | 0;

const ranges: { label: string; value: Range }[] = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: 0 },
];

export default function HistoryScreen() {
  const colors = useColors();
  const { readings, isLoading, deleteReading, addReading } = useBP();
  const [range, setRange] = useState<Range>(30);
  const [recentlyDeleted, setRecentlyDeleted] = useState<BPReading | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const filteredReadings = useMemo(() => getReadingsForDays(readings, range), [readings, range]);

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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
        <TouchableOpacity onPress={exportToCSV}>
          <Feather name="download" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {ranges.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[
              styles.filterChip,
              {
                backgroundColor: range === r.value ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setRange(r.value)}
          >
            <Text
              style={{
                color: range === r.value ? colors.primaryForeground : colors.foreground,
                fontSize: 13,
                fontWeight: range === r.value ? '600' : '400',
              }}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sortedReadings.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="calendar" size={36} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
            No readings in this period
          </Text>
          <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 6 }}>
            Try a wider range, or log a reading to start your history.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedReadings}
          keyExtractor={(item) => item.id?.toString() || item.timestamp}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              {/* Bold analytics chart */}
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

              {/* Stats summary for bold feel */}
              <View style={styles.statsRow}>
                <StatCard label="Avg Sys" value={averages.avgSystolic || '--'} unit="mmHg" accent={avgCategoryColor} />
                <StatCard label="Avg Dia" value={averages.avgDiastolic || '--'} unit="mmHg" accent={avgCategoryColor} />
                <StatCard label="Readings" value={sortedReadings.length} />
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item)}>
              <TouchableOpacity
                onPress={() => item.id && router.push(`/reading/${item.id}`)}
              >
                <BPCard reading={item} />
              </TouchableOpacity>
            </Swipeable>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Undo Banner */}
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
