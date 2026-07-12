import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { BPCard } from '../../components/BPCard';
import { getReadingsForDays } from '../../utils/bpUtils';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler/Swipeable';

type Range = 7 | 30 | 90 | 0;

const ranges: { label: string; value: Range }[] = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: 'All', value: 0 },
];

export default function HistoryScreen() {
  const colors = useColors();
  const { readings, isLoading, deleteReading } = useBP();
  const [range, setRange] = useState<Range>(30);

  const filteredReadings = getReadingsForDays(readings, range);

  const sortedReadings = [...filteredReadings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const exportToCSV = async () => {
    if (sortedReadings.length === 0) {
      Alert.alert('No Data', 'There are no readings in the selected period to export.');
      return;
    }

    const header = 'Timestamp,Systolic (mmHg),Diastolic (mmHg),Heart Rate (bpm),Notes,Medication Taken\n';
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

    try {
      const fileName = `bp_readings_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Blood Pressure Readings',
        });
      } else {
        Alert.alert(
          'Export Complete',
          `CSV file saved to your device at:\n${fileUri}\n\nYou can open it with any spreadsheet app.`
        );
      }
    } catch (error) {
      console.error('CSV Export Error:', error);
      Alert.alert('Export Failed', 'Unable to export the CSV file. Please try again.');
    }
  };

  const handleDelete = (id: number, timestamp: string) => {
    Alert.alert(
      'Delete Reading?',
      `Delete the reading from ${new Date(timestamp).toLocaleDateString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReading(id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reading');
            }
          },
        },
      ]
    );
  };

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
      onPress={() => item.id && handleDelete(item.id, item.timestamp)}
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
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item)}>
              <TouchableOpacity
                onPress={() => item.id && router.push(`/reading/${item.id}`)}
              >
                <BPCard reading={item} />
              </TouchableOpacity>
            </Swipeable>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
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
});