import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '../../hooks/useColors';
import { useBP } from '../../context/BPContext';
import { getBPCategory, getCategoryLabel } from '../../utils/bpUtils';
import { Feather } from '@expo/vector-icons';

export default function ReadingDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>(); 
  const { readings, deleteReading } = useBP();

  const readingId = Number(id);
  const reading = readings.find(r => r.id === readingId);

  if (!reading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.foreground, fontSize: 18 }}>Reading not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const category = getBPCategory(reading.systolic, reading.diastolic);
  const categoryLabel = getCategoryLabel(category);
  const formattedDate = new Date(reading.timestamp).toLocaleString();

  const handleDelete = () => {
    Alert.alert(
      'Delete Reading?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReading(readingId);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reading.');
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    router.push({
      pathname: '/(tabs)/log',
      params: { id: readingId.toString() },
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Reading Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{formattedDate}</Text>

        <View style={styles.bpContainer}>
          <View style={styles.bpRow}>
            <Text style={[styles.bpValue, { color: colors.foreground }]}>{reading.systolic}</Text>
            <Text style={[styles.bpDivider, { color: colors.mutedForeground }]}>/</Text>
            <Text style={[styles.bpValue, { color: colors.foreground }]}>{reading.diastolic}</Text>
          </View>
          <Text style={[styles.bpUnit, { color: colors.mutedForeground }]}>mmHg</Text>
        </View>

        <View style={[styles.categoryBadge, { backgroundColor: colors[category] + '20', borderColor: colors[category] }]}>
          <Text style={[styles.categoryText, { color: colors[category] }]}>{categoryLabel}</Text>
        </View>

        {reading.heartRate && (
          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
            Heart Rate: {reading.heartRate} bpm
          </Text>
        )}

        {reading.notes && (
          <View style={styles.notesContainer}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Notes</Text>
            <Text style={[styles.detailText, { color: colors.foreground }]}>{reading.notes}</Text>
          </View>
        )}

        <View style={styles.medContainer}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Medication Taken</Text>
          <Text style={[styles.detailText, { color: reading.medicationTaken ? colors.normal : colors.crisis, fontWeight: '600' }]}>
            {reading.medicationTaken ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: colors.primary }]} 
          onPress={handleEdit}
        >
          <Feather name="edit-2" size={20} color={colors.primaryForeground} />
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Edit Reading</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: colors.crisis }]} 
          onPress={handleDelete}
        >
          <Feather name="trash-2" size={20} color="#FFFFFF" />
          <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Delete Reading</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  date: {
    fontSize: 14,
    marginBottom: 20,
  },
  bpContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bpRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bpValue: {
    fontSize: 56,
    fontWeight: '700',
  },
  bpDivider: {
    fontSize: 56,
    marginHorizontal: 12,
  },
  bpUnit: {
    fontSize: 18,
    marginTop: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 24,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 16,
  },
  notesContainer: {
    marginBottom: 20,
  },
  medContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actions: {
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  actionText: {
    fontSize: 17,
    fontWeight: '600',
  },
});