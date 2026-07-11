import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { BPCard } from '../../components/BPCard';
import { getReadingsForDays } from '../../utils/bpUtils';

type Range = 7 | 30 | 90 | 0;

const ranges: { label: string; value: Range }[] = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: 'All', value: 0 },
];

export default function HistoryScreen() {
  const colors = useColors();
  const { readings, isLoading } = useBP();
  const [range, setRange] = useState<Range>(30);

  const filteredReadings = getReadingsForDays(readings, range);

  const sortedReadings = [...filteredReadings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleEdit = (id: number) => {
    router.push({ pathname: '/(tabs)/log', params: { id: id.toString() } });
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
        
        <View style={styles.filterRow}>
          {ranges.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[
                styles.filterChip,
                { 
                  backgroundColor: range === r.value ? colors.primary : colors.card,
                  borderColor: colors.border,
                }
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
            <TouchableOpacity onPress={() => item.id && handleEdit(item.id)}>
              <BPCard reading={item} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
