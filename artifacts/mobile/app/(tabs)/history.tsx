import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { BPCard } from '../../components/BPCard';
import { getReadingsForDays } from '../../utils/bpUtils';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import type { BPReading } from '../../src/db';

type Range = 7 | 30 | 90 | 0;

const ranges: { label: string; value: Range }[] = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: 'All', value: 0 },
];

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { readings, isLoading, deleteReading, addReading } = useBP();
  const [range, setRange] = useState<Range>(30);
  const [recentlyDeleted, setRecentlyDeleted] = useState<BPReading | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const filteredReadings = getReadingsForDays(readings, range);

  const sortedReadings = [...filteredReadings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const exportToCSV = async () => {
    if (sortedReadings.length === 0) {
      Alert.alert('No Data', 'There are no readings in the selected period to export.');
      return;
    }

    const header =
      'Timestamp,Systolic (mmHg),Diastolic (mmHg),Heart Rate (bpm),Notes,Medication Taken\n';
    const rows = sortedReadings
      .map((r) => {
        const ts = new Date(r.timestamp).toISOString();
        const hr = r.heartRate ?? '';
        const notes = r.notes ? `"${r.notes.replace(/"/g, '""')}"` : '';
        const med = r.medicationTaken ? 'Yes' : 'No';
        return `${ts},${r.systolic},${r.diastolic},${hr},${notes},${med}`;
      })
      .join('\n');

    const csvContent = header + rows;
    const fileName = `bp_readings_${new Date().toISOString().split('T')[0]}.csv`;

    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Export Complete', 'CSV download started.');
        return;
      }

      Alert.alert(
        'CSV Export',
        'Open the web app to download a CSV file, or install expo-file-system + expo-sharing for native share.'
      );
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

  const confirmDelete = (id: number) => {
    Alert.alert('Delete reading?', 'You can undo for 15 seconds after deleting.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(id),
      },
    ]);
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
    } catch {
      Alert.alert('Undo Failed', 'Could not restore the reading.');
    }
  };

  React.useEffect(() => {
    return () => {
      if (undoTimeout) clearTimeout(undoTimeout);
    };
  }, [undoTimeout]);

  const renderRightActions = (item: BPReading) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.crisis,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        marginBottom: 12,
      }}
      onPress={() => item.id != null && handleDelete(item.id)}
    >
      <Feather name="trash-2" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );

  const renderRow = (item: BPReading) => {
    const card = (
      <TouchableOpacity
        onPress={() => item.id != null && router.push(`/reading/${item.id}`)}
        activeOpacity={0.7}
        delayPressIn={50}
      >
        <BPCard reading={item} />
      </TouchableOpacity>
    );

    // Mobile-first: swipe to delete on native; trash button on web (testing only)
    if (Platform.OS === 'web' || !Swipeable) {
      return (
        <View style={styles.webRow}>
          <View style={styles.webCard}>{card}</View>
          <TouchableOpacity
            style={[
              styles.webDelete,
              { backgroundColor: colors.crisis + '22', borderColor: colors.crisis },
            ]}
            onPress={() => item.id != null && confirmDelete(item.id)}
            accessibilityLabel="Delete reading"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={18} color={colors.crisis} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        friction={2}
      >
        {card}
      </Swipeable>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
        <TouchableOpacity
          onPress={exportToCSV}
          accessibilityLabel="Export CSV"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBtn}
        >
          <Feather name="download" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

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
              }}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sortedReadings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>
            No readings in this period.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedReadings}
          keyExtractor={(item) => item.id?.toString() || item.timestamp}
          renderItem={({ item }) => renderRow(item)}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 24 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {Platform.OS !== 'web' && sortedReadings.length > 0 && (
        <Text style={[styles.swipeHint, { color: colors.mutedForeground }]}>
          Swipe a reading left to delete
        </Text>
      )}

      {recentlyDeleted && (
        <View
          style={[
            styles.undoBanner,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              bottom: 12 + insets.bottom,
            },
          ]}
        >
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
    paddingBottom: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
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
  webRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  webCard: {
    flex: 1,
  },
  webDelete: {
    width: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
